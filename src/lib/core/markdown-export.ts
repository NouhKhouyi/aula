import { planToMermaid } from "./plan";
import { displayQuiz } from "./quiz";
import type { PlanToolInput, QuizInput } from "./tools";
import { resultsById } from "./transcript";
import type { Session } from "./types";

/**
 * Renders a session as an Obsidian note using the same callout vocabulary as
 * the terminal workflow (see AGENTS.md §7), so lessons from the app and from a
 * terminal agent read identically in the vault.
 */

function callout(kind: string, title: string, body: string): string {
  const lines = body.trim().split("\n").map((l) => (l ? `> ${l}` : ">"));
  return [`> [!${kind}] ${title}`, ...lines].join("\n");
}

function frontmatter(session: Session): string {
  const esc = (s: string) => JSON.stringify(s);
  return [
    "---",
    `title: ${esc(session.title)}`,
    `aula_session: ${session.id}`,
    `kind: ${session.kind}`,
    `created: ${session.createdAt}`,
    `model: ${esc(session.model)}`,
    "tags: [aula]",
    "---",
  ].join("\n");
}

export function sessionToMarkdown(session: Session): string {
  const results = resultsById(session.messages);
  const parts: string[] = [frontmatter(session), `# ${session.title}`];
  let dividerShown = false;

  for (const m of session.messages) {
    if (m.role === "user") {
      parts.push(callout("quote", "YOU", m.text));
      continue;
    }
    if (m.role !== "assistant") continue;

    for (const b of m.blocks) {
      if (b.type === "text" && b.text.trim()) {
        parts.push(callout("abstract", "TUTOR", b.text));
        continue;
      }
      if (b.type === "search") {
        const sources = b.sources.map((s) => `- [${s.title.replace(/[[\]]/g, "")}](${s.url})`);
        parts.push(callout("info", `Verified: ${b.query}`, sources.join("\n") || "_no sources_"));
        continue;
      }
      if (b.type !== "tool_call") continue;
      const r = results.get(b.id);

      if (b.name === "quiz") {
        const input = b.input as QuizInput;
        const shown = displayQuiz(input, b.id);
        const options = [...shown.options, "I don't know"].map((o, i) => `${i + 1}. ${o}`);
        parts.push(callout("question", `Quiz · ${input.role}`, `${shown.question}\n\n${options.join("\n")}`));
        const d = r?.details;
        if (d?.kind !== "quiz") continue;
        const meta = [
          d.confidence !== undefined ? `Confidence: ${d.confidence}%` : "",
          d.thinking ? `*My thinking:* ${d.thinking}` : "",
        ].filter(Boolean);
        const body = [
          `Correct answer: **${d.correctIndex + 1}**`,
          ...meta,
          "",
          d.explanation,
        ].join("\n");
        if (d.dontKnow) parts.push(callout("question", "Quiz — I don't know", body));
        else if (d.correct) parts.push(callout("success", "Quiz — correct ✓", body));
        else parts.push(callout("failure", `Quiz — incorrect ✗ (chose ${d.chosenIndex! + 1})`, body));
      } else if (b.name === "ask") {
        const input = b.input as { question: string };
        parts.push(callout("question", "Question", input.question));
        if (r?.details?.kind === "ask") parts.push(callout("example", "Answer", r.details.text));
      } else if (b.name === "propose_plan") {
        const input = b.input as PlanToolInput;
        const body = `${input.approach}\n\n\`\`\`mermaid\n${planToMermaid(input)}\n\`\`\``;
        parts.push(callout("tip", "Plan", body));
        const d = r?.details;
        if (d?.kind === "plan") {
          parts.push(
            callout("quote", "YOU", d.approved ? "Approved." : `Changes requested: ${d.feedback ?? ""}`),
          );
          if (d.approved && !dividerShown) {
            parts.push("---\n\n## Teaching");
            dividerShown = true;
          }
        }
      } else if (b.name === "pose_problem") {
        const input = b.input as { statement: string };
        parts.push(callout("question", "Problem", input.statement));
        const d = r?.details;
        if (d?.kind === "problem") {
          const conf = d.confidence !== undefined ? `\n\nConfidence: ${d.confidence}%` : "";
          parts.push(callout("example", "My attempt", d.gaveUp ? "_Gave up — show me._" : `${d.attempt}${conf}`));
        }
      }
    }
  }
  return `${parts.join("\n\n")}\n`;
}
