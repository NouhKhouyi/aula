import OpenAI from "openai";
import { z } from "zod";
import { inputJsonSchema } from "../../core/tools";
import type { AssistantBlock, Message } from "../../core/types";
import {
  ProviderError,
  type JsonRequest,
  type Provider,
  type StopReason,
  type TurnRequest,
  type TurnResult,
} from "./types";

/**
 * Any server that speaks the OpenAI chat-completions protocol: OpenAI itself,
 * OpenRouter, DeepSeek, Groq, Mistral, a local Ollama or LM Studio. Web search
 * is not available here, so the teacher is told to flag unverified claims.
 */

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export function toOpenAIMessages(system: string, messages: Message[]): ChatMessage[] {
  const out: ChatMessage[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.text });
    } else if (m.role === "tool") {
      for (const r of m.results) {
        out.push({
          role: "tool",
          tool_call_id: r.callId,
          content: r.isError ? `ERROR: ${r.output}` : r.output,
        });
      }
    } else {
      const text = m.blocks
        .filter((b): b is Extract<AssistantBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("");
      const calls = m.blocks.filter((b): b is Extract<AssistantBlock, { type: "tool_call" }> => b.type === "tool_call");
      out.push({
        role: "assistant",
        content: text || null,
        ...(calls.length
          ? {
              tool_calls: calls.map((c) => ({
                id: c.id,
                type: "function" as const,
                function: { name: c.name, arguments: JSON.stringify(c.input) },
              })),
            }
          : {}),
      });
    }
  }
  return out;
}

function mapStop(reason: string | null | undefined, hasCalls: boolean): StopReason {
  if (hasCalls || reason === "tool_calls") return "tool_use";
  if (reason === "length") return "max_tokens";
  if (reason === "content_filter") return "refusal";
  return "end";
}

function explain(err: unknown): never {
  if (err instanceof OpenAI.AuthenticationError) {
    throw new ProviderError("The provider rejected the API key. Check it in Settings.", 401);
  }
  if (err instanceof OpenAI.NotFoundError) {
    throw new ProviderError("Model or endpoint not found. Check the model and base URL in Settings.", 404);
  }
  if (err instanceof OpenAI.RateLimitError) {
    throw new ProviderError("Rate limited by the provider. Wait a moment and try again.", 429);
  }
  if (err instanceof OpenAI.APIError) {
    throw new ProviderError(`Provider error ${err.status ?? ""}: ${err.message}`.trim(), err.status);
  }
  throw err;
}

export function openaiProvider(opts: { apiKey?: string; model: string; baseURL: string }): Provider {
  if (!opts.model) throw new ProviderError("Choose a model for the OpenAI-compatible provider in Settings.");
  // Local servers (Ollama, LM Studio) accept any key.
  const client = new OpenAI({ apiKey: opts.apiKey || "not-needed", baseURL: opts.baseURL });

  return {
    id: "openai",
    model: opts.model,
    canSearch: false,

    async turn(req: TurnRequest): Promise<TurnResult> {
      try {
        const stream = await client.chat.completions.create(
          {
            model: opts.model,
            messages: toOpenAIMessages(req.system, req.messages),
            tools: req.tools.map((t) => ({
              type: "function" as const,
              function: { name: t.name, description: t.description, parameters: inputJsonSchema(t) },
            })),
            stream: true,
            stream_options: { include_usage: true },
          },
          { signal: req.signal },
        );

        let text = "";
        let finish: string | null | undefined;
        const calls = new Map<number, { id: string; name: string; args: string }>();
        let usage = { inputTokens: 0, outputTokens: 0 };

        for await (const chunk of stream) {
          if (chunk.usage) {
            usage = { inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens };
          }
          const choice = chunk.choices[0];
          if (!choice) continue;
          if (choice.delta.content) {
            text += choice.delta.content;
            req.onText(choice.delta.content);
          }
          for (const tc of choice.delta.tool_calls ?? []) {
            const entry = calls.get(tc.index) ?? { id: "", name: "", args: "" };
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name += tc.function.name;
            if (tc.function?.arguments) entry.args += tc.function.arguments;
            calls.set(tc.index, entry);
          }
          if (choice.finish_reason) finish = choice.finish_reason;
        }

        const blocks: AssistantBlock[] = [];
        if (text) blocks.push({ type: "text", text });
        for (const [index, c] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
          let input: Record<string, unknown> = {};
          try {
            input = c.args ? (JSON.parse(c.args) as Record<string, unknown>) : {};
          } catch {
            // Left empty: schema validation reports it back to the model.
          }
          blocks.push({ type: "tool_call", id: c.id || `call_${index}`, name: c.name, input });
        }
        return { message: { blocks }, stop: mapStop(finish, calls.size > 0), usage };
      } catch (err) {
        if (err instanceof ProviderError || err instanceof OpenAI.APIUserAbortError) throw err;
        explain(err);
      }
    },

    async json<T>(req: JsonRequest<T>) {
      try {
        const response = await client.chat.completions.create(
          {
            model: opts.model,
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "result",
                schema: z.toJSONSchema(req.schema, { target: "draft-7" }) as Record<string, unknown>,
              },
            },
          },
          { signal: req.signal },
        );
        const raw = response.choices[0]?.message.content ?? "";
        const parsed = req.schema.safeParse(JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")));
        if (!parsed.success) {
          throw new ProviderError("The model returned output that did not match the expected format.");
        }
        return {
          value: parsed.data,
          usage: {
            inputTokens: response.usage?.prompt_tokens ?? 0,
            outputTokens: response.usage?.completion_tokens ?? 0,
          },
        };
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        if (err instanceof SyntaxError) throw new ProviderError("The model did not return valid JSON.");
        explain(err);
      }
    },
  };
}
