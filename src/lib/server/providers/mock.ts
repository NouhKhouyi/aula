import { newId } from "../../core/ids";
import type { AssistantBlock, Message } from "../../core/types";
import type { JsonRequest, Provider, TurnRequest, TurnResult } from "./types";

/**
 * Demo mode: a scripted teacher that needs no API key. It always runs the same
 * short lesson — why the derivative of x² is 2x — so anyone can see the whole
 * probe → plan → teach loop, and the test suite can drive the real agent and
 * UI end to end without a network.
 */

type Step = (answered: number) => AssistantBlock[];

const call = (name: string, input: Record<string, unknown>): AssistantBlock => ({
  type: "tool_call",
  id: newId("call"),
  name,
  input,
});
const text = (t: string): AssistantBlock => ({ type: "text", text: t });

const PLAN = {
  approach:
    "We start from something you already hold — the slope of a straight line — and ask what *slope* could even mean for a curve. Averaging over a shrinking interval answers it, and the algebra for $x^2$ then makes $2x$ fall out on its own.",
  goal: "goal",
  nodes: [
    { id: "slope", label: "Slope of a line = rise / run", foundation: true },
    { id: "secant", label: "Average rate over an interval", foundation: false },
    { id: "limit", label: "Shrink the interval: the tangent slope", foundation: false },
    { id: "goal", label: "d/dx x² = 2x", foundation: false },
  ],
  edges: [
    { from: "slope", to: "secant" },
    { from: "secant", to: "limit" },
    { from: "limit", to: "goal" },
  ],
};

const TEACH: Step[] = [
  () => [
    text(
      "**Demo mode.** No model is connected, so I will run one scripted mini-lesson to show you how aula works: why the derivative of $x^2$ is $2x$. Connect a provider in **Settings** to study anything you like.\n\nFirst, the goal.",
    ),
    call("ask", { question: "What would you like to be able to do once this lesson is over?" }),
  ],
  () => [
    text("Thanks. Now a few questions to find the edge of what you already hold. Missing some is the point — and *I don't know* is always welcome."),
    call("quiz", {
      role: "probe",
      question: "A straight line passes through $(1, 2)$ and $(3, 6)$. What is its slope?",
      correct: "$2$",
      distractors: ["$4$", "$\\tfrac{1}{2}$", "$3$"],
      explanation: "Slope is rise over run: $\\frac{6-2}{3-1} = \\frac{4}{2} = 2$.",
    }),
  ],
  () => [
    text("Now push past the floor."),
    call("quiz", {
      role: "probe",
      question: "What is the average rate of change of $f(x) = x^2$ between $x=1$ and $x=3$?",
      correct: "$4$",
      distractors: ["$8$", "$2$", "$6$"],
      explanation: "$\\frac{f(3)-f(1)}{3-1} = \\frac{9-1}{2} = 4$ — the slope of the straight line through the two points of the curve.",
    }),
  ],
  () => [
    text("I have what I need. Here is the plan — read the roots and tell me whether they look obviously true to you."),
    call("propose_plan", PLAN),
  ],
  () => [
    call("set_progress", { current: "secant", done: ["slope"] }),
    text(
      "A curve has no single rise-over-run: its steepness keeps changing. But between any two points we *can* draw a straight line — a **secant** — and that line has a slope you already know how to compute.\n\nFor $f(x)=x^2$, between $x$ and $x+h$:\n\n$$\\frac{(x+h)^2 - x^2}{h}$$\n\n```mermaid\nflowchart LR\n  A[\"two points on the curve\"] --> B[\"secant line\"] --> C[\"rise / run\"]\n```\n\nBefore I simplify it — predict.",
    ),
    call("quiz", {
      role: "predict",
      question: "What does $\\frac{(x+h)^2 - x^2}{h}$ simplify to, for $h \\neq 0$?",
      correct: "$2x + h$",
      distractors: ["$2x$", "$x + h$", "$2x + 2h$"],
      explanation: "$(x+h)^2 - x^2 = 2xh + h^2$, and dividing by $h$ leaves $2x + h$.",
    }),
  ],
  () => [
    call("set_progress", { current: "limit", done: ["slope", "secant"] }),
    text(
      "So the secant from $x$ to $x+h$ has slope exactly $2x + h$. Now ask what you would *want* the slope at a single point to be. The natural move: make the interval smaller and smaller. As $h$ shrinks toward $0$, the secant pivots toward the line that just touches the curve at $x$ — the **tangent** — and its slope $2x + h$ heads toward $2x$.",
    ),
    call("quiz", {
      role: "check",
      question: "As $h \\to 0$, what happens to the slope $2x + h$ of the secant at $x = 5$?",
      correct: "It approaches $10$",
      distractors: ["It approaches $5$", "It approaches $25$", "It approaches $0$"],
      explanation: "At $x=5$ the secant slope is $10 + h$, which approaches $10 = 2\\cdot 5$.",
    }),
  ],
  () => [
    call("set_progress", { done: ["slope", "secant", "limit", "goal"] }),
    text(
      "And that is the whole result: the slope of $x^2$ at any point $x$ is\n\n$$\\frac{d}{dx}x^2 = 2x$$\n\nNothing in it was decreed. A slope is rise over run (you held that already); a curve's steepness at a point is what secant slopes approach; and for $x^2$ the algebra hands you $2x + h$, so the limit is $2x$. That is the click — one memorised rule replaced by a derivation you could rebuild on a blank page.\n\nWhen you are ready, export this lesson to your vault, add it to your knowledge graph, and start a practice session.",
    ),
  ],
];

