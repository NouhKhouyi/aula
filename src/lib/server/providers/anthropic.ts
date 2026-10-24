import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { inputJsonSchema } from "../../core/tools";
import type { AssistantBlock, Effort, Message } from "../../core/types";
import {
  ProviderError,
  type JsonRequest,
  type Provider,
  type StopReason,
  type TurnRequest,
  type TurnResult,
} from "./types";

/**
 * Claude via the official SDK. Uses the beta messages surface so current
 * models get server-side refusal fallbacks; everything else is the standard
 * streaming manual loop — the loop itself lives in the agent, because a turn
 * ends whenever the teacher asks the learner something.
 */

/** Models that reroute a declined request themselves (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

/** Older models that predate adaptive thinking and effort. */
function isLegacy(model: string): boolean {
  return /claude-(3|haiku-4-5|sonnet-4-5|sonnet-4-0|opus-4-5|opus-4-1|opus-4-0|sonnet-4-2025|opus-4-2025)/.test(model);
}

/** Older models only have the basic web search tool. */
function searchToolType(model: string) {
  return /claude-(fable|opus-5|opus-4-[678]|sonnet-5|sonnet-4-6)/.test(model)
    ? ("web_search_20260209" as const)
    : ("web_search_20250305" as const);
}

export function toAnthropicMessages(messages: Message[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.text });
    } else if (m.role === "tool") {
      out.push({
        role: "user",
        content: m.results.map((r) => ({
          type: "tool_result" as const,
          tool_use_id: r.callId,
          content: r.output,
          ...(r.isError ? { is_error: true } : {}),
        })),
      });
    } else if (m.raw?.provider === "anthropic") {
      out.push({ role: "assistant", content: m.raw.content as Anthropic.Beta.BetaContentBlockParam[] });
    } else {
      const content: Anthropic.Beta.BetaContentBlockParam[] = [];
      for (const b of m.blocks) {
        if (b.type === "text" && b.text) content.push({ type: "text", text: b.text });
        if (b.type === "tool_call") {
          content.push({ type: "tool_use", id: b.id, name: b.name, input: b.input });
        }
      }
      if (content.length) out.push({ role: "assistant", content });
    }
  }
  return out;
}

export function fromAnthropicContent(content: Anthropic.Beta.BetaContentBlock[]): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  const queries = new Map<string, string>();
  for (const b of content) {
    if (b.type === "text") {
      const last = blocks.at(-1);
      if (last?.type === "text") last.text += b.text;
      else blocks.push({ type: "text", text: b.text });
    } else if (b.type === "tool_use") {
      blocks.push({ type: "tool_call", id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> });
    } else if (b.type === "server_tool_use" && b.name === "web_search") {
      queries.set(b.id, String((b.input as { query?: unknown })?.query ?? ""));
    } else if (b.type === "web_search_tool_result") {
      const results = Array.isArray(b.content) ? b.content : [];
      blocks.push({
        type: "search",
        query: queries.get(b.tool_use_id) ?? "",
        sources: results
          .filter((r) => r.type === "web_search_result")
          .slice(0, 6)
          .map((r) => ({ title: r.title, url: r.url })),
      });
    }
  }
  return blocks;
}

function mapStop(reason: string | null): StopReason {
  switch (reason) {
    case "tool_use":
      return "tool_use";
    case "max_tokens":
      return "max_tokens";
    case "refusal":
      return "refusal";
    default:
      return "end";
  }
}

function explain(err: unknown): never {
  if (err instanceof Anthropic.AuthenticationError) {
    throw new ProviderError("Anthropic rejected the API key. Check it in Settings.", 401);
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    throw new ProviderError("This API key cannot use the selected model.", 403);
  }
  if (err instanceof Anthropic.NotFoundError) {
    throw new ProviderError("The selected model was not found. Pick another one in Settings.", 404);
  }
  if (err instanceof Anthropic.RateLimitError) {
    throw new ProviderError("Rate limited by Anthropic. Wait a moment and try again.", 429);
  }
  if (err instanceof Anthropic.BadRequestError) {
    throw new ProviderError(`Anthropic rejected the request: ${err.message}`, 400);
  }
  if (err instanceof Anthropic.APIError) {
    throw new ProviderError(`Anthropic error ${err.status ?? ""}: ${err.message}`.trim(), err.status);
  }
  throw err;
}

