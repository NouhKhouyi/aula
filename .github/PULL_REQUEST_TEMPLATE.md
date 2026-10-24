## What this changes

<!-- One or two sentences. -->

## Why

<!-- What was wrong, or what became possible. -->

## If you changed how it teaches (`src/lib/core/prompts.ts`, `AGENTS.md`, a pointer file)

Prose changes here change how people get taught, so they need evidence rather
than review-by-reading.

- **What did you study to test it?**
- **What behaviour changed?**

## Checklist

- [ ] `npm run check` and `npm run build` pass
- [ ] Behaviour changes come with a test
- [ ] Nothing from `Lessons/`, `Material/` or `viz/` is committed
- [ ] `.pi/` is not vendored, and nothing from `.aula/` is committed
- [ ] Markdown wraps at 80 columns and matches the surrounding register
- [ ] Links resolve (`npx lychee --no-progress .`)
- [ ] If an agent was added: a row in `docs/agents.md`, a pointer file, and an
      honest note about what degrades
