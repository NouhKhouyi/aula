"use client";

import clsx from "clsx";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import { Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { normalize } from "@/lib/core/graph";
import type { Graph, Proposition, Understanding } from "@/lib/core/types";
import { AppHeader } from "./app-header";
import { Button } from "./ui";

type GraphData = Graph & { titles: Record<string, string> };

interface View {
  x: number;
  y: number;
  k: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  p: Proposition;
  degree: number;
}

const UNDERSTANDING_COLOR: Record<Understanding, string> = {
  solid: "var(--accent)",
  accepted: "var(--learner)",
  shaky: "var(--unsure)",
  resisted: "var(--miss)",
  "not yet engaged": "var(--faint)",
};

/** Run the force layout to rest once, then freeze it: no idle animation. */
function layout(graph: Graph): { nodes: SimNode[]; links: { source: SimNode; target: SimNode }[] } {
  const degree = new Map<string, number>();
  const pairs: { source: string; target: string }[] = [];
  for (const c of graph.chains) {
    for (const p of c.premises) {
      pairs.push({ source: p, target: c.conclusion });
      degree.set(p, (degree.get(p) ?? 0) + 1);
      degree.set(c.conclusion, (degree.get(c.conclusion) ?? 0) + 1);
    }
  }
  const nodes: SimNode[] = graph.propositions.map((p, i) => ({
    id: p.id,
    p,
    degree: degree.get(p.id) ?? 0,
    // Deterministic start: a spiral, so the same graph always lands the same way.
    x: Math.cos(i * 2.4) * 12 * Math.sqrt(i + 1),
    y: Math.sin(i * 2.4) * 12 * Math.sqrt(i + 1),
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = pairs
    .filter((l) => byId.has(l.source) && byId.has(l.target))
    .map((l) => ({ source: byId.get(l.source)!, target: byId.get(l.target)! }));

  forceSimulation(nodes)
    .force("charge", forceManyBody().strength(-220))
    .force("link", forceLink(links).distance(70).strength(0.7))
    .force(
      "collide",
      forceCollide<SimNode>((n) => 10 + n.degree * 2),
    )
    .force("x", forceX().strength(0.04))
    .force("y", forceY().strength(0.04))
    .stop()
    .tick(300);
  return { nodes, links };
}

function latest(p: Proposition): Understanding | undefined {
  return p.sources.at(-1)?.understanding;
}

export function GraphView() {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /** Set once the learner pans or zooms; until then the view fits the graph. */
  const [manual, setManual] = useState<View | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ w: 800, h: 600 });

  const load = useCallback(() => {
    api<GraphData>("/api/graph")
      .then((g) => {
        setData(g);
        setManual(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [data]);

  const { nodes, links } = useMemo(() => (data ? layout(data) : { nodes: [], links: [] }), [data]);

  // Fit the frozen layout to the canvas.
  const fitted = useMemo<View>(() => {
    if (nodes.length === 0) return { x: size.w / 2, y: size.h / 2, k: 1 };
    const xs = nodes.map((n) => n.x!);
    const ys = nodes.map((n) => n.y!);
    const w = Math.max(...xs) - Math.min(...xs) + 160;
    const h = Math.max(...ys) - Math.min(...ys) + 160;
    const k = Math.min(2, Math.max(0.2, Math.min(size.w / w, size.h / h)));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    return { k, x: size.w / 2 - cx * k, y: size.h / 2 - cy * k };
  }, [nodes, size.w, size.h]);
  const view = manual ?? fitted;

  // Wheel zoom around the cursor. Non-passive, so the page does not scroll.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setManual((m) => {
        const v = m ?? fitted;
        const k = Math.min(4, Math.max(0.15, v.k * Math.exp(-e.deltaY * 0.0015)));
        return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data, fitted]);

  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q || !data) return null;
    return new Set(
      data.propositions
        .filter((p) => normalize(`${p.name} ${p.statement} ${p.aliases.join(" ")}`).includes(q))
        .map((p) => p.id),
    );
  }, [query, data]);

  const focus = hovered ?? selected;
  const neighbours = useMemo(() => {
    if (!focus) return null;
    const set = new Set([focus]);
    for (const l of links) {
      if (l.source.id === focus) set.add(l.target.id);
      if (l.target.id === focus) set.add(l.source.id);
    }
    return set;
  }, [focus, links]);

  const chosen = data?.propositions.find((p) => p.id === selected);
  const showAllLabels = view.k > 0.9 || nodes.length <= 30;

  async function removeProposition(id: string) {
    if (!window.confirm("Remove this proposition and the reasoning steps that use it?")) return;
    await api(`/api/graph/propositions/${id}`, { method: "DELETE" });
    setSelected(null);
    load();
  }

  return (
    <>
      <AppHeader>
        <div className="flex items-center justify-end">
          {data && data.propositions.length > 0 && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an idea"
              aria-label="Find an idea"
              className="w-full max-w-64 rounded-md border border-rule bg-surface px-3 py-1.5 font-sans text-sm focus:border-accent focus:outline-none"
            />
          )}
        </div>
      </AppHeader>
      {error && <p className="p-8 font-sans text-miss">{error}</p>}
      {data && data.propositions.length === 0 ? (
        <main className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
          <h1 className="font-serif text-4xl tracking-tight">Your knowledge graph is empty</h1>
          <p className="mt-4 font-sans leading-relaxed text-muted">
            Every idea a session establishes can join one graph that carries across sessions: propositions, and the
            reasoning steps that connect them. Future lessons read it to probe more precisely, and practice draws on it.
          </p>
          <p className="mt-3 font-sans leading-relaxed text-muted">
            Open a session and choose <span className="text-ink">Add to knowledge graph</span>.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-md bg-accent px-4 py-2 font-sans text-sm font-medium text-accent-ink"
          >
            Go to your sessions
          </Link>
        </main>
      ) : (
        <main className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
          <svg
            ref={svgRef}
            className={clsx("size-full touch-none select-none", dragging ? "cursor-grabbing" : "cursor-grab")}
            onPointerDown={(e) => {
              if ((e.target as Element).closest("[data-node]")) return;
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
              setDragging(true);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setManual({ k: view.k, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y });
            }}
            onPointerUp={() => {
              drag.current = null;
              setDragging(false);
            }}
            onClick={(e) => {
              if (!(e.target as Element).closest("[data-node]")) setSelected(null);
            }}
            role="img"
            aria-label={`Knowledge graph with ${nodes.length} ideas`}
          >
            <defs>
              <marker id="kg-arrow" viewBox="0 0 8 8" refX="15" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="var(--faint)" />
              </marker>
            </defs>
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {links.map((l, i) => {
                const lit = neighbours ? neighbours.has(l.source.id) && neighbours.has(l.target.id) : true;
                return (
                  <line
                    key={i}
                    x1={l.source.x}
                    y1={l.source.y}
                    x2={l.target.x}
                    y2={l.target.y}
                    stroke={lit && neighbours ? "var(--accent)" : "var(--faint)"}
                    strokeWidth={(lit && neighbours ? 1.6 : 1) / Math.sqrt(view.k)}
                    markerEnd="url(#kg-arrow)"
                    opacity={lit ? 0.75 : 0.25}
                  />
                );
              })}
              {nodes.map((n) => {
                const dim = (neighbours && !neighbours.has(n.id)) || (matches && !matches.has(n.id));
                const r = 5 + Math.min(6, n.degree);
                const u = latest(n.p);
                const label = showAllLabels || n.id === focus || matches?.has(n.id) || neighbours?.has(n.id);
                return (
                  <g
                    key={n.id}
                    data-node
                    transform={`translate(${n.x},${n.y})`}
                    opacity={dim ? 0.2 : 1}
                    className="cursor-pointer"
                    onPointerEnter={() => setHovered(n.id)}
                    onPointerLeave={() => setHovered(null)}
                    onClick={() => setSelected(n.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={n.p.name}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(n.id)}
                  >
                    <circle
                      r={r}
                      fill={selected === n.id ? "var(--accent)" : "var(--surface)"}
                      stroke={u ? UNDERSTANDING_COLOR[u] : "var(--muted)"}
                      strokeWidth={2.2}
                    />
                    {label && (
                      <text
                        y={r + 13 / view.k}
                        textAnchor="middle"
                        fontSize={12 / Math.max(view.k, 0.6)}
                        fill="var(--ink)"
                        className="pointer-events-none font-sans"
                        paintOrder="stroke"
                        stroke="var(--paper)"
                        strokeWidth={3 / view.k}
                      >
                        {n.p.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-paper/85 px-3 py-2 font-sans text-xs text-muted backdrop-blur">
            <span>
              {nodes.length} ideas · {links.length} links
            </span>
            {(Object.keys(UNDERSTANDING_COLOR) as Understanding[]).map((u) => (
              <span key={u} className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-full border-2" style={{ borderColor: UNDERSTANDING_COLOR[u] }} />
                {u}
              </span>
            ))}
          </div>

          {chosen && data && (
            <aside className="absolute inset-y-3 right-3 flex w-[min(380px,calc(100%-1.5rem))] flex-col overflow-y-auto rounded-xl border border-rule bg-surface p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl leading-tight">{chosen.name}</h2>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="rounded p-1 text-muted hover:bg-sunken"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mt-3 font-serif text-lg leading-relaxed">{chosen.statement}</p>

              <ChainList
                title="Follows from"
                ids={data.chains.filter((c) => c.conclusion === chosen.id).map((c) => c.premises)}
                graph={data}
                onPick={setSelected}
              />
              <ChainList
                title="Leads to"
                ids={data.chains.filter((c) => c.premises.includes(chosen.id)).map((c) => [c.conclusion])}
                graph={data}
                onPick={setSelected}
              />

              <h3 className="mt-6 font-sans text-sm font-medium">Where it came up</h3>
              <ul className="mt-2 space-y-1.5 font-sans text-sm">
                {chosen.sources.map((s) => (
                  <li key={s.sessionId} className="flex justify-between gap-3">
                    {data.titles[s.sessionId] ? (
                      <Link
                        href={`/session/${s.sessionId}`}
                        className="truncate text-accent underline-offset-2 hover:underline"
                      >
                        {data.titles[s.sessionId]}
                      </Link>
                    ) : (
                      <span className="truncate text-muted">Deleted session</span>
                    )}
                    {s.understanding && <span className="shrink-0 text-muted">{s.understanding}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-sans text-xs text-faint">
                How well you held it at the end of that session, judged from your answers and your own words. It is
                evidence, not a grade.
              </p>

              <div className="mt-auto pt-6">
                <Button variant="danger" className="px-2" onClick={() => void removeProposition(chosen.id)}>
                  <Trash2 size={14} /> Remove from graph
                </Button>
              </div>
            </aside>
          )}
        </main>
      )}
    </>
  );
}

function ChainList({
  title,
  ids,
  graph,
  onPick,
}: {
  title: string;
  ids: string[][];
  graph: Graph;
  onPick: (id: string) => void;
}) {
  if (ids.length === 0) return null;
  const name = (id: string) => graph.propositions.find((p) => p.id === id)?.name ?? "?";
  return (
    <>
      <h3 className="mt-6 font-sans text-sm font-medium">{title}</h3>
      <ul className="mt-2 space-y-1.5 font-sans text-sm">
        {ids.map((group, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1">
            {group.map((id, j) => (
              <span key={id} className="inline-flex items-center gap-1">
                {j > 0 && <span className="text-faint">+</span>}
                <button
                  onClick={() => onPick(id)}
                  className="rounded border border-rule px-1.5 py-0.5 hover:border-accent"
                >
                  {name(id)}
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
