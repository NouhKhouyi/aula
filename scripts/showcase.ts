/**
 * Writes a realistic sample record — a lesson in progress, a practice round,
 * a few other sessions and a populated knowledge graph — so the interface can
 * be explored, reviewed and screenshotted without spending tokens.
 *
 *   AULA_DATA_DIR=/tmp/aula-showcase npm run showcase
 *
 * It refuses to touch a data folder that already has sessions in it.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { mergeExtraction, EMPTY_GRAPH, type Extraction } from "../src/lib/core/graph";
import { gradeQuiz, quizResultForModel } from "../src/lib/core/quiz";
import type { PlanToolInput, QuizInput } from "../src/lib/core/tools";
import type { AssistantBlock, Message, Session, ToolResult } from "../src/lib/core/types";
import { dataDir, paths } from "../src/lib/server/paths";
import { DEFAULT_SETTINGS, writeJsonAtomic } from "../src/lib/server/store";

const DAY = 86_400_000;
const NOW = Date.now();
let clock = 0;
let seq = 0;

const id = (prefix: string) => `${prefix}_showcase${String(++seq).padStart(4, "0")}`;
const at = () => clock++ * 47_000 + clockBase;
let clockBase = NOW;

function user(text: string): Message {
  return { id: id("msg"), role: "user", ts: at(), text };
}
function assistant(...blocks: AssistantBlock[]): Message {
  return { id: id("msg"), role: "assistant", ts: at(), blocks };
}
function results(...r: ToolResult[]): Message {
  return { id: id("msg"), role: "tool", ts: at(), results: r };
}
const text = (t: string): AssistantBlock => ({ type: "text", text: t });
function call(name: string, input: object): AssistantBlock & { type: "tool_call" } {
  return { type: "tool_call", id: id("call"), name, input: input as Record<string, unknown> };
}

/** Answers a quiz by the text of the option the learner chose. */
function answerQuiz(
  c: AssistantBlock & { type: "tool_call" },
  pick: string | null,
  extra: { confidence?: number; thinking?: string } = {},
): ToolResult {
  const input = c.input as unknown as QuizInput;
  const options = [input.correct, ...input.distractors];
  if (pick !== null && !options.includes(pick)) throw new Error(`No option “${pick}”.`);
  // Grade against the displayed order, exactly as the app does.
  const probe = gradeQuiz(input, c.id, null);
  const index = pick === null ? null : probe.options.indexOf(pick);
  const answer = gradeQuiz(input, c.id, index, extra);
  return { callId: c.id, name: "quiz", output: quizResultForModel(answer), details: answer };
}

function session(partial: Partial<Session> & Pick<Session, "id" | "title" | "messages">): Session {
  const first = partial.messages[0]?.ts ?? NOW;
  const last = partial.messages.at(-1)?.ts ?? NOW;
  return {
    version: 1,
    kind: "teach",
    createdAt: new Date(first).toISOString(),
    updatedAt: new Date(last).toISOString(),
    provider: "anthropic",
    model: "claude-opus-5-5",
    phase: "teach",
    progress: { done: [] },
    usage: { inputTokens: 0, outputTokens: 0 },
    ...partial,
  };
}

// ── the lesson in progress ──────────────────────────────────────────────────

clockBase = NOW - 40 * 60_000;

