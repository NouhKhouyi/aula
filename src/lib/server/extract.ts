import { z } from "zod";
import { mergeExtraction } from "../core/graph";
import { EXTRACTION_PROMPT } from "../core/prompts";
import { transcriptText } from "../core/transcript";
import type { Graph, Session } from "../core/types";
import type { Provider } from "./providers/types";

export const extractionSchema = z.object({
  propositions: z.array(
    z.object({
      name: z.string(),
      statement: z.string(),
      understanding: z.enum(["solid", "shaky", "accepted", "resisted", "not yet engaged"]),
    }),
  ),
  chains: z.array(
    z.object({
      premises: z.array(z.string()),
      conclusion: z.string(),
    }),
  ),
});

/** Reads a session and folds what it established into the knowledge graph. */
export async function extractSession(
  session: Session,
  graph: Graph,
  provider: Provider,
  signal?: AbortSignal,
) {
  const transcript = transcriptText(session);
  if (!transcript.trim()) throw new Error("This session has nothing to extract yet.");
  const { value, usage } = await provider.json({
    system: EXTRACTION_PROMPT,
    user: `Session title: ${session.title}\n\n<transcript>\n${transcript}\n</transcript>`,
    schema: extractionSchema,
    signal,
  });
  const at = new Date().toISOString();
  const merged = mergeExtraction(graph, value, session.id, at);
  session.usage.inputTokens += usage.inputTokens;
  session.usage.outputTokens += usage.outputTokens;
  session.extractedAt = at;
  return merged;
}
