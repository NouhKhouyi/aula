import { z } from "zod";
import { runTurn, type AgentEvent } from "@/lib/server/agent";
import { errorMessage, forClient, handle, jsonError, learnerResponseSchema, parseBody } from "@/lib/server/http";
import { readMaterial } from "@/lib/server/material";
import { providerFor } from "@/lib/server/providers";
import { getGraph, getSession, getSettings, saveSession, withLock } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const turnSchema = z
  .object({
    text: z.string().max(40000).optional(),
    responses: z.array(learnerResponseSchema).max(10).optional(),
  })
  .refine((b) => !!b.text?.trim() || (b.responses?.length ?? 0) > 0, "Send a message or an answer.");

export type TurnStreamEvent = AgentEvent | { type: "done"; session: unknown } | { type: "error"; message: string };

/**
 * Runs one turn and streams it as newline-delimited JSON. The session is
 * persisted as each message lands, so a dropped connection loses nothing
 * already said; reloading shows the saved state.
 */
export function POST(request: Request, ctx: RouteContext<"/api/sessions/[id]/turn">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const input = await parseBody(request, turnSchema);
    if (!(await getSession(id))) return jsonError("Session not found.", 404);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: TurnStreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            // The client went away; the turn still completes and is saved.
          }
        };

        void withLock(id, async () => {
          const session = await getSession(id);
          if (!session) throw new Error("Session not found.");
          const settings = await getSettings();
          const [provider, graph, material] = await Promise.all([
            providerFor(settings),
            getGraph(),
            readMaterial(session.material ?? []),
          ]);
          try {
            await runTurn(session, input, {
              provider,
              settings,
              graph,
              material,
              signal: request.signal,
              persist: saveSession,
              emit: (event) =>
                send(
                  event.type === "message"
                    ? { ...event, message: forClient({ messages: [event.message] }).messages[0] }
                    : event,
                ),
            });
          } finally {
            await saveSession(session);
          }
          send({ type: "done", session: forClient(session) });
        })
          .catch((err: unknown) => {
            const aborted = err instanceof Error && (err.name === "AbortError" || err.name === "APIUserAbortError");
            send({ type: "error", message: aborted ? "Stopped." : errorMessage(err) });
          })
          .finally(() => {
            try {
              controller.close();
            } catch {
              // already closed
            }
          });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