const goal = call("ask", {
  question: "When this is over, what should you be able to do that you can't do now?",
});
const q1 = call("quiz", {
  role: "probe",
  question:
    "A fair coin is flipped twice. Let $A$ be “at least one head” and $B$ be “the first flip is heads”. What is $P(A \\mid B)$?",
  correct: "$1$",
  distractors: ["$3/4$", "$1/2$", "$2/3$"],
  explanation:
    "If the first flip is heads, “at least one head” is already guaranteed. Conditioning on $B$ leaves the outcomes $\\{HH, HT\\}$, and $A$ contains both.",
});
const q2 = call("quiz", {
  role: "probe",
  question:
    "A test has sensitivity $0.99$ and specificity $0.99$. The disease affects $1$ in $10{,}000$ people. You test positive. Roughly what is $P(\\text{disease} \\mid +)$?",
  correct: "About $1\\%$",
  distractors: ["About $99\\%$", "About $50\\%$", "It cannot be known without the sample size"],
  explanation:
    "Out of $10{,}000$ people, about $1$ is ill and tests positive, while about $100$ healthy people test positive anyway. So roughly $1$ in $101$ positives is ill. $99\\%$ is $P(+ \\mid \\text{disease})$ — the other conditional.",
});
const q3 = call("quiz", {
  role: "probe",
  question: "Which of these is *always* true?",
  correct: "$P(A \\mid B)\\,P(B) = P(B \\mid A)\\,P(A)$",
  distractors: [
    "$P(A \\mid B) + P(B \\mid A) = 1$",
    "$P(A \\mid B) = P(B \\mid A)$ when $A$ and $B$ are independent",
    "$P(A \\mid B) \\ge P(A)$",
  ],
  explanation: "Both sides equal $P(A \\cap B)$. That is all of Bayes' rule, before it is rearranged.",
});
const plan: PlanToolInput = {
  approach:
    "You already have the algebra; what is missing is a picture of what conditioning *does*. So we will not start from Bayes' rule. We start from what a probability is, get conditioning as **renormalising a smaller world**, and let Bayes fall out in two lines. By the end, swapping $P(A \\mid B)$ for $P(B \\mid A)$ should look not just wrong but impossible to state.",
  goal: "goal",
  nodes: [
    { id: "sets", label: "A probability is assigned to a set of outcomes", foundation: true },
    { id: "total", label: "The whole space has probability 1", foundation: true },
    { id: "restrict", label: "Conditioning on B restricts the space to B", foundation: false },
    { id: "renorm", label: "A restricted space must be renormalised", foundation: false },
    { id: "formula", label: "P(A|B) = P(A∩B) / P(B)", foundation: false },
    { id: "asym", label: "P(A∩B) is symmetric; P(A|B) is not", foundation: false },
    { id: "goal", label: "Why base rates decide the answer", foundation: false },
  ],
  edges: [
    { from: "sets", to: "restrict" },
    { from: "total", to: "renorm" },
    { from: "restrict", to: "renorm" },
    { from: "renorm", to: "formula" },
    { from: "formula", to: "asym" },
    { from: "asym", to: "goal" },
  ],
};
const planCall = call("propose_plan", plan);
const progress1 = call("set_progress", { current: "restrict", done: ["sets", "total"] });
const predict = call("quiz", {
  role: "predict",
  question: "You are told $B$ happened. Before any formula: what has actually changed?",
  correct: "Which outcomes are still possible",
  distractors: [
    "How likely the outcomes inside $B$ are relative to each other",
    "Nothing — probabilities are fixed once assigned",
    "Only $P(B)$, which becomes $0$",
  ],
  explanation:
    "Nothing physical happened to the outcomes, so their relative likelihoods inside $B$ are untouched. What changed is the world: everything outside $B$ is now impossible.",
});
const progress2 = call("set_progress", { current: "renorm", done: ["sets", "total", "restrict"] });
const check = call("quiz", {
  role: "check",
  question:
    "Inside the restricted world $B$, the outcomes still have their old probabilities, which add up to $P(B) = 0.2$. What must you do to each of them?",
  correct: "Divide it by $0.2$",
  distractors: ["Multiply it by $0.2$", "Subtract $0.2$ from it", "Leave it as it is"],
  explanation: "Dividing by $P(B)$ is the only uniform rescaling that makes the restricted world add up to $1$ again.",
});

