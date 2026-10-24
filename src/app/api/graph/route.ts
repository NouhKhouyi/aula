import { handle } from "@/lib/server/http";
import { getGraph, listSessions } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => {
    const [graph, sessions] = await Promise.all([getGraph(), listSessions()]);
    const titles = Object.fromEntries(sessions.map((s) => [s.id, s.title]));
    return Response.json({ ...graph, titles });
  });
}
