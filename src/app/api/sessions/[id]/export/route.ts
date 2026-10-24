import { promises as fs } from "node:fs";
import path from "node:path";
import { slugTitle } from "@/lib/core/ids";
import { sessionToMarkdown } from "@/lib/core/markdown-export";
import { handle, jsonError } from "@/lib/server/http";
import { vaultDir } from "@/lib/server/paths";
import { getSession, getSettings, saveSession, withLock } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** GET: the note as Markdown (download). POST: write it into the vault. */
export function GET(_req: Request, ctx: RouteContext<"/api/sessions/[id]/export">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession(id);
    if (!session) return jsonError("Session not found.", 404);
    const name = `${slugTitle(session.title)}.md`;
    return new Response(sessionToMarkdown(session), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    });
  });
}

export function POST(_req: Request, ctx: RouteContext<"/api/sessions/[id]/export">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return withLock(id, async () => {
      const session = await getSession(id);
      if (!session) return jsonError("Session not found.", 404);
      const dir = vaultDir((await getSettings()).vaultDir);
      await fs.mkdir(dir, { recursive: true });

      // Re-exports overwrite the note this session wrote before, never another one.
      const preferred =
        session.exportedTo && path.dirname(session.exportedTo) === dir
          ? session.exportedTo
          : path.join(dir, `${slugTitle(session.title)}.md`);
      let file = preferred;
      for (let n = 2; file !== session.exportedTo; n++) {
        try {
          await fs.access(file);
        } catch {
          break;
        }
        file = path.join(dir, `${slugTitle(session.title)} (${n}).md`);
      }

      await fs.writeFile(file, sessionToMarkdown(session), "utf8");
      session.exportedTo = file;
      await saveSession(session);
      const relative = path.relative(process.cwd(), file);
      return Response.json({ path: relative && !relative.startsWith("..") ? relative : file });
    });
  });
}
