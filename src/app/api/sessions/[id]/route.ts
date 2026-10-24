import { z } from "zod";
import { forClient, handle, jsonError, parseBody } from "@/lib/server/http";
import { deleteSession, getSession, saveSession, withLock } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export function GET(_req: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const session = await getSession(id);
    return session ? Response.json(forClient(session)) : jsonError("Session not found.", 404);
  });
}

const patchSchema = z.object({ title: z.string().trim().min(1).max(120) });

export function PATCH(request: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { title } = await parseBody(request, patchSchema);
    return withLock(id, async () => {
      const session = await getSession(id);
      if (!session) return jsonError("Session not found.", 404);
      session.title = title;
      await saveSession(session);
      return Response.json({ ok: true });
    });
  });
}

export function DELETE(_req: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return (await withLock(id, () => deleteSession(id)))
      ? Response.json({ ok: true })
      : jsonError("Session not found.", 404);
  });
}
