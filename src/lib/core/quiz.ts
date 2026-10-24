import type { QuizAnswer, QuizRole } from "./types";

/**
 * The teacher authors a quiz as one correct statement plus distractors mutated
 * from it. The order the learner sees is a deterministic shuffle seeded by the
 * tool-call id, so the browser and the server always agree on it without
 * either having to store it — and the log records exactly what was on screen.
 */
export interface QuizInput {
  role: QuizRole;
  question: string;
  correct: string;
  distractors: string[];
  explanation: string;
}

export interface DisplayedQuiz {
  question: string;
  options: string[];
  correctIndex: number;
}

/** FNV-1a: tiny, stable across runtimes, good enough to seed a shuffle. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = rng(hash(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function displayQuiz(input: QuizInput, callId: string): DisplayedQuiz {
  const tagged = [
    { text: input.correct, correct: true },
    ...input.distractors.map((text) => ({ text, correct: false })),
  ];
  const shuffled = seededShuffle(tagged, callId);
  return {
    question: input.question,
    options: shuffled.map((o) => o.text),
    correctIndex: shuffled.findIndex((o) => o.correct),
  };
}

export function gradeQuiz(
  input: QuizInput,
  callId: string,
  chosenIndex: number | null,
  extra: { confidence?: number; thinking?: string } = {},
): QuizAnswer {
  const shown = displayQuiz(input, callId);
  if (
    chosenIndex !== null &&
    (!Number.isInteger(chosenIndex) ||
      chosenIndex < 0 ||
      chosenIndex >= shown.options.length)
  ) {
    throw new Error(`Option ${chosenIndex} does not exist.`);
  }
  const dontKnow = chosenIndex === null;
  const confidence =
    dontKnow || extra.confidence === undefined
      ? undefined
      : Math.max(0, Math.min(100, Math.round(extra.confidence)));
  return {
    kind: "quiz",
    role: input.role,
    question: shown.question,
    options: shown.options,
    correctIndex: shown.correctIndex,
    chosenIndex,
    dontKnow,
    correct: !dontKnow && chosenIndex === shown.correctIndex,
    confidence,
    thinking: extra.thinking?.trim() || undefined,
    explanation: input.explanation,
  };
}

/**
 * The text the teacher reads back. It reports what happened, including the
 * learner's own words, and leaves interpretation to the teacher.
 */
export function quizResultForModel(a: QuizAnswer): string {
  const lines: string[] = [];
  if (a.dontKnow) {
    lines.push("The learner chose “I don't know”. This is not a wrong answer.");
  } else {
    const picked = a.options[a.chosenIndex!];
    lines.push(
      a.correct
        ? `Correct. The learner chose: “${picked}”.`
        : `Incorrect. The learner chose: “${picked}”. Correct: “${a.options[a.correctIndex]}”.`,
    );
    if (a.confidence !== undefined) {
      lines.push(`Self-reported confidence: ${a.confidence}%.`);
    }
  }
  if (a.thinking) lines.push(`Learner's thinking, verbatim: """${a.thinking}"""`);
  lines.push("The learner has now seen the correct answer and your explanation.");
  return lines.join("\n");
}
