import { z } from "zod";
import type { SessionKind } from "./types";

/**
 * The teacher's instruments. A tool is either interactive — the turn stops and
 * the learner answers it in the UI — or immediate, executed by the server
 * before the model continues.
 */
export interface ToolSpec<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  interactive: boolean;
  modes: SessionKind[];
}

const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "ids are short slugs: letters, digits, _ or -");

export const quizSchema = z.object({
  role: z
    .enum(["probe", "predict", "check"])
    .describe(
      "probe: locate the edge of understanding (before the plan). predict: ask the learner to predict before you explain. check: verify the step you just taught landed.",
    ),
  question: z.string().min(1).describe("The question. LaTeX for any math."),
  correct: z.string().min(1).describe("The correct option, as a bare assertion with no justification."),
  distractors: z
    .array(z.string().min(1))
    .min(2)
    .max(5)
    .describe(
      "Wrong options, each mutated from the correct one: same skeleton, grain and register. Each must be a real mistake a learner could make, and unambiguously false.",
    ),
  explanation: z.string().min(1).describe("Why the correct answer is correct. Shown only after the learner answers."),
});

export const askSchema = z.object({
  question: z.string().min(1).describe("An open question with no correct answer: goals, preferences, direction."),
});

export const planSchema = z.object({
  approach: z.string().min(1).describe("What is covered, in what order, and why that order. Markdown."),
  goal: id.describe("Id of the node that is the learner's goal."),
  nodes: z
    .array(
      z.object({
        id,
        label: z.string().min(1).max(90).describe("A short statement of the node."),
        foundation: z.boolean().describe("True for unconditional truths accepted as-is (the roots)."),
      }),
    )
    .min(1)
    .max(30),
  edges: z
    .array(z.object({ from: id, to: id }))
    .describe("from → to means `to` is reached from `from` (a prerequisite edge)."),
});

export const progressSchema = z.object({
  current: id.optional().describe("The plan node now being taught."),
  done: z.array(id).describe("Every plan node that has now landed, cumulatively."),
});

export const problemSchema = z.object({
  statement: z.string().min(1).describe("The problem. It must not name the idea needed to solve it."),
  targets: z.array(z.string()).describe("Names of the propositions the problem exercises."),
  modelSolution: z
    .string()
    .min(1)
    .describe("Your committed solution, written before seeing the attempt. Never shown before the learner submits."),
});

export const TOOLS = {
  quiz: {
    name: "quiz",
    description:
      "Pose a graded multiple-choice question. The options are shuffled and an “I don't know” option is added automatically — never include one yourself. The learner can also report confidence and think out loud. Ends your turn.",
    schema: quizSchema,
    interactive: true,
    modes: ["teach", "practice"],
  },
  ask: {
    name: "ask",
    description:
      "Ask an open question that has no correct answer (their goal, a preference, which branch to take). Never use it for something gradable. Ends your turn.",
    schema: askSchema,
    interactive: true,
    modes: ["teach", "practice"],
  },
  propose_plan: {
    name: "propose_plan",
    description:
      "Present the lesson plan: the approach in prose and the dependency map from foundations to the goal. The learner approves it or asks for changes. Ends your turn. Calling it again replaces the plan.",
    schema: planSchema,
    interactive: true,
    modes: ["teach"],
  },
  set_progress: {
    name: "set_progress",
    description:
      "Record where the lesson is on the approved plan: the node being taught and every node that has landed. Call it whenever that changes. Does not end your turn.",
    schema: progressSchema,
    interactive: false,
    modes: ["teach"],
  },
  pose_problem: {
    name: "pose_problem",
    description:
      "Pose a practice problem. The learner submits an attempt in their own words, with confidence. Ends your turn.",
    schema: problemSchema,
    interactive: true,
    modes: ["practice"],
  },
} satisfies Record<string, ToolSpec>;

export type ToolName = keyof typeof TOOLS;

export function toolsFor(kind: SessionKind): ToolSpec[] {
  return Object.values(TOOLS).filter((t) => (t.modes as SessionKind[]).includes(kind));
}

export function isToolName(name: string): name is ToolName {
  return Object.hasOwn(TOOLS, name);
}

/** JSON Schema for a tool's input, without the `$schema` key providers reject. */
export function inputJsonSchema(spec: ToolSpec): Record<string, unknown> {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(spec.schema, {
    target: "draft-7",
  }) as Record<string, unknown>;
  return schema;
}

export type QuizInput = z.infer<typeof quizSchema>;
export type AskInput = z.infer<typeof askSchema>;
export type PlanToolInput = z.infer<typeof planSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
export type ProblemInput = z.infer<typeof problemSchema>;
