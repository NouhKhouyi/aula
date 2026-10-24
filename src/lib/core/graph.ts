import { newId } from "./ids";
import type { Chain, Graph, Proposition, Understanding } from "./types";

export interface ExtractedProposition {
  name: string;
  statement: string;
  understanding: Understanding;
}

export interface ExtractedChain {
  premises: string[];
  conclusion: string;
}

export interface Extraction {
  propositions: ExtractedProposition[];
  chains: ExtractedChain[];
}

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findExisting(graph: Graph, p: ExtractedProposition): Proposition | undefined {
  const statement = normalize(p.statement);
  return graph.propositions.find(
    (q) =>
      normalize(q.statement) === statement ||
      q.aliases.some((a) => normalize(a) === statement),
  );
}

/**
 * Folds one session's extraction into the graph. Identity is conservative:
 * a proposition merges only on an identical (normalised) statement or alias.
 * A duplicate is cheap to live with; a wrong merge corrupts the record.
 * Pure — returns a new graph and leaves the input untouched.
 */
export function mergeExtraction(
  graph: Graph,
  extraction: Extraction,
  sessionId: string,
  at: string,
): { graph: Graph; added: number; updated: number; chains: number } {
  const propositions = graph.propositions.map((p) => ({
    ...p,
    aliases: [...p.aliases],
    sources: [...p.sources],
  }));
  const next: Graph = { propositions, chains: graph.chains.map((c) => ({ ...c })) };
  const byName = new Map<string, string>();
  let added = 0;
  let updated = 0;

  for (const p of extraction.propositions) {
    if (!p.statement.trim() || !p.name.trim()) continue;
    const source = { sessionId, at, understanding: p.understanding };
    const existing = findExisting(next, p);
    if (existing) {
      if (!existing.sources.some((s) => s.sessionId === sessionId)) {
        existing.sources.push(source);
      }
      updated++;
      byName.set(normalize(p.name), existing.id);
      continue;
    }
    const created: Proposition = {
      id: newId("p"),
      name: p.name.trim(),
      statement: p.statement.trim(),
      aliases: [],
      sources: [source],
      createdAt: at,
    };
    next.propositions.push(created);
    byName.set(normalize(p.name), created.id);
    added++;
  }

  // Names referenced by chains may also be earlier propositions.
  for (const p of next.propositions) {
    if (!byName.has(normalize(p.name))) byName.set(normalize(p.name), p.id);
  }

  let chains = 0;
  for (const c of extraction.chains) {
    const premises = c.premises.map((n) => byName.get(normalize(n)));
    const conclusion = byName.get(normalize(c.conclusion));
    if (!conclusion || premises.length === 0 || premises.some((p) => !p)) continue;
    const ids = [...new Set(premises as string[])].sort();
    if (ids.includes(conclusion)) continue;
    const existing = next.chains.find(
      (x) => x.conclusion === conclusion && x.premises.join() === ids.join(),
    );
    if (existing) {
      if (!existing.sources.some((s) => s.sessionId === sessionId)) {
        existing.sources = [...existing.sources, { sessionId, at }];
      }
      continue;
    }
    const chain: Chain = {
      id: newId("c"),
      premises: ids,
      conclusion,
      sources: [{ sessionId, at }],
    };
    next.chains.push(chain);
    chains++;
  }

  return { graph: next, added, updated, chains };
}

const STOP = new Set(
  "a an the of to in on for and or is are be by with as at from that this it its de la el los las y o en un una que se del al por con para es son".split(
    " ",
  ),
);

function terms(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

/**
 * The propositions most related to a piece of text, by term overlap with
 * name, statement and aliases. Deliberately simple and deterministic; it only
 * has to pick a handful of candidates for the teacher to verify.
 */
export function relevantPropositions(graph: Graph, text: string, limit = 12): Proposition[] {
  const query = terms(text);
  if (query.size === 0) return [];
  const scored = graph.propositions
    .map((p) => {
      const t = terms(`${p.name} ${p.name} ${p.statement} ${p.aliases.join(" ")}`);
      let score = 0;
      for (const q of query) if (t.has(q)) score++;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.createdAt.localeCompare(b.p.createdAt));
  return scored.slice(0, limit).map((x) => x.p);
}

export const EMPTY_GRAPH: Graph = { propositions: [], chains: [] };