const lessonMessages: Message[] = [
  user(
    "I can apply Bayes' rule but I don't think I really understand it. Why does a 99% accurate test give a positive result that's usually wrong?",
  ),
  assistant(
    text(
      "That has a precise answer, and it is worth getting to the bottom of rather than memorising. Before I plan anything I need two things: what you already hold, and what *understanding it* would mean for you.",
    ),
    goal,
  ),
  results({
    callId: goal.id,
    name: "ask",
    output: "",
    details: {
      kind: "ask",
      question: (goal.input as { question: string }).question,
      text: "Explain to a friend why the 99% test is misleading, without just quoting the formula.",
    },
  }),
  assistant(
    text(
      "That is a concrete goal, and a good one. Now a few questions to find where your understanding ends. Missing some is the point — and *I don't know* is always a good answer.",
    ),
    q1,
  ),
  results(answerQuiz(q1, "$1$", { confidence: 90 })),
  assistant(text("That's the floor. Now a sharp step up."), q2),
  results(
    answerQuiz(q2, "About $99\\%$", {
      confidence: 70,
      thinking: "I keep wanting to say 99% and I know that's the trap, but I can't say why.",
    }),
  ),
  assistant(
    text(
      "Your note is the useful part. You *knew* it was a trap and still could not name it. That is not a gap; it is a **systematic misconception** — treating $P(A \\mid B)$ and $P(B \\mid A)$ as roughly the same object and patching it with a memorised warning. One more question, to check it is the direction and not the arithmetic.",
    ),
    q3,
  ),
  results(
    answerQuiz(q3, "$P(A \\mid B)\\,P(B) = P(B \\mid A)\\,P(A)$", {
      confidence: 55,
      thinking: "Both sides look like P(A and B) to me, but I'm not sure that's allowed.",
    }),
  ),
  assistant(
    text(
      "It is allowed — and it is the whole of Bayes' rule. So the algebra is there. What you don't have yet is a picture of what conditioning *does*, and that is exactly what makes the swap feel natural. Here is how I would get you there.",
    ),
    planCall,
  ),
  results({
    callId: planCall.id,
    name: "propose_plan",
    output: "",
    details: { kind: "plan", approved: true },
  }),
  assistant(
    progress1,
    text(
      "Start at the floor, with something you can take at face value: **a probability is a number assigned to a set of outcomes** — not to a statement, not to a value. Formally,\n\n$$P : \\mathcal{F} \\to [0, 1]$$\n\nwhere $\\mathcal{F}$ is a collection of subsets of the sample space $\\Omega$, and $P(\\Omega) = 1$.\n\nNow suppose I tell you $B$ happened. Before any formula, try to say what has changed.",
    ),
    predict,
  ),
  results(
    {
      callId: progress1.id,
      name: "set_progress",
      output: "Progress recorded.",
      details: { kind: "progress", current: "restrict", done: ["sets", "total"] },
    },
    answerQuiz(predict, "Which outcomes are still possible", {
      confidence: 65,
      thinking: "The coin didn't change, so it has to be about which outcomes are left.",
    }),
  ),
  assistant(
    progress2,
    text(
      'Exactly — and you reasoned it rather than recalled it. Conditioning is a change of *world*: throw away everything outside $B$.\n\n```mermaid\nflowchart LR\n  O["Ω: every outcome"] -->|"learn that B happened"| B["only B remains"]\n  B -->|"probabilities no longer add to 1"| R["rescale"]\n```\n\nBut look at what that does. The outcomes left inside $B$ keep their old probabilities, and those now add up to $P(B)$, not to $1$. A foundation you accepted a moment ago says a whole space must total $1$. Something has to give.',
    ),
    check,
  ),
  results({
    callId: progress2.id,
    name: "set_progress",
    output: "Progress recorded.",
    details: { kind: "progress", current: "renorm", done: ["sets", "total", "restrict"] },
  }),
];

const lesson = session({
  id: "s_showcaselesson",
  title: "Why base rates matter in medical tests",
  messages: lessonMessages,
  plan: { ...plan, revision: 1 },
  progress: { current: "renorm", done: ["sets", "total", "restrict"] },
  usage: { inputTokens: 58_400, outputTokens: 7_900 },
});

// ── a practice round ────────────────────────────────────────────────────────

