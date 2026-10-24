import type { NodeStatus, Plan, PlanEdge, PlanNode } from "./types";

export interface PlanInput {
  approach: string;
  goal: string;
  nodes: PlanNode[];
  edges: PlanEdge[];
}

/**
 * Validates a plan as a DAG whose roots are foundations and whose goal is
 * reachable. Returns a list of problems, empty when the plan is sound. The
 * messages are written for the teacher, who gets them back as a tool error.
 */
export function validatePlan(plan: PlanInput): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const n of plan.nodes) {
    if (ids.has(n.id)) problems.push(`Duplicate node id “${n.id}”.`);
    ids.add(n.id);
  }
  if (plan.nodes.length === 0) problems.push("The plan has no nodes.");
  if (!ids.has(plan.goal)) problems.push(`Goal “${plan.goal}” is not a node.`);
  for (const e of plan.edges) {
    if (!ids.has(e.from)) problems.push(`Edge from unknown node “${e.from}”.`);
    if (!ids.has(e.to)) problems.push(`Edge to unknown node “${e.to}”.`);
    if (e.from === e.to) problems.push(`Node “${e.from}” depends on itself.`);
  }
  if (problems.length) return problems;

  if (topoOrder(plan) === null) problems.push("The plan contains a cycle.");

  const hasParent = new Set(plan.edges.map((e) => e.to));
  for (const n of plan.nodes) {
    if (!hasParent.has(n.id) && !n.foundation) {
      problems.push(
        `“${n.label}” has no prerequisites, so it must be a foundation — or something it derives from is missing.`,
      );
    }
  }

  const reach = ancestors(plan, plan.goal);
  for (const n of plan.nodes) {
    if (n.id !== plan.goal && !reach.has(n.id)) {
      problems.push(`“${n.label}” does not lead to the goal. Off-path nodes do not belong in the plan.`);
    }
  }
  return problems;
}

function ancestors(plan: PlanInput, id: string): Set<string> {
  const parents = new Map<string, string[]>();
  for (const e of plan.edges) {
    parents.set(e.to, [...(parents.get(e.to) ?? []), e.from]);
  }
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    for (const p of parents.get(stack.pop()!) ?? []) {
      if (!seen.has(p)) {
        seen.add(p);
        stack.push(p);
      }
    }
  }
  return seen;
}

/** Kahn's algorithm, stable with respect to node order. Null on a cycle. */
export function topoOrder(plan: Pick<Plan, "nodes" | "edges">): string[] | null {
  const indegree = new Map(plan.nodes.map((n) => [n.id, 0]));
  for (const e of plan.edges) indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  const queue = plan.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const e of plan.edges) {
      if (e.from !== id) continue;
      const d = indegree.get(e.to)! - 1;
      indegree.set(e.to, d);
      if (d === 0) queue.push(e.to);
    }
  }
  return order.length === plan.nodes.length ? order : null;
}

/** Status of every node given what is done and where the lesson is. */
export function nodeStatuses(
  plan: Pick<Plan, "nodes" | "edges">,
  progress: { current?: string; done: string[] },
): Record<string, NodeStatus> {
  const done = new Set(progress.done);
  const out: Record<string, NodeStatus> = {};
  for (const n of plan.nodes) {
    if (done.has(n.id)) out[n.id] = "done";
    else if (n.id === progress.current) out[n.id] = "current";
    else {
      const prereqs = plan.edges.filter((e) => e.to === n.id).map((e) => e.from);
      out[n.id] = prereqs.every((p) => done.has(p)) ? "next" : "upcoming";
    }
  }
  return out;
}

/** The plan as a Mermaid flowchart, for the Obsidian export. */
export function planToMermaid(plan: Pick<Plan, "nodes" | "edges" | "goal">): string {
  const safe = (id: string) => `n_${id.replace(/[^A-Za-z0-9_]/g, "_")}`;
  const label = (s: string) => s.replace(/"/g, "'");
  const lines = ["flowchart BT"];
  for (const n of plan.nodes) {
    const text = label(n.label);
    lines.push(
      n.id === plan.goal ? `    ${safe(n.id)}(["${text}"])` : `    ${safe(n.id)}["${text}"]`,
    );
  }
  for (const e of plan.edges) lines.push(`    ${safe(e.from)} --> ${safe(e.to)}`);
  lines.push(`    style ${safe(plan.goal)} fill:#7C3AED,color:#fff`);
  return lines.join("\n");
}
