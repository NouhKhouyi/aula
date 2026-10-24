import { describe, expect, it } from "vitest";
import { EMPTY_GRAPH } from "@/lib/core/graph";
import { sessionToMarkdown } from "@/lib/core/markdown-export";
import { displayQuiz } from "@/lib/core/quiz";
import type { QuizInput } from "@/lib/core/tools";
import { pendingCalls, transcriptText } from "@/lib/core/transcript";
import type { LearnerResponse, Session, Settings } from "@/lib/core/types";
import { runTurn, type AgentEvent, type TurnInput } from "@/lib/server/agent";
import { extractSession } from "@/lib/server/extract";
import { mockProvider } from "@/lib/server/providers/mock";
import { DEFAULT_SETTINGS } from "@/lib/server/store";

function newSession(kind: Session["kind"] = "teach"): Session {
  return {
    version: 1,
    id: "s_test0001",
    title: "Derivatives",
    kind,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    provider: "mock",
    model: "demo",
    phase: kind === "teach" ? "probe" : "teach",
    progress: { done: [] },
    messages: [],
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

async function turn(session: Session, input: TurnInput, settings: Settings = DEFAULT_SETTINGS) {
  const events: AgentEvent[] = [];
  await runTurn(session, input, {
    provider: mockProvider({ delayMs: 0 }),
    settings,
    graph: EMPTY_GRAPH,
    emit: (e) => events.push(e),
    persist: async () => {},
  });
  return events;
}

function answerPending(session: Session, correct = true): LearnerResponse {
  const [call] = pendingCalls(session.messages);
  expect(call).toBeDefined();
  switch (call.name) {
    case "ask":
      return { callId: call.id, kind: "ask", text: "Understand why the rule works." };
    case "quiz": {
      const shown = displayQuiz(call.input as QuizInput, call.id);
      const pick = correct ? shown.correctIndex : (shown.correctIndex + 1) % shown.options.length;
      return { callId: call.id, kind: "quiz", chosenIndex: pick, confidence: 70, thinking: "rise over run" };
    }
    case "propose_plan":
      return { callId: call.id, kind: "plan", approved: true };
    default:
      return { callId: call.id, kind: "problem", attempt: "8 m/s", confidence: 60 };
  }
}

describe("a full demo lesson through the real agent loop", () => {
  it("probes, plans, teaches and records progress", async () => {
    const session = newSession();
    const events = await turn(session, { text: "Teach me derivatives" });
    expect(events.some((e) => e.type === "text")).toBe(true);
    expect(pendingCalls(session.messages).map((c) => c.name)).toEqual(["ask"]);

    // goal, two probes
    await turn(session, { responses: [answerPending(session)] });
    await turn(session, { responses: [answerPending(session)] });
    await turn(session, { responses: [answerPending(session, false)] });
    expect(pendingCalls(session.messages)[0].name).toBe("propose_plan");
    expect(session.phase).toBe("probe");

    // reject once, then approve
    const [planCall] = pendingCalls(session.messages);
    await turn(session, { responses: [{ callId: planCall.id, kind: "plan", approved: false, feedback: "Shorter?" }] });
    expect(pendingCalls(session.messages)[0].name).toBe("propose_plan");
    await turn(session, { responses: [answerPending(session)] });
    expect(session.phase).toBe("teach");
    expect(session.plan?.nodes).toHaveLength(4);
    expect(session.progress).toEqual({ current: "secant", done: ["slope"] });

    await turn(session, { responses: [answerPending(session)] });
    await turn(session, { responses: [answerPending(session)] });
    expect(pendingCalls(session.messages)).toEqual([]);
    expect(session.progress.done).toContain("goal");

    // Every tool call has exactly one result: the transcript is replayable.
    const calls = session.messages.flatMap((m) =>
      m.role === "assistant" ? m.blocks.filter((b) => b.type === "tool_call").map((b) => (b as { id: string }).id) : [],
    );
    const results = session.messages.flatMap((m) => (m.role === "tool" ? m.results.map((r) => r.callId) : []));
    expect([...results].sort()).toEqual([...calls].sort());

    const md = sessionToMarkdown(session);
    expect(md).toContain("> [!quote] YOU");
    expect(md).toContain("> [!tip] Plan");
    expect(md).toContain("```mermaid");
    expect(md).toContain("> [!failure] Quiz — incorrect ✗");
    expect(md).toContain("Confidence: 70%");
    expect(md).toContain("aula_session: s_test0001");

    expect(transcriptText(session)).toContain("Learner's thinking: rise over run");
  });

  it("closes open questions when the learner writes instead of answering", async () => {
    const session = newSession();
    await turn(session, { text: "Teach me derivatives" });
    await turn(session, { text: "Wait, what is a derivative for?" });
    expect(pendingCalls(session.messages)).toEqual([]);
    const tool = session.messages.find((m) => m.role === "tool");
    expect(tool?.role === "tool" && tool.results[0].output).toMatch(/did not answer/);
  });

  it("refuses answers to questions that are not pending", async () => {
    const session = newSession();
    await turn(session, { text: "Teach me" });
    await expect(turn(session, { responses: [{ callId: "call_nope", kind: "ask", text: "x" }] })).rejects.toThrow();
  });

  it("runs a practice round", async () => {
    const session = newSession("practice");
    await turn(session, { text: "Practise derivatives" });
    expect(pendingCalls(session.messages)[0].name).toBe("pose_problem");
    await turn(session, { responses: [answerPending(session)] });
    expect(sessionToMarkdown(session)).toContain("> [!example] My attempt");
  });

  it("extracts the session into the graph", async () => {
    const session = newSession();
    await turn(session, { text: "Teach me derivatives" });
    const { graph, added, chains } = await extractSession(session, EMPTY_GRAPH, mockProvider());
    expect(added).toBe(4);
    expect(chains).toBe(3);
    expect(graph.propositions.every((p) => p.sources[0].sessionId === session.id)).toBe(true);
    expect(session.extractedAt).toBeTruthy();
  });
});
