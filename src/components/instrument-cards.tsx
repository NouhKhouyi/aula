"use client";

import { useState } from "react";
import type { PlanToolInput, ProblemInput } from "@/lib/core/tools";
import type { AskAnswer, LearnerResponse, PlanAnswer, ProblemAnswer } from "@/lib/core/types";
import { Markdown } from "./markdown";
import { PlanLegend, PlanMap } from "./plan-map";
import { Button, Confidence, InstrumentCard, TextArea } from "./ui";

function submitOnModEnter(e: React.KeyboardEvent, submit: () => void) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    submit();
  }
}

export function AskCard({
  callId,
  question,
  answer,
  active,
  onSubmit,
}: {
  callId: string;
  question: string;
  answer?: AskAnswer;
  active: boolean;
  onSubmit: (r: LearnerResponse) => void;
}) {
  const [text, setText] = useState("");
  const submit = () => text.trim() && onSubmit({ callId, kind: "ask", text: text.trim() });
  return (
    <InstrumentCard label="Question" tone={answer ? "muted" : "accent"}>
      <Markdown className="prose-card">{question}</Markdown>
      {answer ? (
        <p className="mt-3 whitespace-pre-wrap border-l-2 border-learner pl-3 font-sans text-[15px]">{answer.text}</p>
      ) : (
        active && (
          <div className="mt-3 flex flex-col gap-2">
            <TextArea
              rows={3}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => submitOnModEnter(e, submit)}
              placeholder="In your own words…"
              aria-label="Your answer"
            />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={!text.trim()}>
                Reply
              </Button>
            </div>
          </div>
        )
      )}
    </InstrumentCard>
  );
}

export function PlanCard({
  callId,
  input,
  answer,
  active,
  onSubmit,
}: {
  callId: string;
  input: PlanToolInput;
  answer?: PlanAnswer;
  active: boolean;
  onSubmit: (r: LearnerResponse) => void;
}) {
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState("");
  const label = !answer ? "Proposed plan" : answer.approved ? "Plan approved" : "Changes requested";
  return (
    <InstrumentCard label={label} tone={!answer ? "accent" : answer.approved ? "correct" : "muted"}>
      <Markdown className="prose-card">{input.approach}</Markdown>
      <div className="mt-5 rounded-md bg-sunken p-3 pb-4">
        <PlanMap nodes={input.nodes} edges={input.edges} goal={input.goal} />
      </div>
      <div className="mt-2">
        <PlanLegend />
      </div>

      {answer?.feedback && (
        <p className="mt-3 whitespace-pre-wrap border-l-2 border-learner pl-3 font-sans text-[15px]">
          {answer.feedback}
        </p>
      )}

      {!answer && active && (
        <div className="mt-4 flex flex-col gap-3 border-t border-rule pt-4">
          <p className="font-sans text-sm text-muted">
            Read the bottom row first. Every foundation should feel obviously true to you — if one doesn&apos;t, say so
            now. It is cheap to fix here and expensive halfway through.
          </p>
          {revising && (
            <TextArea
              rows={3}
              autoFocus
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What should change? A foundation that isn't obvious, a different goal, something you already know…"
              aria-label="Requested changes"
            />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {revising ? (
              <>
                <Button variant="quiet" onClick={() => setRevising(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!feedback.trim()}
                  onClick={() => onSubmit({ callId, kind: "plan", approved: false, feedback: feedback.trim() })}
                >
                  Request changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="quiet" onClick={() => setRevising(true)}>
                  Request changes
                </Button>
                <Button onClick={() => onSubmit({ callId, kind: "plan", approved: true })}>Approve and start</Button>
              </>
            )}
          </div>
        </div>
      )}
    </InstrumentCard>
  );
}

export function ProblemCard({
  callId,
  input,
  answer,
  active,
  onSubmit,
}: {
  callId: string;
  input: ProblemInput;
  answer?: ProblemAnswer;
  active: boolean;
  onSubmit: (r: LearnerResponse) => void;
}) {
  const [attempt, setAttempt] = useState("");
  const [confidence, setConfidence] = useState(50);
  const submit = () => attempt.trim() && onSubmit({ callId, kind: "problem", attempt: attempt.trim(), confidence });
  return (
    <InstrumentCard label="Problem" tone={answer ? "muted" : "accent"}>
      <Markdown className="prose-card">{input.statement}</Markdown>
      {answer ? (
        <div className="mt-3 border-l-2 border-learner pl-3 font-sans text-[15px]">
          {answer.gaveUp ? (
            <p className="text-muted">You asked to see the solution.</p>
          ) : (
            <>
              <p className="whitespace-pre-wrap">{answer.attempt}</p>
              {answer.confidence !== undefined && <p className="mt-1 text-sm text-muted">{answer.confidence}% sure</p>}
            </>
          )}
        </div>
      ) : (
        active && (
          <div className="mt-4 flex flex-col gap-3">
            <TextArea
              rows={5}
              autoFocus
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              onKeyDown={(e) => submitOnModEnter(e, submit)}
              placeholder="Work it through here. Steps, half-ideas and dead ends all help — LaTeX works too."
              aria-label="Your attempt"
            />
            <Confidence value={confidence} onChange={setConfidence} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="quiet" onClick={() => onSubmit({ callId, kind: "problem", attempt: "", gaveUp: true })}>
                Show me the solution
              </Button>
              <Button onClick={submit} disabled={!attempt.trim()}>
                Submit attempt
              </Button>
            </div>
          </div>
        )
      )}
    </InstrumentCard>
  );
}
