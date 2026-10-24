import { z } from "zod";
import { ProviderError } from "./providers/types";

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/** Parses a JSON body against a schema; throws a Response on failure. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw jsonError("Request body must be JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw jsonError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return parsed.data;
}

/** Maps anything thrown in a handler to a response the UI can show. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof Response) return err;
    return jsonError(errorMessage(err), err instanceof ProviderError ? (err.status ?? 502) : 500);
  });
}

export function errorMessage(err: unknown): string {
  if (err instanceof ProviderError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export const learnerResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    callId: z.string(),
    kind: z.literal("quiz"),
    chosenIndex: z.number().int().nullable(),
    confidence: z.number().min(0).max(100).optional(),
    thinking: z.string().max(20000).optional(),
  }),
  z.object({ callId: z.string(), kind: z.literal("ask"), text: z.string().min(1).max(20000) }),
  z.object({
    callId: z.string(),
    kind: z.literal("plan"),
    approved: z.boolean(),
    feedback: z.string().max(20000).optional(),
  }),
  z.object({
    callId: z.string(),
    kind: z.literal("problem"),
    attempt: z.string().max(40000),
    confidence: z.number().min(0).max(100).optional(),
    gaveUp: z.boolean().optional(),
  }),
]);

/** Raw provider content is internal; the browser gets the neutral transcript. */
export function forClient<T extends { messages: { role: string }[] }>(session: T): T {
  return {
    ...session,
    messages: session.messages.map((m) => (m.role === "assistant" ? { ...m, raw: undefined } : m)),
  };
}
