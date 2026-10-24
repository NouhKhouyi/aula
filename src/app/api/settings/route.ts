import { z } from "zod";
import { handle, parseBody } from "@/lib/server/http";
import { getPublicSettings, getSettings, saveSecrets, saveSettings } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => Response.json(await getPublicSettings()));
}

const updateSchema = z.object({
  provider: z.enum(["anthropic", "openai", "mock"]).optional(),
  anthropic: z
    .object({
      model: z.string().trim().min(1).max(100),
      effort: z.enum(["low", "medium", "high", "xhigh", "max"]),
      webSearch: z.boolean(),
    })
    .optional(),
  openai: z
    .object({
      model: z.string().trim().max(100),
      baseURL: z.url(),
    })
    .optional(),
  teachingLanguage: z.string().trim().min(1).max(60).optional(),
  keepTechnicalTermsInEnglish: z.boolean().optional(),
  defaultMode: z.enum(["socratic", "expository"]).optional(),
  vaultDir: z.string().trim().min(1).max(500).optional(),
  /** "" clears a stored key; omitted leaves it unchanged. */
  keys: z
    .object({ anthropic: z.string().trim().max(500).optional(), openai: z.string().trim().max(500).optional() })
    .optional(),
});

export function PUT(request: Request) {
  return handle(async () => {
    const { keys, ...update } = await parseBody(request, updateSchema);
    const current = await getSettings();
    await saveSettings({ ...current, ...update });
    if (keys) await saveSecrets(keys);
    return Response.json(await getPublicSettings());
  });
}
