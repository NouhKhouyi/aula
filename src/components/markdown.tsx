"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Mermaid } from "./mermaid";

const components: Components = {
  code({ className, children, ...props }) {
    const language = /language-(\w+)/.exec(className ?? "")?.[1];
    if (language === "mermaid") return <Mermaid chart={String(children).trim()} />;
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  // Mermaid renders its own block; don't wrap it in <pre>.
  pre({ children, node }) {
    const child = node?.children[0];
    const isMermaid =
      child?.type === "element" &&
      child.tagName === "code" &&
      String((child.properties?.className as string[] | undefined)?.join(" ") ?? "").includes("language-mermaid");
    return isMermaid ? <>{children}</> : <pre>{children}</pre>;
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  },
};

/** Markdown with GFM, LaTeX ($…$, $$…$$) and Mermaid blocks. */
export const Markdown = memo(function Markdown({
  children,
  className = "prose-lesson",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
