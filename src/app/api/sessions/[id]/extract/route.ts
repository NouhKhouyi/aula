import { extractSession } from "@/lib/server/extract";
import { handle, jsonError } from "@/lib/server/http";
import { providerFor } from "@/lib/server/providers";
import { getGraph, getSession, getSettings, saveGraph, saveSession, withLock } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Folds the session into the knowledge graph. */
export function POST(request: Request, ctx: RouteContext<"/api/sessions/[id]/extract">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return withLock(id, () =>
      withLock("graph", async () => {
        const session = await getSession(id);
        if (!session) return jsonError("Session not found.", 404);
        const settings = await getSettings();
        const provider = await providerFor(settings);
        const { graph, added, updated, chains } = await extractSession(
          session,
          await getGraph(),
          provider,
          request.signal,
        );
        await saveGraph(graph);
        await saveSession(session);
        return Response.json({ added, updated, chains });
      }),
    );
  });
}