clockBase = NOW - 2 * DAY;
const problem = call("pose_problem", {
  statement:
    "A factory has two machines. Machine X makes $70\\%$ of the parts and $2\\%$ of its parts are faulty; machine Y makes the rest, and $5\\%$ of its parts are faulty. A part picked at random is faulty. How likely is it that machine Y made it?",
  targets: ["Bayes' rule", "Base rate"],
  modelSolution:
    "$P(Y \\mid F) = \\frac{0.3 \\cdot 0.05}{0.7 \\cdot 0.02 + 0.3 \\cdot 0.05} = \\frac{0.015}{0.029} \\approx 0.52$",
});
const practice = session({
  id: "s_showcasepractice",
  title: "Practice: conditional probability",
  kind: "practice",
  messages: [
    user("Practise conditional probability at exam level."),
    assistant(text("Here is one to start. Work it through in your own words — partial reasoning helps."), problem),
    results({
      callId: problem.id,
      name: "pose_problem",
      output: "",
      details: {
        kind: "problem",
        statement: (problem.input as { statement: string }).statement,
        attempt:
          "Faulty from X: 0.7 × 0.02 = 0.014. Faulty from Y: 0.3 × 0.05 = 0.015. So out of all faulty parts, Y's share is 0.015 / (0.014 + 0.015), which is about 52%.",
        confidence: 80,
        gaveUp: false,
      },
    }),
    assistant(
      text(
        "Right, and the way you set it up is the important part: you computed each machine's share of the *faulty* parts before dividing, which is conditioning done by hand. Notice that Y makes far fewer parts yet produces most of the faults — its higher rate beats X's base rate.",
      ),
    ),
  ],
  usage: { inputTokens: 21_300, outputTokens: 2_400 },
});

// ── other sessions ──────────────────────────────────────────────────────────

function brief(sid: string, title: string, daysAgo: number, opening: string, reply: string, phase: Session["phase"]) {
  clockBase = NOW - daysAgo * DAY;
  return session({
    id: sid,
    title,
    phase,
    messages: [user(opening), assistant(text(reply))],
    usage: { inputTokens: 30_000 + daysAgo * 1000, outputTokens: 4_000 },
    extractedAt: new Date(NOW - daysAgo * DAY).toISOString(),
  });
}

const others = [
  brief(
    "s_showcasecrypto",
    "How public-key cryptography lets strangers share a secret",
    4,
    "How can two people who have never met agree on a secret over a channel everyone can read?",
    "The trick rests on one-way functions. Let's find where your understanding of them ends.",
    "teach",
  ),
  brief(
    "s_showcaseentropy",
    "What entropy actually measures",
    9,
    "What does entropy actually measure? Every explanation I've read says 'disorder'.",
    "“Disorder” is the explanation that causes the confusion. Let's start from counting.",
    "teach",
  ),
  brief(
    "s_showcasederiv",
    "Why the derivative of x² is 2x",
    16,
    "Why is the derivative of x² equal to 2x?",
    "We will get there from the slope of a straight line.",
    "teach",
  ),
];

// ── the knowledge graph ─────────────────────────────────────────────────────

