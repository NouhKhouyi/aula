import type { z } from "zod";
import type { ToolSpec } from "../../core/tools";
import type { AssistantMessage, Message, ProviderId, Usage } from "../../core/types";

export type StopReason = "end" | "tool_use" | "max_tokens" | "refusal";

export interface TurnRequest {
  system: string;
  messages: Message[];
  tools: ToolSpec[];
  webSearch: boolean;
  signal?: AbortSignal;
  onText: (delta: string) => void;
  /** Short, human-readable status: "Searching the web…". */
  onActivity?: (label: string | null) => void;
}

export interface TurnResult {
  message: Pick<AssistantMessage, "blocks" | "raw">;
  stop: StopReason;
  usage: Usage;
}

export interface JsonRequest<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}

export interface Provider {
  id: ProviderId;
  model: string;
  /** Whether the model can verify facts on the web from inside a turn. */
  canSearch: boolean;
  turn(req: TurnRequest): Promise<TurnResult>;
  json<T>(req: JsonRequest<T>): Promise<{ value: T; usage: Usage }>;
}

/** An error whose message is safe and useful to show the learner. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
