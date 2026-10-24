/**
 * The data model. Everything aula persists is one of these shapes, written as
 * plain JSON so the learner can read, back up and diff their own record.
 *
 * Messages are provider-neutral. Assistant turns additionally keep the
 * provider's raw content (`raw`) so it can be replayed byte-for-byte on the
 * next request — thinking blocks, for instance, must be passed back unchanged.
 */

export type SessionKind = "teach" | "practice";
export type Phase = "probe" | "teach";

export type ProviderId = "anthropic" | "openai" | "mock";

// ── transcript ──────────────────────────────────────────────────────────────

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolCallBlock {
  type: "tool_call";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface SearchBlock {
  type: "search";
  query: string;
  sources: { title: string; url: string }[];
}

export type AssistantBlock = TextBlock | ToolCallBlock | SearchBlock;

export interface UserMessage {
  id: string;
  role: "user";
  ts: number;
  text: string;
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  ts: number;
  blocks: AssistantBlock[];
  /** Provider-native content, replayed verbatim to the same provider. */
  raw?: { provider: ProviderId; content: unknown };
}

export interface ToolResult {
  callId: string;
  name: string;
  /** What the model reads. */
  output: string;
  /** What the UI and the export read. */
  details?: ToolDetails;
  isError?: boolean;
}

export interface ToolMessage {
  id: string;
  role: "tool";
  ts: number;
  results: ToolResult[];
}

export type Message = UserMessage | AssistantMessage | ToolMessage;

// ── learner answers ─────────────────────────────────────────────────────────

/** The option order the learner actually saw. Indices point into `options`. */
export interface QuizAnswer {
  kind: "quiz";
  role: QuizRole;
  question: string;
  options: string[];
  /** Index (in display order) of the correct option. */
  correctIndex: number;
  /** Index the learner picked, or null for "I don't know". */
  chosenIndex: number | null;
  dontKnow: boolean;
  correct: boolean;
  /** Self-reported probability (0–100) that the pick is right. */
  confidence?: number;
  /** The learner thinking out loud. */
  thinking?: string;
  explanation: string;
}

export interface AskAnswer {
  kind: "ask";
  question: string;
  text: string;
}

export interface PlanAnswer {
  kind: "plan";
  approved: boolean;
  feedback?: string;
}

export interface ProblemAnswer {
  kind: "problem";
  statement: string;
  attempt: string;
  confidence?: number;
  gaveUp: boolean;
}

export interface ProgressDetails {
  kind: "progress";
  current?: string;
  done: string[];
}

export type ToolDetails =
  | QuizAnswer
  | AskAnswer
  | PlanAnswer
  | ProblemAnswer
  | ProgressDetails;

export type QuizRole = "probe" | "predict" | "check";

/** What the learner submits for a pending interactive tool call. */
export type LearnerResponse =
  | {
      callId: string;
      kind: "quiz";
      chosenIndex: number | null;
      confidence?: number;
      thinking?: string;
    }
  | { callId: string; kind: "ask"; text: string }
  | { callId: string; kind: "plan"; approved: boolean; feedback?: string }
  | {
      callId: string;
      kind: "problem";
      attempt: string;
      confidence?: number;
      gaveUp?: boolean;
    };

// ── plan ────────────────────────────────────────────────────────────────────

export interface PlanNode {
  id: string;
  label: string;
  /** Foundations are accepted as-is; everything else is derived. */
  foundation: boolean;
}

export interface PlanEdge {
  from: string;
  to: string;
}

export interface Plan {
  approach: string;
  goal: string;
  nodes: PlanNode[];
  edges: PlanEdge[];
  revision: number;
}

export type NodeStatus = "done" | "current" | "next" | "upcoming";

// ── session ─────────────────────────────────────────────────────────────────

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface Session {
  version: 1;
  id: string;
  title: string;
  kind: SessionKind;
  createdAt: string;
  updatedAt: string;
  provider: ProviderId;
  model: string;
  phase: Phase;
  plan?: Plan;
  progress: { current?: string; done: string[] };
  messages: Message[];
  usage: Usage;
  /** Set once the session has been folded into the knowledge graph. */
  extractedAt?: string;
  /** Path of the Obsidian note this session was last exported to. */
  exportedTo?: string;
}

export type SessionSummary = Pick<
  Session,
  "id" | "title" | "kind" | "createdAt" | "updatedAt" | "phase" | "model"
> & { answered: number; correct: number };

// ── knowledge graph ─────────────────────────────────────────────────────────

export type Understanding =
  | "solid"
  | "shaky"
  | "accepted"
  | "resisted"
  | "not yet engaged";

export interface Proposition {
  id: string;
  /** Short handle, like a glossary headword. */
  name: string;
  /** The claim at full precision. */
  statement: string;
  aliases: string[];
  sources: { sessionId: string; at: string; understanding?: Understanding }[];
  createdAt: string;
}

/** Premises that jointly imply a conclusion. */
export interface Chain {
  id: string;
  premises: string[];
  conclusion: string;
  sources: { sessionId: string; at: string }[];
}

export interface Graph {
  propositions: Proposition[];
  chains: Chain[];
}

// ── settings ────────────────────────────────────────────────────────────────

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface Settings {
  provider: ProviderId;
  anthropic: { model: string; effort: Effort; webSearch: boolean };
  openai: { model: string; baseURL: string };
  teachingLanguage: string;
  keepTechnicalTermsInEnglish: boolean;
  defaultMode: "socratic" | "expository";
  /** Folder (relative to the repo, or absolute) that exports land in. */
  vaultDir: string;
}

/** Settings as the browser sees them: keys are never sent, only whether set. */
export interface PublicSettings extends Settings {
  keys: { anthropic: boolean; openai: boolean };
}
