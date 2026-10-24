"use client";

import clsx from "clsx";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { nodeStatuses } from "@/lib/core/plan";
import type { NodeStatus, PlanEdge, PlanNode } from "@/lib/core/types";

interface Props {
  nodes: PlanNode[];
  edges: PlanEdge[];
  goal: string;
  progress?: { current?: string; done: string[] };
  /** Draw statuses (a live lesson) or plain (a proposal). */
  live?: boolean;
}

const ROW = 78;
const NODE_H = 52;
const GAP = 10;

/** Longest path from a root, so every edge points one or more rows up. */
function levels(nodes: PlanNode[], edges: PlanEdge[]): Map<string, number> {
  const level = new Map(nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const e of edges) {
      const next = (level.get(e.from) ?? 0) + 1;
      if (next > (level.get(e.to) ?? 0)) {
        level.set(e.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return level;
}

interface Placed {
  node: PlanNode;
  x: number;
  y: number;
  w: number;
}

function layout(nodes: PlanNode[], edges: PlanEdge[], width: number): { placed: Map<string, Placed>; height: number } {
  const level = levels(nodes, edges);
  const depth = Math.max(0, ...level.values());
  const rows: PlanNode[][] = Array.from({ length: depth + 1 }, () => []);
  for (const n of nodes) rows[level.get(n.id) ?? 0].push(n);

  const placed = new Map<string, Placed>();
  const height = (depth + 1) * ROW;
  rows.forEach((row, l) => {
    // Order each row by the mean position of its prerequisites, to limit crossings.
    if (l > 0) {
      const centre = (n: PlanNode) => {
        const xs = edges.filter((e) => e.to === n.id).map((e) => placed.get(e.from)?.x ?? 0);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
      };
      row.sort((a, b) => centre(a) - centre(b));
    }
    const w = Math.min(176, (width - GAP * (row.length - 1)) / row.length);
    const total = w * row.length + GAP * (row.length - 1);
    const start = (width - total) / 2;
    row.forEach((node, i) => {
      // Bottom-to-top: foundations sit on the ground, the goal at the top.
      placed.set(node.id, { node, x: start + i * (w + GAP), y: height - (l + 1) * ROW + (ROW - NODE_H) / 2, w });
    });
  });
  return { placed, height };
}

const STATUS_CLASS: Record<NodeStatus | "plain", string> = {
  done: "border-accent/60 bg-accent-soft text-ink",
  current: "border-accent bg-accent text-accent-ink ring-4 ring-accent/20",
  next: "border-ink/70 bg-surface text-ink",
  upcoming: "border-dashed border-faint bg-surface text-muted",
  plain: "border-rule bg-surface text-ink",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  done: "landed",
  current: "being taught",
  next: "ready",
  upcoming: "later",
};

export function PlanMap({ nodes, edges, goal, progress, live = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { placed, height } = useMemo(() => layout(nodes, edges, width), [nodes, edges, width]);
  const statuses = useMemo(
    () => (live ? nodeStatuses({ nodes, edges }, progress ?? { done: [] }) : undefined),
    [live, nodes, edges, progress],
  );

  return (
    <div
      ref={ref}
      className="relative w-full"
      style={{ height }}
      role="list"
      aria-label="Lesson plan, foundations at the bottom"
    >
      <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
        <defs>
          <marker id="plan-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--faint)" />
          </marker>
        </defs>
        {edges.map((e) => {
          const a = placed.get(e.from);
          const b = placed.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + a.w / 2;
          const y1 = a.y;
          const x2 = b.x + b.w / 2;
          const y2 = b.y + NODE_H;
          const mid = (y1 + y2) / 2;
          const landed = statuses?.[e.from] === "done";
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2 + 2}`}
              fill="none"
              stroke={landed ? "var(--accent)" : "var(--faint)"}
              strokeWidth={landed ? 1.8 : 1.2}
              strokeDasharray={statuses && !landed ? "3 4" : undefined}
              markerEnd="url(#plan-arrow)"
            />
          );
        })}
      </svg>
      {[...placed.values()].map(({ node, x, y, w }) => {
        const status = statuses?.[node.id];
        return (
          <div
            key={node.id}
            role="listitem"
            title={status ? `${node.label} — ${STATUS_LABEL[status]}` : node.label}
            className={clsx(
              "absolute flex items-center justify-center rounded-lg border px-2 text-center font-sans text-[12.5px] leading-tight transition-colors",
              STATUS_CLASS[status ?? "plain"],
              node.id === goal && "border-solid font-semibold",
              node.id === goal && !status && "border-accent",
              node.id === goal && (status === "next" || status === "upcoming") && "border-accent/70 text-ink",
            )}
            style={{ left: x, top: y, width: w, height: NODE_H }}
          >
            <span className="line-clamp-3">{node.label}</span>
            {node.foundation && (
              <span
                aria-label="foundation"
                className="absolute inset-x-2 -bottom-[5px] h-[3px] rounded-full bg-learner"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PlanLegend({ live }: { live?: boolean }) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 font-sans text-xs text-faint">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-[3px] w-3 rounded-full bg-learner" /> foundation
      </span>
      {live && (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-accent/60 bg-accent-soft" /> landed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-accent" /> now
          </span>
        </>
      )}
    </p>
  );
}