const extractions: [string, Extraction][] = [
  [
    "s_showcasederiv",
    {
      propositions: [
        {
          name: "Slope",
          statement: "The slope of a straight line is its rise divided by its run.",
          understanding: "solid",
        },
        {
          name: "Secant slope",
          statement: "The average rate of change between two points is the slope of the secant through them.",
          understanding: "solid",
        },
        {
          name: "Limit",
          statement: "A limit is the value a quantity approaches as its input approaches a point.",
          understanding: "accepted",
        },
        {
          name: "Derivative",
          statement: "The derivative at a point is the limit of secant slopes as the interval shrinks to zero.",
          understanding: "solid",
        },
        { name: "Derivative of x²", statement: "The derivative of x² is 2x.", understanding: "solid" },
        { name: "Power rule", statement: "The derivative of xⁿ is n·xⁿ⁻¹.", understanding: "shaky" },
        {
          name: "Instantaneous rate",
          statement: "An instantaneous rate of change is a derivative.",
          understanding: "accepted",
        },
      ],
      chains: [
        { premises: ["Slope"], conclusion: "Secant slope" },
        { premises: ["Secant slope", "Limit"], conclusion: "Derivative" },
        { premises: ["Derivative"], conclusion: "Derivative of x²" },
        { premises: ["Derivative of x²"], conclusion: "Power rule" },
        { premises: ["Derivative"], conclusion: "Instantaneous rate" },
      ],
    },
  ],
  [
    "s_showcaseentropy",
    {
      propositions: [
        {
          name: "Microstate",
          statement: "A microstate is one exact arrangement of a system's parts.",
          understanding: "solid",
        },
        {
          name: "Macrostate",
          statement: "A macrostate is a description that many microstates share.",
          understanding: "solid",
        },
        {
          name: "Multiplicity",
          statement: "The multiplicity of a macrostate is the number of microstates compatible with it.",
          understanding: "accepted",
        },
        {
          name: "Entropy",
          statement: "Entropy measures the logarithm of a macrostate's multiplicity.",
          understanding: "shaky",
        },
        {
          name: "Second law",
          statement:
            "An isolated system drifts toward macrostates of higher multiplicity because there are more of them.",
          understanding: "resisted",
        },
        {
          name: "Information",
          statement: "Entropy is the information needed to specify the microstate given the macrostate.",
          understanding: "not yet engaged",
        },
      ],
      chains: [
        { premises: ["Microstate", "Macrostate"], conclusion: "Multiplicity" },
        { premises: ["Multiplicity"], conclusion: "Entropy" },
        { premises: ["Entropy"], conclusion: "Second law" },
        { premises: ["Entropy"], conclusion: "Information" },
      ],
    },
  ],
  [
    "s_showcasecrypto",
    {
      propositions: [
        {
          name: "One-way function",
          statement: "A one-way function is easy to compute and hard to invert.",
          understanding: "solid",
        },
        {
          name: "Modular exponentiation",
          statement: "Computing gᵃ mod p is fast even for very large a.",
          understanding: "accepted",
        },
        {
          name: "Discrete logarithm",
          statement: "Recovering a from gᵃ mod p is believed to be infeasible for large p.",
          understanding: "accepted",
        },
        { name: "Shared exponent", statement: "(gᵃ)ᵇ and (gᵇ)ᵃ are equal modulo p.", understanding: "solid" },
        {
          name: "Diffie–Hellman",
          statement: "Two parties can agree on gᵃᵇ mod p while only gᵃ and gᵇ are public.",
          understanding: "shaky",
        },
      ],
      chains: [
        { premises: ["Modular exponentiation", "Discrete logarithm"], conclusion: "One-way function" },
        { premises: ["One-way function", "Shared exponent"], conclusion: "Diffie–Hellman" },
      ],
    },
  ],
  [
    "s_showcasepractice",
    {
      propositions: [
        {
          name: "Probability of a set",
          statement: "A probability is a number assigned to a set of outcomes.",
          understanding: "solid",
        },
        {
          name: "Conditioning",
          statement: "Conditioning on B restricts the sample space to B and renormalises it.",
          understanding: "accepted",
        },
        { name: "Conditional probability", statement: "P(A|B) equals P(A∩B) divided by P(B).", understanding: "solid" },
        { name: "Bayes' rule", statement: "P(A|B)·P(B) equals P(B|A)·P(A).", understanding: "solid" },
        {
          name: "Base rate",
          statement: "How common a condition is before any evidence strongly shapes what a positive test means.",
          understanding: "shaky",
        },
        {
          name: "Base rate fallacy",
          statement: "Reading P(+|disease) as P(disease|+) ignores the base rate.",
          understanding: "accepted",
        },
      ],
      chains: [
        { premises: ["Probability of a set"], conclusion: "Conditioning" },
        { premises: ["Conditioning"], conclusion: "Conditional probability" },
        { premises: ["Conditional probability"], conclusion: "Bayes' rule" },
        { premises: ["Bayes' rule", "Base rate"], conclusion: "Base rate fallacy" },
      ],
    },
  ],
];

async function main() {
  const dir = dataDir();
  const existing = await fs.readdir(paths.sessions()).catch(() => [] as string[]);
  if (existing.some((f) => f.endsWith(".json"))) {
    throw new Error(`${paths.sessions()} already has sessions. Point AULA_DATA_DIR at an empty folder.`);
  }

  let graph = EMPTY_GRAPH;
  extractions.forEach(([sid, extraction], i) => {
    graph = mergeExtraction(graph, extraction, sid, new Date(NOW - (20 - i * 4) * DAY).toISOString()).graph;
  });

  for (const s of [lesson, practice, ...others]) await writeJsonAtomic(paths.session(s.id), s);
  await writeJsonAtomic(paths.graph(), graph);
  await writeJsonAtomic(paths.settings(), DEFAULT_SETTINGS);

  console.log(`Showcase written to ${path.relative(process.cwd(), dir) || dir}`);
  console.log(
    `  ${2 + others.length} sessions, ${graph.propositions.length} propositions, ${graph.chains.length} reasoning steps`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
