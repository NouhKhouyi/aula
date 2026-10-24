"use client";

import clsx from "clsx";
import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import type { PublicSettings, SessionKind, SessionSummary } from "@/lib/core/types";
import { AppHeader } from "./app-header";
import { START_KEY } from "./session-view";

const PROMPTS: Record<SessionKind, { title: string; placeholder: string; examples: string[] }> = {
  teach: {
    title: "What do you want to understand?",
    placeholder: "Why does Bayes' rule work? How do TCP handshakes recover from loss? What is a monad, really?",
    examples: [
      "Why is the derivative of x² equal to 2x?",
      "How does public-key cryptography let strangers share a secret?",
      "What does entropy actually measure?",
    ],
  },
  practice: {
    title: "What do you want to practise?",
    placeholder: "Conditional probability problems, at exam level. Or: everything from my last three sessions.",
    examples: ["Derivatives of everyday functions", "Big-O of real code", "Conditional probability"],
  },
};

function relative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

function providerReady(s: PublicSettings | null): boolean {
  if (!s) return true;
  if (s.provider === "mock") return true;
  if (s.provider === "anthropic") return s.keys.anthropic;
  return !!s.openai.model;
}

export function Home() {
  const router = useRouter();
  const [kind, setKind] = useState<SessionKind>("teach");
  const [topic, setTopic] = useState("");
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SessionSummary[]>("/api/sessions")
      .then(setSessions)
      .catch(() => setSessions([]));
    api<PublicSettings>("/api/settings")
      .then(setSettings)
      .catch(() => undefined);
  }, []);

  async function start(text = topic) {
    if (!text.trim() || starting) return;
    setStarting(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ kind, topic: text.trim() }),
      });
      try {
        sessionStorage.setItem(START_KEY(id), text.trim());
      } catch {
        // the session page will ask for the opening message instead
      }
      router.push(`/session/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  }

  const copy = PROMPTS[kind];
  const ready = providerReady(settings);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-[1100px] px-4 pb-24 sm:px-6">
        <section className="pb-14 pt-16 sm:pt-24">
          <div
            role="tablist"
            aria-label="Session type"
            className="mb-6 inline-flex rounded-lg border border-rule p-0.5 font-sans text-sm"
          >
            {(["teach", "practice"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={clsx(
                  "rounded-md px-3.5 py-1.5",
                  kind === k ? "bg-ink text-paper" : "text-muted hover:text-ink",
                )}
              >
                {k === "teach" ? "Learn" : "Practise"}
              </button>
            ))}
          </div>

          <h1 className="max-w-[18ch] font-serif text-[2.6rem] leading-[1.08] tracking-tight sm:text-[3.6rem]">
            {copy.title}
          </h1>

          <form
            className="mt-8 max-w-[46rem] rounded-xl border border-rule bg-surface p-2 shadow-[0_10px_40px_-24px_rgba(20,24,40,0.45)] focus-within:border-accent"
            onSubmit={(e) => {
              e.preventDefault();
              void start();
            }}
          >
            <textarea
              rows={3}
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void start();
                }
              }}
              placeholder={copy.placeholder}
              aria-label={copy.title}
              className="w-full resize-none bg-transparent px-3 py-2 font-serif text-xl leading-snug text-ink placeholder:text-faint focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <p className="font-sans text-xs text-faint">
                {kind === "teach"
                  ? "It will find what you already know before it teaches anything."
                  : "Problems never name the idea they need."}
              </p>
              <button
                type="submit"
                disabled={!topic.trim() || starting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 font-sans text-sm font-medium text-accent-ink disabled:opacity-40"
              >
                {starting ? "Starting…" : kind === "teach" ? "Start learning" : "Start practising"}
                <ArrowUp size={15} />
              </button>
            </div>
          </form>

          <div className="mt-4 flex max-w-[46rem] flex-wrap gap-2 font-sans text-sm">
            {copy.examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setTopic(ex)}
                className="rounded-full border border-rule px-3 py-1 text-muted hover:border-faint hover:text-ink"
              >
                {ex}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-4 font-sans text-sm text-miss">
              {error}
            </p>
          )}
          {!ready && (
            <p className="mt-6 max-w-[46rem] rounded-md border border-unsure/40 bg-unsure-soft px-4 py-3 font-sans text-sm">
              No model is connected yet. Add an API key in{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              , or switch to demo mode there to try a scripted lesson without one.
            </p>
          )}
        </section>

        <section aria-labelledby="recent" className="border-t border-rule pt-8">
          <div className="flex items-baseline justify-between">
            <h2 id="recent" className="font-sans text-sm font-medium">
              Your sessions
            </h2>
            <Link href="/graph" className="font-sans text-sm text-muted hover:text-ink">
              Open the knowledge graph
            </Link>
          </div>
          {sessions === null ? (
            <div className="mt-4 h-20 animate-pulse rounded bg-sunken" />
          ) : sessions.length === 0 ? (
            <p className="mt-4 max-w-prose font-sans text-sm text-muted">
              Nothing yet. Your sessions are saved on this machine, in{" "}
              <code className="rounded bg-sunken px-1">.aula/</code>, as plain files you can read.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-rule">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/session/${s.id}`}
                    className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-0.5 py-3.5 sm:grid-cols-[1fr_9rem_7rem]"
                  >
                    <span className="truncate font-serif text-lg group-hover:text-accent">{s.title}</span>
                    <span className="hidden font-sans text-sm text-muted sm:block">
                      {s.kind === "practice" ? "Practice" : s.phase === "probe" ? "Probing" : "Teaching"}
                      {s.answered > 0 && ` · ${s.correct}/${s.answered}`}
                    </span>
                    <span className="text-right font-sans text-sm text-faint">{relative(s.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
