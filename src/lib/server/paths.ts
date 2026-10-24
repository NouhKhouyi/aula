import path from "node:path";

/**
 * Where aula keeps its record. Defaults to `.aula/` in the project folder — a
 * dot folder, so Obsidian ignores it and git-ignore covers it. Override with
 * AULA_DATA_DIR to keep the record anywhere else.
 */
export function dataDir(): string {
  return path.resolve(process.env.AULA_DATA_DIR ?? path.join(process.cwd(), ".aula"));
}

export const paths = {
  settings: () => path.join(dataDir(), "settings.json"),
  secrets: () => path.join(dataDir(), "secrets.json"),
  sessions: () => path.join(dataDir(), "sessions"),
  session: (id: string) => path.join(dataDir(), "sessions", `${id}.json`),
  graph: () => path.join(dataDir(), "graph.json"),
};

/** Resolves the vault folder exports land in; relative paths are repo-relative. */
export function vaultDir(configured: string): string {
  return path.resolve(process.cwd(), configured);
}
