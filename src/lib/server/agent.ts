import { applyResponse, runImmediateTools } from "../core/execute";
import { relevantPropositions } from "../core/graph";
import { newId } from "../core/ids";
import { teacherSystemPrompt } from "../core/prompts";
import { toolsFor } from "../core/tools";
import { pendingCalls } from "../core/transcript";
import type {
  AssistantMessage,
  Graph,
  LearnerResponse,
  Message,
  Session,
  Settings,
  ToolCallBlock,
  ToolMessage,
  ToolResult,
} from "../core/types";
import type { Provider } from "./providers/types";

/**
 * One learner turn: record what the learner did, then let the teacher work
 * until it asks the learner something (an interactive tool) or finishes.
 * Immediate tools (progress, invalid calls) are answered in-loop so the
 * teacher can carry on without a round trip to the learner.
 */

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "activity"; label: string | null }
  | { type: "message"; message: Message }
  | { type: "notice"; message: string };

export interface TurnInput {
  text?: string;
  responses?: LearnerResponse[];
}

export interface TurnDeps {
  provider: Provider;
  settings: Settings;
  graph: Graph;
  emit: (event: AgentEvent) => void;
  persist: (session: Session) => Promise<void>;
  signal?: AbortSignal;
}

/** Hard cap on model calls per learner turn, against runaway tool loops. */
const MAX_STEPS = 8;

function appendResults(session: Session, results: ToolResult[]): ToolMessage | undefined {
  if (results.length === 0) return undefined;
  const last = session.messages.at(-1);
  // Results for the same assistant turn share one tool message, as providers expect.
  if (last?.role === "tool") {
    last.results.push(...results);
    return last;
  }
  const message: ToolMessage = { id: newId("msg"), role: "tool", ts: Date.now(), results };
  session.messages.push(message);
  return message;
}

/** Applies the learner's input. Returns false when the teacher must keep waiting. */
export function recordLearnerInput(session: Session, input: TurnInput): boolean {
  const pending = pendingCalls(session.messages);
  const byId = new Map(pending.map((c) => [c.id, c]));

  const results: ToolResult[] = [];
  for (const response of input.responses ?? []) {
    const call = byId.get(response.callId);
    if (!call) throw new Error("That question has already been answered or does not exist.");
    results.push(applyResponse(session, call, response));
    byId.delete(response.callId);
  }

  const text = input.text?.trim();
  if (text && byId.size > 0) {
    // The learner wrote instead of answering: close the open calls honestly.
    for (const call of byId.values()) results.push(skipped(call));
    byId.clear();
  }
  appendResults(session, results);

  if (text) {
    session.messages.push({ id: newId("msg"), role: "user", ts: Date.now(), text });
  }
  return byId.size === 0 && (results.length > 0 || !!text);
}

function skipped(call: ToolCallBlock): ToolResult {
  return {
    callId: call.id,
    name: call.name,
    output: "The learner did not answer this and wrote a message instead (next). Respond to it.",
  };
}

function contextQuery(session: Session): string {
  // Stable for the whole session, so the system prompt stays cacheable.
  const first = session.messages.find((m) => m.role === "user");
  return first?.role === "user" ? first.text : session.title;
}

export async function runTurn(session: Session, input: TurnInput, deps: TurnDeps): Promise<void> {
  const ready = recordLearnerInput(session, input);
  for (const m of session.messages.slice(-2)) deps.emit({ type: "message", message: m });
  await deps.persist(session);
  if (!ready) return;

  session.provider = deps.provider.id;
  session.model = deps.provider.model;
  const system = teacherSystemPrompt(session.kind, deps.settings, {
    webSearch: deps.provider.canSearch,
    context: relevantPropositions(deps.graph, contextQuery(session)),
  });
  const tools = toolsFor(session.kind);

  for (let step = 0; step < MAX_STEPS; step++) {
    const result = await deps.provider.turn({
      system,
      messages: session.messages,
      tools,
      webSearch: deps.provider.canSearch,
      signal: deps.signal,
      onText: (delta) => deps.emit({ type: "text", delta }),
      onActivity: (label) => deps.emit({ type: "activity", label }),
    });
    session.usage.inputTokens += result.usage.inputTokens;
    session.usage.outputTokens += result.usage.outputTokens;

    let blocks = result.message.blocks;
    let raw = result.message.raw;
    if (result.stop === "max_tokens" && blocks.some((b) => b.type === "tool_call")) {
      // A truncated tool input must never run; keep only the prose.
      blocks = blocks.filter((b) => b.type !== "tool_call");
      raw = undefined;
      deps.emit({ type: "notice", message: "The response was cut off. Ask the teacher to continue." });
    }

    if (blocks.length === 0 && !raw) {
      await deps.persist(session);
      return;
    }
    const message: AssistantMessage = { id: newId("msg"), role: "assistant", ts: Date.now(), blocks, raw };
    session.messages.push(message);
    deps.emit({ type: "message", message });

    if (result.stop === "refusal") {
      deps.emit({ type: "notice", message: "The model declined to continue this turn. Try rephrasing." });
      await deps.persist(session);
      return;
    }

    const calls = blocks.filter((b): b is ToolCallBlock => b.type === "tool_call");
    if (calls.length === 0) {
      await deps.persist(session);
      return;
    }

    const { results, waiting } = runImmediateTools(session, calls);
    const toolMessage = appendResults(session, results);
    if (toolMessage) deps.emit({ type: "message", message: toolMessage });
    await deps.persist(session);
    if (waiting.length > 0) return;
  }
  deps.emit({ type: "notice", message: "The teacher took many steps without pausing; stopped here. Send a message to continue." });
}
