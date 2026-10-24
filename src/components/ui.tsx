"use client";

import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger" }) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 font-sans text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-accent text-accent-ink hover:brightness-110",
        variant === "quiet" && "text-muted hover:bg-sunken hover:text-ink",
        variant === "danger" && "text-miss hover:bg-miss-soft",
        className,
      )}
    />
  );
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={clsx(
        "w-full resize-y rounded-md border border-rule bg-surface px-3 py-2 font-sans text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:outline-none",
        className,
      )}
    />
  );
});

/** The learner's estimate that their answer is right. */
export function Confidence({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const words =
    value < 25 ? "a guess" : value < 50 ? "unsure" : value < 75 ? "fairly sure" : value < 95 ? "confident" : "certain";
  return (
    <label className="flex flex-col gap-1.5 font-sans text-sm">
      <span className="flex justify-between text-muted">
        <span>How sure are you?</span>
        <span className="tabular-nums text-ink">
          {value}% <span className="text-faint">· {words}</span>
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Confidence"
      />
    </label>
  );
}

/** Field where the learner reasons out loud. */
export function Thinking({
  value,
  onChange,
  placeholder = "Think out loud: why this answer, what you were torn between, what feels off.",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <TextArea
      rows={2}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Your thinking"
    />
  );
}

/** Frame shared by all teacher instruments, with a coloured spine by kind. */
export function InstrumentCard({
  label,
  tone = "accent",
  children,
  className,
}: {
  label: string;
  tone?: "accent" | "correct" | "miss" | "unsure" | "muted";
  children: React.ReactNode;
  className?: string;
}) {
  const dot = {
    accent: "bg-accent",
    correct: "bg-correct",
    miss: "bg-miss",
    unsure: "bg-unsure",
    muted: "bg-faint",
  }[tone];
  const ink = {
    accent: "text-ink",
    correct: "text-correct",
    miss: "text-miss",
    unsure: "text-unsure",
    muted: "text-muted",
  }[tone];
  return (
    <section className={clsx("rounded-xl border border-rule bg-surface p-4 sm:p-5", className)}>
      <h3 className={clsx("mb-3 flex items-center gap-2 font-sans text-[13px] font-medium", ink)}>
        <span aria-hidden className={clsx("size-1.5 rounded-full", dot)} />
        {label}
      </h3>
      {children}
    </section>
  );
}