const PRACTICE: Step[] = [
  () => [
    text("**Demo mode.** A scripted practice round. Connect a provider in **Settings** for real practice drawn from your graph."),
    call("pose_problem", {
      statement:
        "A ball's height is $h(t) = t^2$ metres after $t$ seconds. How fast is it rising at exactly $t = 4$?",
      targets: ["d/dx x² = 2x"],
      modelSolution: "The rate is the derivative: $h'(t) = 2t$, so $h'(4) = 8$ m/s.",
    }),
  ],
  () => [
    text(
      "Here is the clean solution. \"How fast at an instant\" is the slope at a point, and for $t^2$ that slope is $2t$. So at $t=4$ the ball rises at $8$ m/s. The idea the problem never named was the derivative — noticing that it was needed is exactly the skill practice builds.",
    ),
  ],
];

function answeredInteractive(messages: Message[]): number {
  let n = 0;
  for (const m of messages) {
    if (m.role === "tool") n += m.results.filter((r) => !r.isError && r.details?.kind !== "progress").length;
  }
  return n;
}

async function stream(blocks: AssistantBlock[], req: TurnRequest, delayMs: number): Promise<void> {
  for (const b of blocks) {
    if (b.type !== "text") continue;
    for (const piece of b.text.match(/\S+\s*/g) ?? []) {
      if (req.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      req.onText(piece);
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** `delayMs` paces the fake streaming so the demo reads like a real model. */
export function mockProvider({ delayMs = 12 }: { delayMs?: number } = {}): Provider {
  return {
    id: "mock",
    model: "demo",
    canSearch: false,

    async turn(req: TurnRequest): Promise<TurnResult> {
      const practice = req.tools.some((t) => t.name === "pose_problem");
      const script = practice ? PRACTICE : TEACH;
      const last = req.messages.at(-1);
      const answered = answeredInteractive(req.messages);
      const planVerdicts = req.messages.flatMap((m) =>
        m.role === "tool"
          ? m.results.flatMap((r) => (r.details?.kind === "plan" ? [r.details.approved] : []))
          : [],
      );
      const rejections = planVerdicts.filter((v) => !v).length;

      let blocks: AssistantBlock[];
      if (last?.role === "tool" && last.results.every((r) => r.details?.kind === "progress")) {
        // set_progress was answered by the server; the scripted step already spoke.
        blocks = [];
      } else if (last?.role === "user" && req.messages.length > 1) {
        blocks = [text("In demo mode I can only follow the script — connect a model in **Settings** to ask anything. Answer the open question above to continue.")];
      } else if (planVerdicts.at(-1) === false && last?.role === "tool") {
        blocks = [text("In demo mode the plan is fixed, so here it is again."), call("propose_plan", PLAN)];
      } else {
        const index = answered - rejections;
        blocks = (script[index] ?? (() => [text("That is the end of the demo lesson.")]))(answered);
      }

      await stream(blocks, req, delayMs);
      const hasCalls = blocks.some((b) => b.type === "tool_call");
      return {
        message: { blocks },
        stop: hasCalls ? "tool_use" : "end",
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    },

    async json<T>(req: JsonRequest<T>) {
      const value = req.schema.parse({
        propositions: [
          { name: "Slope", statement: "The slope of a straight line is its rise divided by its run.", understanding: "solid" },
          { name: "Secant slope", statement: "The average rate of change of f between two points is the slope of the secant line through them.", understanding: "accepted" },
          { name: "Derivative", statement: "The derivative of f at x is the limit of secant slopes as the interval shrinks to zero.", understanding: "accepted" },
          { name: "Derivative of x²", statement: "The derivative of x² is 2x.", understanding: "solid" },
        ],
        chains: [
          { premises: ["Slope"], conclusion: "Secant slope" },
          { premises: ["Secant slope"], conclusion: "Derivative" },
          { premises: ["Derivative"], conclusion: "Derivative of x²" },
        ],
      });
      return { value, usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };
}
