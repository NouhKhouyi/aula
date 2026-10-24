# Development

## Setup

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. To work without spending tokens, choose **Demo**
in Settings: the scripted teacher exercises every instrument — questions,
quizzes, the plan, progress, practice and graph extraction.

Point `AULA_DATA_DIR` at a scratch folder to keep development data away from
your real record:

```bash
AULA_DATA_DIR=/tmp/aula-dev npm run dev
```

To review the interface with realistic content — a lesson in progress, a
practice round and a populated knowledge graph — write the sample record into
an empty folder and point the app at it:

```bash
AULA_DATA_DIR=/tmp/aula-showcase npm run showcase
AULA_DATA_DIR=/tmp/aula-showcase npm run dev
```

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Development server with hot reload. |
| `npm run build` / `npm start` | Production build and server. |
| `npm test` | The test suite. Deterministic: no model, no network, no key. |
| `npm run lint` | ESLint (Next.js core web vitals + TypeScript). |
| `npm run typecheck` | Generates route types, then `tsc --noEmit`. |
| `npm run format` | Prettier. `format:check` verifies without writing. |
| `npm run check` | Everything CI runs, except the build. |
| `npm run showcase` | Writes sample sessions and a graph into `AULA_DATA_DIR`. |

## Tests

Tests live in `tests/` and run with Vitest.

- **Core** — quiz shuffling and grading, plan validation and layout order,
  graph merging, Markdown export.
- **Agent** — a complete demo lesson driven through the real agent loop,
  including a rejected plan, skipped questions and practice, checking that
  every tool call ends with exactly one result.
- **Providers** — message conversion in both directions, and the Anthropic
  provider on the wire: a fake `fetch` checks the request a current model
  receives and parses a streamed turn.

## Changing how it teaches

The method is prose in [`src/lib/core/prompts.ts`](../src/lib/core/prompts.ts).
The terminal workflow's equivalent is [`AGENTS.md`](../AGENTS.md); keep the two
in step when you change the method itself.

Changes to teaching behaviour need evidence, not review-by-reading: say in the
pull request what you studied to test it and what changed.

## Adding a tool

1. Define its schema and description in `src/lib/core/tools.ts`, with
   `interactive` and the session kinds it belongs to.
2. If it is immediate, execute it in `runImmediateTools`
   (`src/lib/core/execute.ts`). If it is interactive, add its answer shape to
   `LearnerResponse` and `ToolDetails` in `types.ts`, handle it in
   `applyResponse`, and accept it in `learnerResponseSchema`
   (`src/lib/server/http.ts`).
3. Render it in `session-view.tsx` and export it in `markdown-export.ts`.
4. Tell the teacher when to use it in `prompts.ts`.
5. Teach the demo provider to call it, and cover it in `tests/agent.test.ts`.

## Adding a provider

Implement `Provider` (`src/lib/server/providers/types.ts`):

- `turn()` streams text through `onText` and returns the assistant blocks, the
  stop reason, usage and — if the provider needs replay — its raw content.
- `json()` returns a value validated against a Zod schema.

Convert the neutral transcript to the provider's format (see
`toAnthropicMessages` and `toOpenAIMessages`), map its errors to
`ProviderError` messages a learner can act on, register it in
`providers/index.ts`, and add it to Settings.

## Conventions

- Core stays pure: no `fs`, no `fetch`, no `Date.now()` in logic that the
  browser and server must agree on.
- Errors shown to learners say what happened and what to do.
- Markdown wraps at 80 columns; code is formatted by Prettier at 120.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org).
