import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * The learner's source material: syllabi, notes, past exams, converted
 * textbooks, kept in the vault's Material/ folder. Only text formats are
 * offered; PDFs must be converted first (see docs/material.md).
 */

const TEXT = new Set([".md", ".txt", ".csv", ".tex", ".tsv"]);
/** Per file and in total, so a whole textbook cannot swamp the context. */
export const MAX_FILE_CHARS = 120_000;
export const MAX_TOTAL_CHARS = 300_000;

export interface MaterialFile {
  name: string;
  size: number;
}

export function materialDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.AULA_MATERIAL_DIR ?? path.join(process.cwd(), "Material"));
}

export async function listMaterial(dir = materialDir()): Promise<MaterialFile[]> {
  const out: MaterialFile[] = [];
  async function walk(sub: string) {
    let entries;
    try {
      entries = await fs.readdir(path.join(dir, sub), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const rel = sub ? `${sub}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(rel);
      else if (TEXT.has(path.extname(e.name).toLowerCase()) && rel !== "README.md") {
        const stat = await fs.stat(path.join(dir, rel));
        out.push({ name: rel, size: stat.size });
      }
    }
  }
  await walk("");
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads the chosen files. Names must come from the listing — anything else,
 * including a path that tries to leave the folder, is ignored.
 */
export async function readMaterial(names: string[], dir = materialDir()): Promise<{ name: string; text: string }[]> {
  const allowed = new Set((await listMaterial(dir)).map((f) => f.name));
  const out: { name: string; text: string }[] = [];
  let total = 0;
  for (const name of names) {
    if (!allowed.has(name)) continue;
    const file = path.resolve(dir, name);
    if (!file.startsWith(path.resolve(dir) + path.sep)) continue;
    let text = await fs.readFile(file, "utf8");
    if (text.length > MAX_FILE_CHARS) {
      text = `${text.slice(0, MAX_FILE_CHARS)}\n\n[… truncated: the rest of this file was not included]`;
    }
    if (total + text.length > MAX_TOTAL_CHARS) break;
    total += text.length;
    out.push({ name, text });
  }
  return out;
}
