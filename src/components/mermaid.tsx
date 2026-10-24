"use client";

import { useEffect, useId, useState } from "react";
import { usePrefersDark } from "./theme";

type MermaidApi = typeof import("mermaid").default;
let loader: Promise<MermaidApi> | undefined;

function loadMermaid(): Promise<MermaidApi> {
  loader ??= import("mermaid").then((m) => m.default);
  return loader;
}

/** Renders a Mermaid diagram client-side; falls back to the source on error. */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const dark = usePrefersDark();
  const [state, setState] = useState<{ svg?: string; error?: string }>({});

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "neutral",
          securityLevel: "strict",
          fontFamily: "var(--font-plex), sans-serif",
        });
        const { svg } = await mermaid.render(`m${id}${dark ? "d" : "l"}`, chart);
        if (!cancelled) setState({ svg });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [chart, dark, id]);

  if (state.error) {
    return (
      <figure className="rounded-lg border border-rule bg-sunken p-3 font-sans text-sm">
        <figcaption className="mb-2 text-faint">This diagram could not be drawn.</figcaption>
        <pre className="overflow-x-auto whitespace-pre text-xs text-muted">{chart}</pre>
      </figure>
    );
  }
  if (!state.svg) {
    return <div className="h-24 animate-pulse rounded-lg bg-sunken" aria-label="Drawing diagram" />;
  }
  return (
    <figure
      className="my-2 flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
