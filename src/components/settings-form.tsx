"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import type { Effort, PublicSettings } from "@/lib/core/types";
import { AppHeader } from "./app-header";
import { Button } from "./ui";

const CLAUDE_MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 — recommended" },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1 — most capable, slower, pricier" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — faster, cheaper" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — cheapest; weak at planning" },
];

const ENDPOINTS = [
  { label: "OpenAI", url: "https://api.openai.com/v1" },
  { label: "OpenRouter", url: "https://openrouter.ai/api/v1" },
  { label: "DeepSeek", url: "https://api.deepseek.com/v1" },
  { label: "Ollama (local)", url: "http://localhost:11434/v1" },
];

const EFFORTS: { id: Effort; label: string }[] = [
  { id: "medium", label: "Medium" },
  { id: "high", label: "High — recommended" },
  { id: "xhigh", label: "Extra high" },
  { id: "max", label: "Max" },
];

const field =
  "w-full rounded-md border border-rule bg-surface px-3 py-2 font-sans text-[15px] text-ink focus:border-accent focus:outline-none";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-rule py-8 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <h2 className="font-sans text-[15px] font-medium">{title}</h2>
        {hint && <p className="mt-1 font-sans text-sm leading-relaxed text-muted">{hint}</p>}
      </div>
      <div className="flex max-w-xl flex-col gap-4">{children}</div>
    </section>
  );
}

function Label({ text, children, note }: { text: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 font-sans text-sm">
      <span className="text-muted">{text}</span>
      {children}
      {note && <span className="text-xs text-faint">{note}</span>}
    </label>
  );
}

