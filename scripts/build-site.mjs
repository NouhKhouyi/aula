// Assembles the landing page into _site/, exactly as the Pages workflow does.
// Open _site/index.html in a browser to preview it.
import { cp, mkdir, readdir, rm } from "node:fs/promises";

const out = "_site";
await rm(out, { recursive: true, force: true });
await mkdir(`${out}/assets`, { recursive: true });
await cp("site/index.html", `${out}/index.html`);
for (const file of await readdir("docs/assets")) {
  if (file.endsWith(".png") || file === "icon.svg") await cp(`docs/assets/${file}`, `${out}/assets/${file}`);
}
console.log(`Site assembled in ${out}/ — open ${out}/index.html`);
