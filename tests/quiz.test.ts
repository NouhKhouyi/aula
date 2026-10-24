import { describe, expect, it } from "vitest";
import { displayQuiz, gradeQuiz, quizResultForModel, seededShuffle } from "@/lib/core/quiz";

const quiz = {
  role: "probe" as const,
  question: "2 + 2?",
  correct: "4",
  distractors: ["3", "5", "22"],
  explanation: "Addition.",
};

describe("seededShuffle", () => {
  it("is deterministic for a seed and a permutation of the input", () => {
    const a = seededShuffle([1, 2, 3, 4, 5], "seed");
    expect(seededShuffle([1, 2, 3, 4, 5], "seed")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("puts the correct option in different positions across calls", () => {
    const positions = new Set(Array.from({ length: 40 }, (_, i) => displayQuiz(quiz, `call_${i}`).correctIndex));
    expect(positions.size).toBeGreaterThan(2);
  });
});

describe("gradeQuiz", () => {
  it("grades against the displayed order", () => {
    const shown = displayQuiz(quiz, "call_x");
    const right = gradeQuiz(quiz, "call_x", shown.correctIndex, { confidence: 80 });
    expect(right.correct).toBe(true);
    expect(right.options[right.correctIndex]).toBe("4");
    expect(right.confidence).toBe(80);

    const wrong = gradeQuiz(quiz, "call_x", (shown.correctIndex + 1) % 4);
    expect(wrong.correct).toBe(false);
  });

  it("treats I don't know as its own signal, without confidence", () => {
    const a = gradeQuiz(quiz, "call_x", null, { confidence: 90, thinking: "  no idea " });
    expect(a).toMatchObject({ dontKnow: true, correct: false, confidence: undefined, thinking: "no idea" });
    expect(quizResultForModel(a)).toContain("not a wrong answer");
  });

  it("rejects options that do not exist", () => {
    expect(() => gradeQuiz(quiz, "call_x", 9)).toThrow();
    expect(() => gradeQuiz(quiz, "call_x", 1.5)).toThrow();
  });

  it("passes the learner's thinking verbatim to the teacher", () => {
    const a = gradeQuiz(quiz, "c", 0, { thinking: "I added the digits" });
    expect(quizResultForModel(a)).toContain('"""I added the digits"""');
  });
});
