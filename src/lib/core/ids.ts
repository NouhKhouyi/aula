/** Sortable, collision-resistant ids: `<prefix>_<time36><random>`. */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const bytes = new Uint8Array(5);
  globalThis.crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8);
  return `${prefix}_${time}${rand}`;
}

/** Ids are used in file names; reject anything that could escape a folder. */
export function isSafeId(id: string): boolean {
  return /^[a-z]+_[a-z0-9]{6,32}$/.test(id);
}

/** A file-name-safe slug that keeps accents, which Obsidian handles fine. */
export function slugTitle(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return cleaned || "Untitled lesson";
}
