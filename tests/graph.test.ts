import { describe, expect, it } from "vitest";
import { EMPTY_GRAPH, mergeExtraction, normalize, relevantPropositions } from "@/lib/core/graph";

const extraction = {
  propositions: [
    { name: "Slope", statement: "The slope of a line is rise over run.", understanding: "solid" as const },
    { name: "Derivative", statement: "A derivative is a limit of secant slopes.", understanding: "shaky" as const },
  ],
  chains: [{ premises: ["Slope"], conclusion: "Derivative" }],
};

describe("mergeExtraction", () => {
  it("adds propositions and chains with provenance", () => {
    const { graph, added, chains } = mergeExtraction(EMPTY_GRAPH, extraction, "s_1", "2026-01-01");
    expect(added).toBe(2);
    expect(chains).toBe(1);
    expect(graph.propositions[1].sources).toEqual([{ sessionId: "s_1", at: "2026-01-01", understanding: "shaky" }]);
    const [slope, derivative] = graph.propositions;
    expect(graph.chains[0]).toMatchObject({ premises: [slope.id], conclusion: derivative.id });
  });

  it("merges identical statements across sessions instead of duplicating", () => {
    const first = mergeExtraction(EMPTY_GRAPH, extraction, "s_1", "t1").graph;
    const again = {
      propositions: [{ name: "Gradient", statement: "the slope of a line is RISE over run", understanding: "solid" as const }],
      chains: [],
    };
    const { graph, added, updated } = mergeExtraction(first, again, "s_2", "t2");
    expect(added).toBe(0);
    expect(updated).toBe(1);
    expect(graph.propositions).toHaveLength(2);
    expect(graph.propositions[0].sources.map((s) => s.sessionId)).toEqual(["s_1", "s_2"]);
  });

  it("does not mutate its input", () => {
    const first = mergeExtraction(EMPTY_GRAPH, extraction, "s_1", "t1").graph;
    const snapshot = JSON.stringify(first);
    mergeExtraction(first, extraction, "s_2", "t2");
    expect(JSON.stringify(first)).toBe(snapshot);
  });

  it("drops chains that reference unknown or circular propositions", () => {
    const { chains } = mergeExtraction(
      EMPTY_GRAPH,
      { ...extraction, chains: [{ premises: ["Nope"], conclusion: "Slope" }, { premises: ["Slope"], conclusion: "Slope" }] },
      "s",
      "t",
    );
    expect(chains).toBe(0);
  });
});

describe("relevantPropositions", () => {
  it("ranks by term overlap", () => {
    const { graph } = mergeExtraction(EMPTY_GRAPH, extraction, "s", "t");
    expect(relevantPropositions(graph, "I want to understand derivatives and secant slopes")[0].name).toBe("Derivative");
    expect(relevantPropositions(graph, "Roman law")).toEqual([]);
  });

  it("normalises accents and punctuation", () => {
    expect(normalize("Probabilidad  CONDICIONADA, ¿qué?")).toBe("probabilidad condicionada que");
  });
});
