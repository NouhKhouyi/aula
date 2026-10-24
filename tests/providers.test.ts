import { describe, expect, it } from "vitest";
import { applyResponse, runImmediateTools } from "@/lib/core/execute";
import { teacherSystemPrompt } from "@/lib/core/prompts";
import { inputJsonSchema, toolsFor } from "@/lib/core/tools";
import type { Message, Session } from "@/lib/core/types";
import { fromAnthropicContent, toAnthropicMessages } from "@/lib/server/providers/anthropic";
import { toOpenAIMessages } from "@/lib/server/providers/openai";
import { DEFAULT_SETTINGS } from "@/lib/server/store";

const transcript: Message[] = [
  { id: "m1", role: "user", ts: 1, text: "Teach me" },
  {
    id: "m2",
    role: "assistant",
    ts: 2,
    blocks: [
      { type: "text", text: "First:" },
      { type: "tool_call", id: "call_1", name: "ask", input: { question: "Goal?" } },
    ],
  },
  { id: "m3", role: "tool", ts: 3, results: [{ callId: "call_1", name: "ask", output: "To pass", isError: false }] },
];

describe("provider message conversion", () => {
  it("maps the neutral transcript to Anthropic messages", () => {
    const out = toAnthropicMessages(transcript);
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(out[1].content).toEqual([
      { type: "text", text: "First:" },
      { type: "tool_use", id: "call_1", name: "ask", input: { question: "Goal?" } },
    ]);
    expect(out[2].content).toEqual([{ type: "tool_result", tool_use_id: "call_1", content: "To pass" }]);
  });

  it("replays raw Anthropic content verbatim", () => {
    const raw = [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text: "Hi" },
    ];
    const out = toAnthropicMessages([
      { id: "a", role: "assistant", ts: 0, blocks: [], raw: { provider: "anthropic", content: raw } },
    ]);
    expect(out[0].content).toBe(raw);
  });

  it("maps the neutral transcript to OpenAI chat messages", () => {
    const out = toOpenAIMessages("SYS", transcript);
    expect(out[0]).toEqual({ role: "system", content: "SYS" });
    expect(out[2]).toMatchObject({
      role: "assistant",
      content: "First:",
      tool_calls: [{ id: "call_1", type: "function", function: { name: "ask", arguments: '{"question":"Goal?"}' } }],
    });
    expect(out[3]).toEqual({ role: "tool", tool_call_id: "call_1", content: "To pass" });
  });

  it("reads web searches out of Anthropic content", () => {
    const blocks = fromAnthropicContent([
      { type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "Bayes 1763" } },
      {
        type: "web_search_tool_result",
        tool_use_id: "srv_1",
        content: [
          {
            type: "web_search_result",
            title: "Essay",
            url: "https://example.org",
            encrypted_content: "",
            page_age: null,
          },
        ],
      },
      { type: "text", text: "Bayes's essay ", citations: null },
      { type: "text", text: "was published in 1763.", citations: null },
    ] as never);
    expect(blocks).toEqual([
      { type: "search", query: "Bayes 1763", sources: [{ title: "Essay", url: "https://example.org" }] },
      { type: "text", text: "Bayes's essay was published in 1763." },
    ]);
  });
});

describe("tools", () => {
  it("exposes the right tools per mode, with clean JSON Schemas", () => {
    expect(toolsFor("teach").map((t) => t.name)).toEqual(["quiz", "ask", "propose_plan", "set_progress"]);
    expect(toolsFor("practice").map((t) => t.name)).toEqual(["quiz", "ask", "pose_problem"]);
    for (const t of toolsFor("teach")) {
      const schema = inputJsonSchema(t);
      expect(schema.type).toBe("object");
      expect(schema).not.toHaveProperty("$schema");
    }
  });

  it("returns fixable errors for invalid tool input and invalid plans", () => {
    const session = { kind: "teach", progress: { done: [] } } as unknown as Session;
    const { results, waiting } = runImmediateTools(session, [
      { type: "tool_call", id: "c1", name: "quiz", input: { question: "q" } },
      {
        type: "tool_call",
        id: "c2",
        name: "propose_plan",
        input: { approach: "a", goal: "x", nodes: [{ id: "y", label: "Y", foundation: true }], edges: [] },
      },
      { type: "tool_call", id: "c3", name: "nope", input: {} },
      { type: "tool_call", id: "c4", name: "set_progress", input: { done: [] } },
    ]);
    expect(waiting).toEqual([]);
    expect(results.map((r) => r.isError)).toEqual([true, true, true, true]);
    expect(results[1].output).toMatch(/Goal “x” is not a node/);
  });

  it("applies an approved plan to the session", () => {
    const session = { kind: "teach", phase: "probe", progress: { done: ["old"] } } as unknown as Session;
    const input = { approach: "a", goal: "g", nodes: [{ id: "g", label: "G", foundation: true }], edges: [] };
    applyResponse(
      session,
      { type: "tool_call", id: "c", name: "propose_plan", input },
      { callId: "c", kind: "plan", approved: true },
    );
    expect(session.phase).toBe("teach");
    expect(session.plan?.revision).toBe(1);
    expect(session.progress).toEqual({ done: [] });
  });
});

describe("system prompt", () => {
  it("is stable and reflects settings", () => {
    const settings = { ...DEFAULT_SETTINGS, teachingLanguage: "Spanish" };
    const a = teacherSystemPrompt("teach", settings, { webSearch: true, context: [] });
    expect(a).toBe(teacherSystemPrompt("teach", settings, { webSearch: true, context: [] }));
    expect(a).toContain("Teach in Spanish.");
    expect(a).toContain("`web_search` tool");
    expect(teacherSystemPrompt("teach", settings, { webSearch: false, context: [] })).toContain("no web search");
    expect(teacherSystemPrompt("practice", settings, { webSearch: false, context: [] })).toContain("## Practice");
  });
});