function KeyField({
  label,
  stored,
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  label: string;
  stored: boolean;
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  return (
    <Label
      text={label}
      note={
        stored
          ? "A key is saved. Type a new one to replace it."
          : "Stored only in .aula/secrets.json on this machine. Never sent to the browser."
      }
    >
      <div className="flex gap-2">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={stored ? "••••••••••••" : placeholder}
          className={field}
        />
        {stored && (
          <Button variant="danger" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
    </Label>
  );
}

export function SettingsForm() {
  const [s, setS] = useState<PublicSettings | null>(null);
  const [keys, setKeys] = useState<{ anthropic?: string; openai?: string }>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<PublicSettings>("/api/settings")
      .then(setS)
      .catch((e: Error) => setStatus({ ok: false, text: e.message }));
  }, []);

  if (!s) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-4xl px-4 py-16">
          <div className="h-40 animate-pulse rounded bg-sunken" />
        </main>
      </>
    );
  }

  const set = <K extends keyof PublicSettings>(key: K, value: PublicSettings[K]) => setS({ ...s, [key]: value });
  const customModel = !CLAUDE_MODELS.some((m) => m.id === s.anthropic.model);

  async function save(extraKeys = keys) {
    setSaving(true);
    setStatus(null);
    try {
      const { keys: _k, ...rest } = s!;
      const sentKeys = Object.fromEntries(Object.entries(extraKeys).filter(([, v]) => v !== undefined));
      const next = await api<PublicSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ ...rest, keys: sentKeys }),
      });
      setS(next);
      setKeys({});
      setStatus({ ok: true, text: "Settings saved." });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 pb-32 pt-12 sm:px-6">
        <h1 className="font-serif text-4xl tracking-tight">Settings</h1>
        <p className="mt-2 max-w-prose font-sans text-muted">
          aula runs on your machine and talks to the model provider you choose, with your own key. You pay the provider
          directly; nothing else is sent anywhere.
        </p>

        <Section
          title="Model"
          hint="Teaching quality is decided in planning, which needs strong reasoning. Use the most capable model you can."
        >
          <div role="radiogroup" aria-label="Provider" className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["anthropic", "Claude", "Anthropic API, with web search"],
                ["openai", "OpenAI-compatible", "OpenAI, OpenRouter, Ollama…"],
                ["mock", "Demo", "A scripted lesson, no key"],
              ] as const
            ).map(([id, title, sub]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={s.provider === id}
                onClick={() => set("provider", id)}
                className={clsx(
                  "rounded-lg border px-3 py-2.5 text-left font-sans",
                  s.provider === id ? "border-accent bg-accent-soft" : "border-rule hover:border-faint",
                )}
              >
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </button>
            ))}
          </div>

          {s.provider === "anthropic" && (
            <>
              <KeyField
                label="Anthropic API key"
                stored={s.keys.anthropic}
                value={keys.anthropic ?? ""}
                onChange={(v) => setKeys({ ...keys, anthropic: v })}
                onRemove={() => void save({ anthropic: "" })}
                placeholder="sk-ant-…"
              />
              <Label text="Model">
                <select
                  className={field}
                  value={customModel ? "custom" : s.anthropic.model}
                  onChange={(e) =>
                    set("anthropic", { ...s.anthropic, model: e.target.value === "custom" ? "" : e.target.value })
                  }
                >
                  {CLAUDE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                  <option value="custom">Another model id…</option>
                </select>
              </Label>
              {customModel && (
                <Label text="Model id">
                  <input
                    className={field}
                    value={s.anthropic.model}
                    onChange={(e) => set("anthropic", { ...s.anthropic, model: e.target.value })}
                    placeholder="claude-…"
                  />
                </Label>
              )}
              <Label text="Effort" note="How hard the model thinks before it speaks. Higher is slower and costs more.">
                <select
                  className={field}
                  value={s.anthropic.effort}
                  onChange={(e) => set("anthropic", { ...s.anthropic, effort: e.target.value as Effort })}
                >
                  {EFFORTS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </Label>
              <label className="flex items-start gap-2.5 font-sans text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-[var(--accent)]"
                  checked={s.anthropic.webSearch}
                  onChange={(e) => set("anthropic", { ...s.anthropic, webSearch: e.target.checked })}
                />
                <span>
                  Verify facts on the web
                  <span className="block text-xs text-faint">
                    The teacher checks anything it is unsure of before saying it. Strongly recommended.
                  </span>
                </span>
              </label>
            </>
          )}

          {s.provider === "openai" && (
            <>
              <Label text="Endpoint">
                <div className="flex flex-wrap gap-1.5">
                  {ENDPOINTS.map((ep) => (
                    <button
                      key={ep.url}
                      type="button"
                      onClick={() => set("openai", { ...s.openai, baseURL: ep.url })}
                      className={clsx(
                        "rounded-full border px-2.5 py-0.5 text-xs",
                        s.openai.baseURL === ep.url
                          ? "border-accent text-ink"
                          : "border-rule text-muted hover:text-ink",
                      )}
                    >
                      {ep.label}
                    </button>
                  ))}
                </div>
                <input
                  className={field}
                  value={s.openai.baseURL}
                  onChange={(e) => set("openai", { ...s.openai, baseURL: e.target.value })}
                />
              </Label>
              <KeyField
                label="API key"
                stored={s.keys.openai}
                value={keys.openai ?? ""}
                onChange={(v) => setKeys({ ...keys, openai: v })}
                onRemove={() => void save({ openai: "" })}
                placeholder="Leave empty for local servers"
              />
              <Label text="Model" note="The exact model id your endpoint expects. It must support tool calling.">
                <input
                  className={field}
                  value={s.openai.model}
                  onChange={(e) => set("openai", { ...s.openai, model: e.target.value })}
                  placeholder="e.g. a model id from your provider's list"
                />
              </Label>
              <p className="font-sans text-xs text-faint">
                Web search is only available with Claude. Here the teacher is told to flag anything it is working on
                from memory.
              </p>
            </>
          )}

          {s.provider === "mock" && (
            <p className="font-sans text-sm text-muted">
              Demo mode runs one scripted lesson — why the derivative of x² is 2x — so you can see the whole probe, plan
              and teach loop without a key.
            </p>
          )}
        </Section>

        <Section
          title="Teaching"
          hint="How lessons are taught. The pedagogy itself is in the system prompt and in AGENTS.md."
        >
          <Label text="Teach in" note="Any language the model speaks.">
            <input
              className={field}
              value={s.teachingLanguage}
              onChange={(e) => set("teachingLanguage", e.target.value)}
              list="languages"
            />
            <datalist id="languages">
              {["English", "Spanish", "Catalan", "French", "German", "Portuguese", "Italian", "Arabic"].map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Label>
          <label className="flex items-start gap-2.5 font-sans text-sm">
            <input
              type="checkbox"
              className="mt-1 accent-[var(--accent)]"
              checked={s.keepTechnicalTermsInEnglish}
              onChange={(e) => set("keepTechnicalTermsInEnglish", e.target.checked)}
            />
            <span>
              Keep technical terms in English
              <span className="block text-xs text-faint">
                Overfitting stays overfitting — you will meet it in English everywhere else.
              </span>
            </span>
          </label>
          <Label text="Default style">
            <select
              className={field}
              value={s.defaultMode}
              onChange={(e) => set("defaultMode", e.target.value as PublicSettings["defaultMode"])}
            >
              <option value="socratic">Socratic — you attempt each discovery first</option>
              <option value="expository">Expository — the teacher narrates the path</option>
            </select>
          </Label>
        </Section>

        <Section
          title="Obsidian vault"
          hint="Where “Save to Obsidian vault” writes lesson notes, with callouts, math and diagrams."
        >
          <Label text="Lessons folder" note="Relative to the aula folder, or an absolute path into any vault.">
            <input className={field} value={s.vaultDir} onChange={(e) => set("vaultDir", e.target.value)} />
          </Label>
        </Section>

        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-4 border-t border-rule bg-paper/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          {status && (
            <p role="status" className={clsx("font-sans text-sm", status.ok ? "text-correct" : "text-miss")}>
              {status.text}
            </p>
          )}
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </main>
    </>
  );
}
