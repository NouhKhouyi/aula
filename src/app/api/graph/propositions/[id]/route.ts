import { handle, jsonError } from "@/lib/server/http";
import { getGraph, saveGraph, withLock } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Removes a proposition and every chain that mentions it. */
export function DELETE(_req: Request, ctx: RouteContext<"/api/graph/propositions/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return withLock("graph", async () => {
      const graph = await getGraph();
      if (!graph.propositions.some((p) => p.id === id)) return jsonError("Not found.", 404);
      await saveGraph({
        propositions: graph.propositions.filter((p) => p.id !== id),
        chains: graph.chains.filter((c) => c.conclusion !== id && !c.premises.includes(id)),
      });
      return Response.json({ ok: true });
    });
  });
}
