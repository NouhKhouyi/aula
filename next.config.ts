import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md in this repo is the tutor's instruction file for terminal
  // agents; `next dev` must not inject its own block into it.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
