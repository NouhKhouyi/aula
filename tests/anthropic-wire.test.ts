import { describe, expect, it } from "vitest";
import { toolsFor } from "@/lib/core/tools";
import { anthropicProvider } from "@/lib/server/providers/anthropic";
import { ProviderError } from "@/lib/server/providers/types";

/** Server-sent events for one assistant turn that speaks, then asks a question. */
function sse(events: Record<string, unknown>[]): string {
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
}

const TURN = sse([
  {
    type: "message_start",
    message: {
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 120, output_tokens: 0, cache_read_input_tokens: 30, cache_creation_input_tokens: 0 },
    },
  },
  { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
  { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Let me find " } },
  { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "your edge." } },
  { type: "content_block_stop", index: 0 },
  { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_1", name: "ask", input: {} } },
  { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"question":' } },
  { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '"What is your goal?"}' } },
  { type: "content_block_stop", index: 1 },
  { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 40 } },
  { type: "message_stop" },
]);

function fakeFetch(
  status: number,
  body: string,
  seen: { url?: string; headers?: Headers; body?: Record<string, unknown> },
) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    seen.url = String(url);
    seen.headers = new Headers(init?.headers);
    seen.body = JSON.parse(String(init?.body));
    return new Response(body, {
      status,
      headers: { "content-type": status === 200 ? "text/event-stream" : "application/json", "request-id": "req_test" },
    });
  }) as typeof fetch;
}

describe("Anthropic provider on the wire", () => {
  it("sends a current-model request and parses the streamed turn", async () => {
    const seen: { url?: string; headers?: Headers; body?: Record<string, unknown> } = {};
    const provider = anthropicProvider({
      apiKey: "sk-ant-test",
      model: "claude-opus-5-5",
      effort: "high",
      webSearch: true,
      fetch: fakeFetch(200, TURN, seen),
    });
    const deltas: string[] = [];
    const result = await provider.turn({
      system: "SYSTEM",
      messages: [{ id: "u", role: "user", ts: 0, text: "Teach me" }],
      tools: toolsFor("teach"),
      webSearch: true,
      onText: (d) => deltas.push(d),
    });

    expect(seen.url).toContain("/v1/messages");
    expect(seen.headers?.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(seen.body).toMatchObject({
      model: "claude-opus-5-5",
      stream: true,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system: "SYSTEM",
      messages: [{ role: "user", content: "Teach me" }],
    });
    const tools = seen.body!.tools as { name: string; type?: string }[];
    expect(tools.map((t) => t.name)).toEqual(["quiz", "ask", "propose_plan", "set_progress", "web_search"]);
    expect(tools.at(-1)?.type).toBe("web_search_20260209");
    expect(seen.body).not.toHaveProperty("temperature");

    expect(deltas.join("")).toBe("Let me find your edge.");
    expect(result.stop).toBe("tool_use");
    expect(result.message.blocks).toEqual([
      { type: "text", text: "Let me find your edge." },
      { type: "tool_call", id: "toolu_1", name: "ask", input: { question: "What is your goal?" } },
    ]);
    expect(result.message.raw?.provider).toBe("anthropic");
    expect(result.usage).toEqual({ inputTokens: 150, outputTokens: 40 });
  });

  it("leaves thinking, effort and fallbacks off for legacy models", async () => {
    const seen: { body?: Record<string, unknown>; headers?: Headers } = {};
    const provider = anthropicProvider({
      apiKey: "k",
      model: "claude-haiku-4-5",
      effort: "high",
      webSearch: false,
      fetch: fakeFetch(200, TURN, seen),
    });
    await provider.turn({ system: "S", messages: [], tools: [], webSearch: false, onText: () => {} });
    expect(seen.body).not.toHaveProperty("thinking");
    expect(seen.body).not.toHaveProperty("output_config");
    expect(seen.body).not.toHaveProperty("fallbacks");
    expect(seen.headers?.get("anthropic-beta") ?? "").not.toContain("server-side-fallback");
  });

  it("turns an authentication failure into a message the learner can act on", async () => {
    const provider = anthropicProvider({
      apiKey: "bad",
      model: "claude-opus-5-5",
      effort: "high",
      webSearch: false,
      fetch: fakeFetch(
        401,
        JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }),
        {},
      ),
    });
    const run = provider.turn({ system: "S", messages: [], tools: [], webSearch: false, onText: () => {} });
    await expect(run).rejects.toBeInstanceOf(ProviderError);
    await expect(run).rejects.toThrow(/API key/);
  });
});
