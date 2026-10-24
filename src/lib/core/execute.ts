import { validatePlan } from "./plan";
import { gradeQuiz, quizResultForModel } from "./quiz";
import {
  TOOLS,
  isToolName,
  type PlanToolInput,
  type ProblemInput,
  type QuizInput,
} from "./tools";
import type { LearnerResponse, Session, ToolCallBlock, ToolResult } from "./types";

/**
 * Runs the tool calls of one assistant turn that do not need the learner.
 * Returns their results plus the calls left waiting for the learner. A call
 * whose input fails validation is answered with an error the model can fix.
 * Mutates `session` only for state tools (plan, progress).
 */
export function runImmediateTools(
  session: Session,
  calls: ToolCallBlock[],
): { results: ToolResult[]; waiting: ToolCallBlock[] } {
  const results: ToolResult[] = [];
  const waiting: ToolCallBlock[] = [];

  for (const call of calls) {
    if (!isToolName(call.name)) {
      results.push(error(call, `Unknown tool “${call.name}”.`));
      continue;
    }
    const spec = TOOLS[call.name];
    if (!(spec.modes as string[]).includes(session.kind)) {
      results.push(error(call, `“${call.name}” is not available in a ${session.kind} session.`));
      continue;
    }
    const parsed = spec.schema.safeParse(call.input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`);
      results.push(error(call, `Invalid input — ${issues.join("; ")}. Fix it and call the tool again.`));
      continue;
    }

    if (call.name === "propose_plan") {
      const problems = validatePlan(parsed.data as PlanToolInput);
      if (problems.length) {
        results.push(error(call, `The plan was not shown to the learner:\n- ${problems.join("\n- ")}\nFix it and propose again.`));
        continue;
      }
    }

    if (call.name === "set_progress") {
      const input = parsed.data as { current?: string; done: string[] };
      if (!session.plan) {
        results.push(error(call, "There is no approved plan to record progress on."));
        continue;
      }
      const known = new Set(session.plan.nodes.map((n) => n.id));
      const unknown = [input.current, ...input.done].filter((x): x is string => !!x && !known.has(x));
      if (unknown.length) {
        results.push(error(call, `Unknown plan node(s): ${unknown.join(", ")}.`));
        continue;
      }
      session.progress = { current: input.current, done: [...new Set(input.done)] };
      results.push({
        callId: call.id,
        name: call.name,
        output: "Progress recorded.",
        details: { kind: "progress", ...session.progress },
      });
      continue;
    }

    if (spec.interactive) waiting.push(call);
  }
  return { results, waiting };
}

function error(call: ToolCallBlock, output: string): ToolResult {
  return { callId: call.id, name: call.name, output, isError: true };
}

/** Turns the learner's answer to a pending call into the tool result. */
export function applyResponse(
  session: Session,
  call: ToolCallBlock,
  response: LearnerResponse,
): ToolResult {
  if (call.name !== kindToTool[response.kind]) {
    throw new Error(`Call ${call.id} is a ${call.name}, not a ${response.kind}.`);
  }

  switch (response.kind) {
    case "quiz": {
      const answer = gradeQuiz(call.input as QuizInput, call.id, response.chosenIndex, {
        confidence: response.confidence,
        thinking: response.thinking,
      });
      return { callId: call.id, name: call.name, output: quizResultForModel(answer), details: answer };
    }
    case "ask": {
      const text = response.text.trim();
      if (!text) throw new Error("The answer is empty.");
      const question = (call.input as { question: string }).question;
      return {
        callId: call.id,
        name: call.name,
        output: `The learner answered: """${text}"""`,
        details: { kind: "ask", question, text },
      };
    }
    case "plan": {
      const input = call.input as PlanToolInput;
      const feedback = response.feedback?.trim() || undefined;
      if (response.approved) {
        session.plan = {
          ...input,
          revision: (session.plan?.revision ?? 0) + 1,
        };
        session.phase = "teach";
        session.progress = { done: [] };
      }
      return {
        callId: call.id,
        name: call.name,
        output: response.approved
          ? `The learner approved the plan.${feedback ? ` They added: """${feedback}"""` : ""} Begin teaching.`
          : `The learner wants changes before approving: """${feedback ?? "(no details)"}""". Revise and propose again.`,
        details: { kind: "plan", approved: response.approved, feedback },
      };
    }
    case "problem": {
      const input = call.input as ProblemInput;
      const gaveUp = !!response.gaveUp;
      const attempt = response.attempt.trim();
      if (!gaveUp && !attempt) throw new Error("The attempt is empty.");
      const confidence =
        response.confidence === undefined ? undefined : Math.max(0, Math.min(100, Math.round(response.confidence)));
      return {
        callId: call.id,
        name: call.name,
        output: gaveUp
          ? "The learner gave up and asked to see the solution."
          : `The learner's attempt${confidence !== undefined ? ` (confidence ${confidence}%)` : ""}: """${attempt}"""`,
        details: { kind: "problem", statement: input.statement, attempt, confidence, gaveUp },
      };
    }
  }
}

const kindToTool: Record<LearnerResponse["kind"], string> = {
  quiz: "quiz",
  ask: "ask",
  plan: "propose_plan",
  problem: "pose_problem",
};
