"use client";

import clsx from "clsx";
import { ArrowUp, BookDown, Download, GitBranch, Search, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, streamTurn, type StreamEvent } from "@/lib/client/api";
import type { PlanToolInput, ProblemInput, QuizInput } from "@/lib/core/tools";
import { pendingCalls, resultsById } from "@/lib/core/transcript";
import type { LearnerResponse, Message, Session, ToolCallBlock, ToolResult } from "@/lib/core/types";
import { AppHeader } from "./app-header";
import { AskCard, PlanCard, ProblemCard } from "./instrument-cards";
import { Markdown } from "./markdown";
import { PlanLegend, PlanMap } from "./plan-map";
import { QuizCard } from "./quiz-card";
import { Button } from "./ui";

export const START_KEY = (id: string) => `aula-start-${id}`;

function upsert(messages: Message[], message: Message): Message[] {
  const i = messages.findIndex((m) => m.id === message.id);
  if (i === -1) return [...messages, message];
  const next = [...messages];
  next[i] = message;
  return next;
}

function time(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SessionView({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 4500);
  }, []);

  const send = useCallback(
    async (body: { text?: string; responses?: LearnerResponse[] }) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setStreaming("");
      const controller = new AbortController();
      abort.current = controller;
      try {
        await streamTurn(
          id,
          body,
          (event: StreamEvent) => {
            switch (event.type) {
              case "text":
                setStreaming((s) => s + event.delta);
                break;
              case "activity":
                setActivity(event.label);
                break;
              case "message":
                if (event.message.role === "assistant") setStreaming("");
                setSession((s) => (s ? { ...s, messages: upsert(s.messages, event.message) } : s));
                break;
              case "notice":
                flash(event.message);
                break;
              case "done":
                setSession(event.session);
                break;
              case "error":
                setError(event.message);
                break;
            }
          },
          controller.signal,
        );
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : String(err));
        }
        // Whatever was saved before the failure is the truth.
        api<Session>(`/api/sessions/${id}`)
          .then(setSession)
          .catch(() => undefined);
      } finally {
        setBusy(false);
        setActivity(null);
        setStreaming("");
        abort.current = null;
      }
    },
    [busy, id, flash],
  );

  useEffect(() => {
    api<Session>(`/api/sessions/${id}`)
      .then((s) => {
        setSession(s);
        if (started.current || s.messages.length > 0) return;
        let topic: string | null = null;
        try {
          topic = sessionStorage.getItem(START_KEY(id));
          sessionStorage.removeItem(START_KEY(id));
        } catch {
          // storage unavailable: the learner types the opening message instead
        }
        if (topic) {
          started.current = true;
          void send({ text: topic });
        }
      })
      .catch((err: Error) => setLoadError(err.message));
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Follow the lesson as it is written, unless the learner scrolled up to reread.
  useEffect(() => {
    const el = bottom.current;
    if (!el) return;
    const distance = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    if (distance < 260) el.scrollIntoView({ block: "end" });
  }, [streaming, session?.messages.length]);

  const results = useMemo(() => resultsById(session?.messages ?? []), [session]);
  const pending = useMemo(() => new Set(pendingCalls(session?.messages ?? []).map((c) => c.id)), [session]);
  const approvedAt = useMemo(
    () =>
      session?.messages.findIndex(
        (m) => m.role === "tool" && m.results.some((r) => r.details?.kind === "plan" && r.details.approved),
      ) ?? -1,
    [session],
  );

  if (loadError) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="font-serif text-2xl">This session could not be opened.</p>
          <p className="mt-2 text-muted">{loadError}</p>
          <Link href="/" className="mt-6 inline-block text-accent underline">
            Back to sessions
          </Link>
        </main>
      </>
    );
  }
  if (!session) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-6 w-2/3 animate-pulse rounded bg-sunken" />
          <div className="mt-6 h-32 animate-pulse rounded bg-sunken" />
        </main>
      </>
    );
  }

  const respond = (r: LearnerResponse) => void send({ responses: [r] });
  const awaiting = pending.size > 0;

  async function exportToVault() {
    try {
      const { path } = await api<{ path: string }>(`/api/sessions/${id}/export`, { method: "POST" });
      flash(`Saved to ${path}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function extract() {
    flash("Reading the session for your knowledge graph…");
    try {
      const r = await api<{ added: number; updated: number; chains: number }>(`/api/sessions/${id}/extract`, {
        method: "POST",
      });
      flash(`Knowledge graph: ${r.added} new, ${r.updated} seen again, ${r.chains} reasoning steps.`);
      setSession((s) => (s ? { ...s, extractedAt: new Date().toISOString() } : s));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this session? Your exported notes and knowledge graph are kept.")) return;
    await api(`/api/sessions/${id}`, { method: "DELETE" });
    router.push("/");
  }

  function renderCall(call: ToolCallBlock, result: ToolResult | undefined) {
    const active = pending.has(call.id) && !busy;
    const skipped = !!result && !result.details && !result.isError;
    if (result?.isError) return null; // the teacher's own mistake, already corrected
    let card: React.ReactNode = null;
    switch (call.name) {
      case "quiz":
        card = (
          <QuizCard
            callId={call.id}
            input={call.input as QuizInput}
            answer={result?.details?.kind === "quiz" ? result.details : undefined}
            active={active}
            collapsed={
              session!.kind === "teach" && session!.phase === "teach" && (call.input as QuizInput).role === "check"
            }
            onSubmit={respond}
          />
        );
        break;
      case "ask":
        card = (
          <AskCard
            callId={call.id}
            question={(call.input as { question: string }).question}
            answer={result?.details?.kind === "ask" ? result.details : undefined}
            active={active}
            onSubmit={respond}
          />
        );
        break;
      case "propose_plan":
        card = (
          <PlanCard
            callId={call.id}
            input={call.input as PlanToolInput}
            answer={result?.details?.kind === "plan" ? result.details : undefined}
            active={active}
            onSubmit={respond}
          />
        );
        break;
      case "pose_problem":
        card = (
          <ProblemCard
            callId={call.id}
            input={call.input as ProblemInput}
            answer={result?.details?.kind === "problem" ? result.details : undefined}
            active={active}
            onSubmit={respond}
          />
        );
        break;
      default:
        return null;
    }
    return (
      <div className={clsx("my-6", skipped && "opacity-60")}>
        {card}
        {skipped && <p className="mt-1 font-sans text-xs text-faint">Skipped — you wrote a message instead.</p>}
      </div>
    );
  }

  const plan = session.plan;
  const doneCount = plan ? plan.nodes.filter((n) => session.progress.done.includes(n.id)).length : 0;

  const panel = (
    <>
      {plan ? (
        <section>
          <h2 className="font-sans text-sm font-medium">The plan</h2>
          <p className="mt-0.5 font-sans text-xs text-muted">
            {doneCount} of {plan.nodes.length} landed · goal at the top
          </p>
          <div className="mt-4">
            <PlanMap nodes={plan.nodes} edges={plan.edges} goal={plan.goal} progress={session.progress} live />
          </div>
          <div className="mt-3">
            <PlanLegend live />
          </div>
        </section>
      ) : (
        <section className="font-sans text-sm text-muted">
          <h2 className="font-medium text-ink">{session.kind === "practice" ? "Practice" : "Finding your edge"}</h2>
          <p className="mt-1 leading-relaxed">
            {session.kind === "practice"
              ? "Problems that need the right idea to come to mind on its own. Show your working — partial attempts teach the coach the most."
              : "The teacher is probing where your understanding ends. Missing questions is the point, and “I don't know” is always a good answer. The plan appears here once it is approved."}
          </p>
        </section>
      )}

      <section className="flex flex-col items-start gap-0.5 border-t border-rule pt-4">
        <Button variant="quiet" onClick={exportToVault} className="px-2">
          <BookDown size={15} /> Save to Obsidian vault
        </Button>
        <a
          href={`/api/sessions/${id}/export`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 font-sans text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
        >
          <Download size={15} /> Download as Markdown
        </a>
        <Button variant="quiet" onClick={extract} disabled={busy || session.messages.length === 0} className="px-2">
          <GitBranch size={15} /> {session.extractedAt ? "Update knowledge graph" : "Add to knowledge graph"}
        </Button>
        <Button variant="danger" onClick={remove} className="px-2">
          <Trash2 size={15} /> Delete session
        </Button>
      </section>
    </>
  );

  return (
    <>
      <AppHeader>
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate font-serif text-lg">{session.title}</h1>
          <span className="hidden shrink-0 rounded-full border border-rule px-2 py-0.5 font-sans text-xs text-muted md:inline">
            {session.kind === "practice" ? "practice" : session.phase === "probe" ? "probing" : "teaching"}
          </span>
        </div>
      </AppHeader>

      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 pb-48 pt-8">
          <details className="mx-auto mb-6 max-w-[44rem] rounded-lg border border-rule bg-surface p-3 lg:hidden">
            <summary className="cursor-pointer font-sans text-sm text-muted">
              {plan ? `The plan · ${doneCount} of ${plan.nodes.length} landed` : "About this session"} and actions
            </summary>
            <div className="mt-4 flex flex-col gap-5">{panel}</div>
          </details>
          <article className="mx-auto max-w-[44rem]" aria-live="polite" aria-busy={busy}>
            {session.messages.length === 0 && !busy && (
              <p className="font-serif text-2xl text-muted">What do you want to understand? Write it below to begin.</p>
            )}
            {session.messages.map((m, index) => (
              <Fragment key={m.id}>
                {m.role === "user" && (
                  <aside className="my-6 border-l-[3px] border-learner bg-learner-soft/60 px-4 py-3">
                    <p className="font-sans text-xs text-learner">You · {time(m.ts)}</p>
                    <p className="mt-1 whitespace-pre-wrap font-sans text-[15.5px] leading-relaxed">{m.text}</p>
                  </aside>
                )}
                {m.role === "assistant" &&
                  m.blocks.map((b, i) => {
                    if (b.type === "text") return b.text.trim() ? <Markdown key={i}>{b.text}</Markdown> : null;
                    if (b.type === "search") {
                      return (
                        <details key={i} className="my-3 font-sans text-xs text-faint">
                          <summary className="inline-flex cursor-pointer items-center gap-1.5 hover:text-muted">
                            <Search size={12} /> Checked: {b.query || "a fact"}
                          </summary>
                          <ul className="mt-1 space-y-0.5 pl-5">
                            {b.sources.map((s) => (
                              <li key={s.url}>
                                <a
                                  className="underline hover:text-ink"
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                >
                                  {s.title || s.url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </details>
                      );
                    }
                    if (b.type === "tool_call") return <Fragment key={i}>{renderCall(b, results.get(b.id))}</Fragment>;
                    return null;
                  })}
                {index === approvedAt && (
                  <div className="my-10 flex items-center gap-3 font-sans text-xs text-faint" role="separator">
                    <span className="h-px flex-1 bg-rule" />
                    Teaching · {plan?.nodes.length ?? 0} steps to the goal
                    <span className="h-px flex-1 bg-rule" />
                  </div>
                )}
              </Fragment>
            ))}

            {busy && (
              <div className="mt-4">
                {streaming ? (
                  <div className="caret-host">
                    <Markdown>{streaming}</Markdown>
                  </div>
                ) : (
                  <p className="caret font-sans text-sm text-faint">{activity ?? "Thinking"}</p>
                )}
                {streaming && activity && <p className="mt-2 font-sans text-sm text-faint">{activity}</p>}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="my-6 rounded-md border border-miss/40 bg-miss-soft px-4 py-3 font-sans text-sm"
              >
                <p>{error}</p>
                <p className="mt-1 text-muted">
                  Nothing already said is lost. Check{" "}
                  <Link href="/settings" className="underline">
                    Settings
                  </Link>
                  , then send a message to continue.
                </p>
              </div>
            )}
            <div ref={bottom} />
          </article>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col gap-5 overflow-y-auto pb-8 pt-8">
            {panel}
            <p className="font-sans text-xs text-faint">
              {session.model} · {(session.usage.inputTokens / 1000).toFixed(1)}k in ·{" "}
              {(session.usage.outputTokens / 1000).toFixed(1)}k out
            </p>
          </div>
        </aside>
      </div>

      <Composer
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        awaiting={awaiting}
        onSend={(text) => {
          setDraft("");
          void send({ text });
        }}
        onStop={() => abort.current?.abort()}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 rounded-md bg-ink px-4 py-2 font-sans text-sm text-paper shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}

function Composer({
  draft,
  setDraft,
  busy,
  awaiting,
  onSend,
  onStop,
}: {
  draft: string;
  setDraft: (v: string) => void;
  busy: boolean;
  awaiting: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [draft]);

  const submit = () => {
    if (!busy && draft.trim()) onSend(draft.trim());
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-paper via-paper/95 to-transparent pb-4 pt-10">
      <div className="pointer-events-auto mx-auto grid max-w-[1400px] px-4 sm:px-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <form
          className="mx-auto flex w-full max-w-[44rem] items-end gap-2 rounded-xl border border-rule bg-surface p-2 shadow-[0_6px_24px_-12px_rgba(20,24,40,0.35)] focus-within:border-accent"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={ref}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              awaiting
                ? "Answer above — or interrupt with a question or your reasoning"
                : "Ask, push back, or think out loud"
            }
            aria-label="Message the teacher"
            className="max-h-60 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 font-sans text-[15px] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
          />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              title="Stop"
              className="grid size-10 place-items-center rounded-lg bg-sunken text-ink hover:bg-rule"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              title="Send (Enter)"
              className="grid size-10 place-items-center rounded-lg bg-accent text-accent-ink disabled:opacity-35"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
