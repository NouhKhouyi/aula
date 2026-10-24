import { describe, expect, it } from "vitest";
import { nodeStatuses, planToMermaid, topoOrder, validatePlan } from "@/lib/core/plan";

const plan = {
  approach: "x",
  goal: "g",
  nodes: [
    { id: "a", label: "A", foundation: true },
    { id: "b", label: "B", foundation: true },
    { id: "c", label: "C", foundation: false },
    { id: "g", label: "Goal", foundation: false },
  ],
  edges: [
    { from: "a", to: "c" },
    { from: "b", to: "c" },
    { from: "c", to: "g" },
  ],
};

describe("validatePlan", () => {
  it("accepts a sound plan", () => {
    expect(validatePlan(plan)).toEqual([]);
  });

  it("rejects cycles", () => {
    expect(validatePlan({ ...plan, edges: [...plan.edges, { from: "g", to: "a" }] })).toContain(
      "The plan contains a cycle.",
    );
  });

  it("requires roots to be foundations", () => {
    const nodes = plan.nodes.map((n) => (n.id === "a" ? { ...n, foundation: false } : n));
    expect(validatePlan({ ...plan, nodes }).join()).toMatch(/must be a foundation/);
  });

  it("rejects nodes off the path to the goal", () => {
    const p = { ...plan, nodes: [...plan.nodes, { id: "x", label: "Tangent", foundation: true }] };
    expect(validatePlan(p).join()).toMatch(/does not lead to the goal/);
  });

  it("reports unknown ids and a missing goal", () => {
    const problems = validatePlan({ ...plan, goal: "zz", edges: [{ from: "a", to: "q" }] });
    expect(problems.join()).toMatch(/Goal “zz”/);
    expect(problems.join()).toMatch(/unknown node “q”/);
  });
});

describe("topoOrder and statuses", () => {
  it("orders prerequisites first", () => {
    const order = topoOrder(plan)!;
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
    expect(order.at(-1)).toBe("g");
  });

  it("derives done / current / next / upcoming", () => {
    expect(nodeStatuses(plan, { current: "b", done: ["a"] })).toEqual({
      a: "done",
      b: "current",
      c: "upcoming",
      g: "upcoming",
    });
    expect(nodeStatuses(plan, { done: ["a", "b"] }).c).toBe("next");
  });

  it("renders Mermaid with safe ids", () => {
    const m = planToMermaid({ ...plan, nodes: [...plan.nodes, { id: "a-b", label: 'say "hi"', foundation: true }] });
    expect(m).toContain("flowchart BT");
    expect(m).toContain("n_a_b[\"say 'hi'\"]");
    expect(m).toContain('n_g(["Goal"])');
  });
});