export function anthropicProvider(opts: {
  apiKey?: string;
  model: string;
  effort: Effort;
  webSearch: boolean;
  /** Injected in tests to stand in for the network. */
  fetch?: typeof fetch;
}): Provider {
  const client = new Anthropic({
    ...(opts.apiKey ? { apiKey: opts.apiKey } : {}),
    ...(opts.fetch ? { fetch: opts.fetch, maxRetries: 0 } : {}),
  });
  const legacy = isLegacy(opts.model);
  const fallback = FALLBACK_MODELS.has(opts.model);

  const common = () => ({
    model: opts.model,
    ...(legacy
      ? {}
      : {
          thinking: { type: "adaptive" as const },
          output_config: { effort: opts.effort },
        }),
    ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });

  return {
    id: "anthropic",
    model: opts.model,
    canSearch: opts.webSearch,

    async turn(req: TurnRequest): Promise<TurnResult> {
      const tools: Anthropic.Beta.BetaToolUnion[] = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: inputJsonSchema(t) as Anthropic.Beta.BetaTool.InputSchema,
      }));
      if (req.webSearch && opts.webSearch) {
        tools.push({ type: searchToolType(opts.model), name: "web_search", max_uses: 5 });
      }

      try {
        const messages = toAnthropicMessages(req.messages);
        let content: Anthropic.Beta.BetaContentBlock[] = [];
        let inputTokens = 0;
        let outputTokens = 0;

        // A long server-side search can pause the turn; resume it in place.
        for (let hop = 0; hop < 4; hop++) {
          const stream = client.beta.messages.stream(
            {
              ...common(),
              max_tokens: 64000,
              cache_control: { type: "ephemeral" },
              system: req.system,
              tools,
              messages: hop === 0 ? messages : [...messages, { role: "assistant", content }],
            },
            { signal: req.signal },
          );
          stream.on("text", (delta) => req.onText(delta));
          stream.on("streamEvent", (event) => {
            if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
              req.onActivity?.("Verifying on the web…");
            } else if (event.type === "content_block_start" && event.content_block.type === "text") {
              req.onActivity?.(null);
            }
          });
          const message = await stream.finalMessage();
          content = hop === 0 ? message.content : [...content, ...message.content];
          inputTokens +=
            message.usage.input_tokens +
            (message.usage.cache_read_input_tokens ?? 0) +
            (message.usage.cache_creation_input_tokens ?? 0);
          outputTokens += message.usage.output_tokens;
          if (message.stop_reason !== "pause_turn") {
            req.onActivity?.(null);
            return {
              message: {
                blocks: fromAnthropicContent(content),
                raw: { provider: "anthropic", content },
              },
              stop: mapStop(message.stop_reason),
              usage: { inputTokens, outputTokens },
            };
          }
        }
        throw new ProviderError("The model kept pausing. Try again.");
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        if (err instanceof Anthropic.APIUserAbortError) throw err;
        explain(err);
      }
    },

    async json<T>(req: JsonRequest<T>) {
      try {
        const response = await client.messages.parse(
          {
            model: opts.model,
            max_tokens: 16000,
            output_config: legacy
              ? { format: zodOutputFormat(req.schema) }
              : { effort: "medium", format: zodOutputFormat(req.schema) },
            system: req.system,
            messages: [{ role: "user", content: req.user }],
          },
          { signal: req.signal },
        );
        if (response.stop_reason === "refusal") {
          throw new ProviderError("The model declined to process this session.");
        }
        if (response.parsed_output == null) {
          throw new ProviderError("The model returned output that did not match the expected format.");
        }
        return {
          value: response.parsed_output as T,
          usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        };
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        explain(err);
      }
    },
  };
}
