import { z } from "zod";
import { newId } from "@/lib/core/ids";
import { titleFromPrompt } from "@/lib/core/transcript";
import type { Session } from "@/lib/core/types";
import { handle, parseBody } from "@/lib/server/http";
import { getSettings, listSessions, saveSession } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => Response.json(await listSessions()));
}

const createSchema = z.object({
  kind: z.enum(["teach", "practice"]),
  topic: z.string().trim().min(1).max(20000),
  material: z.array(z.string().max(500)).max(20).optional(),
});

export function POST(request: Request) {
  return handle(async () => {
    const { kind, topic, material } = await parseBody(request, createSchema);
    const settings = await getSettings();
    const now = new Date().toISOString();
    const session: Session = {
      version: 1,
      id: newId("s"),
      title: (kind === "practice" ? "Practice: " : "") + titleFromPrompt(topic),
      kind,
      createdAt: now,
      updatedAt: now,
      provider: settings.provider,
      model:
        settings.provider === "anthropic"
          ? settings.anthropic.model
          : settings.provider === "openai"
            ? settings.openai.model
            : "demo",
      phase: kind === "teach" ? "probe" : "teach",
      progress: { done: [] },
      messages: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      ...(material?.length ? { material } : {}),
    };
    await saveSession(session);
    return Response.json({ id: session.id }, { status: 201 });
  });
}
