import { TOOLS, isToolName } from "./tools";
import type { Message, Session, SessionSummary, ToolCallBlock, ToolResult } from "./types";

/** Every tool result in the session, by call id. */
export function resultsById(messages: Message[]): Map<string, ToolResult> {
  const out = new Map<string, ToolResult>();
  for (const m of messages) {
    if (m.role === "tool") for (const r of m.results) out.set(r.callId, r);
  }
  return out;
}

/**
 * Interactive tool calls still waiting for the learner. Only the latest
 * assistant message can have them: any later message means the turn moved on.
 */
export function pendingCalls(messages: Message[]): ToolCallBlock[] {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") {
    // A tool message may have answered some calls of the turn but not all.
    const prev = messages.at(-2);
    if (last?.role === "tool" && prev?.role === "assistant") {
      const answered = new Set(last.results.map((r) => r.callId));
      return interactiveCalls(prev).filter((c) => !answered.has(c.id));
    }
    return [];
  }
  return interactiveCalls(last);
}

function interactiveCalls(m: Message): ToolCallBlock[] {
  if (m.role !== "assistant") return [];
  return m.blocks.filter(
    (b): b is ToolCallBlock => b.type === "tool_call" && isToolName(b.name) && TOOLS[b.name].interactive,
  );
}

export function summarize(session: Session): SessionSummary {
  let answered = 0;
  let correct = 0;
  for (const r of resultsById(session.messages).values()) {
    if (r.details?.kind === "quiz") {
      answered++;
      if (r.details.correct) correct++;
    }
  }
  return {
    id: session.id,
    title: session.title,
    kind: session.kind,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    phase: session.phase,
    model: session.model,
    answered,
    correct,
  };
}

/** A provisional title from the learner's opening message. */
export function titleFromPrompt(text: string): string {
  const firstLine = text.trim().split(/\n/)[0] ?? "";
  const clean = firstLine.replace(/\s+/g, " ").replace(/[.?!:;,]+$/, "");
  if (clean.length <= 60) return clean || "New session";
  const cut = clean.slice(0, 60);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : 60)}…`;
}

/** Plain-text rendering of a session for the extraction model. */
export function transcriptText(session: Session): string {
  const results = resultsById(session.messages);
  const out: string[] = [];
  for (const m of session.messages) {
    if (m.role === "user") out.push(`LEARNER: ${m.text}`);
    if (m.role !== "assistant") continue;
    for (const b of m.blocks) {
      if (b.type === "text" && b.text.trim()) out.push(`TEACHER: ${b.text.trim()}`);
      if (b.type !== "tool_call") continue;
      const d = results.get(b.id)?.details;
      if (d?.kind === "quiz") {
        const picked = d.dontKnow ? "I don't know" : d.options[d.chosenIndex!];
        out.push(
          [
            `QUIZ (${d.role}): ${d.question}`,
            ...d.options.map((o, i) => `  ${i + 1}. ${o}`),
            `  Learner answered: ${picked}${d.dontKnow ? "" : d.correct ? " (correct)" : " (incorrect)"}${d.confidence !== undefined ? `, confidence ${d.confidence}%` : ""}`,
            d.thinking ? `  Learner's thinking: ${d.thinking}` : "",
            `  Explanation: ${d.explanation}`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } else if (d?.kind === "ask") {
        out.push(`QUESTION: ${d.question}\nLEARNER: ${d.text}`);
      } else if (d?.kind === "plan") {
        const input = b.input as { approach?: string };
        out.push(
          `PLAN: ${input.approach ?? ""}\nLEARNER ${d.approved ? "approved" : `asked for changes: ${d.feedback ?? ""}`}`,
        );
      } else if (d?.kind === "problem") {
        out.push(
          `PROBLEM: ${d.statement}\nLEARNER ATTEMPT${d.confidence !== undefined ? ` (confidence ${d.confidence}%)` : ""}: ${d.gaveUp ? "(gave up)" : d.attempt}`,
        );
      }
    }
  }
  return out.join("\n\n");
}
