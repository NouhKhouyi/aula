import { promises as fs } from "node:fs";
import path from "node:path";
import { EMPTY_GRAPH } from "../core/graph";
import { isSafeId } from "../core/ids";
import { summarize } from "../core/transcript";
import type {
  Graph,
  PublicSettings,
  Session,
  SessionSummary,
  Settings,
} from "../core/types";
import { paths } from "./paths";

/**
 * File-backed persistence. Every write goes to a temporary file first and is
 * renamed into place, so a crash never leaves a half-written record.
 */

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

// ── settings ────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  provider: "anthropic",
  anthropic: { model: "claude-opus-5-5", effort: "high", webSearch: true },
  openai: { model: "", baseURL: "https://api.openai.com/v1" },
  teachingLanguage: "English",
  keepTechnicalTermsInEnglish: true,
  defaultMode: "socratic",
  vaultDir: "Lessons",
};

export async function getSettings(): Promise<Settings> {
  const stored = (await readJson<Partial<Settings>>(paths.settings())) ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    anthropic: { ...DEFAULT_SETTINGS.anthropic, ...stored.anthropic },
    openai: { ...DEFAULT_SETTINGS.openai, ...stored.openai },
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJsonAtomic(paths.settings(), settings);
}

export interface Secrets {
  anthropic?: string;
  openai?: string;
}

/** Keys from the secrets file, falling back to the usual environment variables. */
export async function getSecrets(): Promise<Secrets> {
  const stored = (await readJson<Secrets>(paths.secrets())) ?? {};
  return {
    anthropic: stored.anthropic || process.env.ANTHROPIC_API_KEY || undefined,
    openai: stored.openai || process.env.OPENAI_API_KEY || undefined,
  };
}

export async function saveSecrets(update: Secrets): Promise<void> {
  const stored = (await readJson<Secrets>(paths.secrets())) ?? {};
  const next: Secrets = { ...stored };
  for (const key of ["anthropic", "openai"] as const) {
    if (update[key] === undefined) continue;
    if (update[key] === "") delete next[key];
    else next[key] = update[key];
  }
  await writeJsonAtomic(paths.secrets(), next);
  if (process.platform !== "win32") await fs.chmod(paths.secrets(), 0o600);
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const [settings, secrets] = await Promise.all([getSettings(), getSecrets()]);
  return { ...settings, keys: { anthropic: !!secrets.anthropic, openai: !!secrets.openai } };
}

// ── sessions ────────────────────────────────────────────────────────────────

export async function getSession(id: string): Promise<Session | undefined> {
  if (!isSafeId(id)) return undefined;
  return readJson<Session>(paths.session(id));
}

export async function saveSession(session: Session): Promise<void> {
  if (!isSafeId(session.id)) throw new Error(`Unsafe session id: ${session.id}`);
  session.updatedAt = new Date().toISOString();
  await writeJsonAtomic(paths.session(session.id), session);
}

export async function deleteSession(id: string): Promise<boolean> {
  if (!isSafeId(id)) return false;
  try {
    await fs.unlink(paths.session(id));
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

export async function listSessions(): Promise<SessionSummary[]> {
  let files: string[];
  try {
    files = await fs.readdir(paths.sessions());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const sessions = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => getSession(f.slice(0, -5)).catch(() => undefined)),
  );
  return sessions
    .filter((s): s is Session => !!s)
    .map(summarize)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ── graph ───────────────────────────────────────────────────────────────────

export async function getGraph(): Promise<Graph> {
  return (await readJson<Graph>(paths.graph())) ?? EMPTY_GRAPH;
}

export async function saveGraph(graph: Graph): Promise<void> {
  await writeJsonAtomic(paths.graph(), graph);
}

// ── locking ─────────────────────────────────────────────────────────────────

const locks = new Map<string, Promise<unknown>>();

/** Serialises work per key (one turn at a time per session). */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(fn);
  locks.set(key, run);
  try {
    return await run;
  } finally {
    if (locks.get(key) === run) locks.delete(key);
  }
}
