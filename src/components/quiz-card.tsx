"use client";

import clsx from "clsx";
import { Check, HelpCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { displayQuiz } from "@/lib/core/quiz";
import type { QuizInput } from "@/lib/core/tools";
import type { LearnerResponse, QuizAnswer } from "@/lib/core/types";
import { Markdown } from "./markdown";
import { Button, Confidence, InstrumentCard, Thinking } from "./ui";

const ROLE_LABEL: Record<QuizInput["role"], string> = {
  probe: "Where are you?",
  predict: "Predict first",
  check: "Check your understanding",
};

const DONT_KNOW = -1;

export function QuizCard({
  callId,
  input,
  answer,
  active,
  collapsed: startCollapsed,
  onSubmit,
}: {
  callId: string;
  input: QuizInput;
  answer?: QuizAnswer;
  active: boolean;
  collapsed?: boolean;
  onSubmit: (r: LearnerResponse) => void;
}) {
  const shown = useMemo(() => displayQuiz(input, callId), [input, callId]);
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [thinking, setThinking] = useState("");
  const [collapsed, setCollapsed] = useState(!!startCollapsed && !answer);
  const ref = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);

  // Once an option is picked, bring the confidence, thinking and Answer
  // controls into view: they can sit under the fixed message box.
  useEffect(() => {
    if (choice === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [choice]);

  // Number keys pick options, 0 or ? says "I don't know".
  useEffect(() => {
    if (!active || answer || collapsed) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("textarea, input")) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= shown.options.length) setChoice(n - 1);
      if (e.key === "0" || e.key === "?") setChoice(DONT_KNOW);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, answer, collapsed, shown.options.length]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-accent/60 bg-accent-soft/40 px-4 py-3 text-left font-sans text-sm text-ink hover:bg-accent-soft"
      >
        <HelpCircle size={16} className="text-accent" />
        Check your understanding
        <span className="ml-auto text-xs text-muted">when you have finished reading</span>
      </button>
    );
  }

  const tone = !answer ? "accent" : answer.dontKnow ? "unsure" : answer.correct ? "correct" : "miss";
  const verdict = !answer
    ? ROLE_LABEL[input.role]
    : answer.dontKnow
      ? "You said you don't know — that's a useful answer"
      : answer.correct
        ? "Correct"
        : "Not quite";

  function submit() {
    if (choice === null) return;
    onSubmit({
      callId,
      kind: "quiz",
      chosenIndex: choice === DONT_KNOW ? null : choice,
      confidence: choice === DONT_KNOW ? undefined : confidence,
      thinking: thinking.trim() || undefined,
    });
  }

  const options = answer?.options ?? shown.options;
  return (
    <div ref={ref}>
      <InstrumentCard label={verdict} tone={tone}>
        <Markdown className="prose-card">{shown.question}</Markdown>
        <ol className="mt-4 flex flex-col gap-2" aria-label="Options">
          {options.map((option, i) => {
            const picked = answer ? answer.chosenIndex === i : choice === i;
            const isCorrect = answer && answer.correctIndex === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={!!answer || !active}
                  onClick={() => setChoice(i)}
                  aria-pressed={picked}
                  className={clsx(
                    "flex w-full items-start gap-3 rounded-md border px-3 text-left transition-colors",
                    answer ? "py-1.5" : "py-2.5",
                    !answer && picked && "border-accent bg-accent-soft",
                    !answer && !picked && "border-rule hover:border-faint",
                    answer && isCorrect && "border-correct bg-correct-soft",
                    answer && picked && !isCorrect && "border-miss bg-miss-soft",
                    answer && !picked && !isCorrect && "border-transparent opacity-55",
                  )}
                >
                  <span className="mt-[3px] w-4 shrink-0 font-sans text-xs tabular-nums text-faint">{i + 1}</span>
                  <Markdown className="prose-card flex-1 [&_p]:m-0">{option}</Markdown>
                  {answer && isCorrect && (
                    <Check size={18} className="mt-1 shrink-0 text-correct" aria-label="correct" />
                  )}
                  {answer && picked && !isCorrect && (
                    <X size={18} className="mt-1 shrink-0 text-miss" aria-label="your answer" />
                  )}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              disabled={!!answer || !active}
              onClick={() => setChoice(DONT_KNOW)}
              aria-pressed={answer ? answer.dontKnow : choice === DONT_KNOW}
              className={clsx(
                "w-full rounded-md border border-dashed px-3 py-2 text-left font-sans text-sm transition-colors",
                (answer ? answer.dontKnow : choice === DONT_KNOW)
                  ? "border-unsure bg-unsure-soft text-ink"
                  : "border-rule text-muted hover:border-faint",
                answer && !answer.dontKnow && "hidden",
              )}
            >
              I don&apos;t know
            </button>
          </li>
        </ol>

        {!answer && active && (
          <div ref={controls} className="mt-4 flex scroll-mb-36 flex-col gap-3">
            {choice !== null && choice !== DONT_KNOW && <Confidence value={confidence} onChange={setConfidence} />}
            <Thinking value={thinking} onChange={setThinking} />
            <div className="flex items-center justify-between gap-3">
              <span className="font-sans text-xs text-faint">
                Keys 1–{options.length} pick an option, 0 for I don&apos;t know
              </span>
              <Button onClick={submit} disabled={choice === null}>
                Answer
              </Button>
            </div>
          </div>
        )}

        {answer && (
          <div className="mt-4 flex flex-col gap-3 border-t border-rule pt-4">
            {(answer.confidence !== undefined || answer.thinking) && (
              <div className="border-l-2 border-learner pl-3 font-sans text-sm text-muted">
                {answer.confidence !== undefined && <p>You were {answer.confidence}% sure.</p>}
                {answer.thinking && <p className="mt-1 whitespace-pre-wrap text-ink">{answer.thinking}</p>}
              </div>
            )}
            <Markdown className="prose-card">{answer.explanation}</Markdown>
          </div>
        )}
      </InstrumentCard>
    </div>
  );
}
