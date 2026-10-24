# Contributing to aula

Thanks for looking. This is a small, opinionated project and contributions are
genuinely welcome — especially the unglamorous ones.

## What this project is (and isn't)

`aula` is two things that share one pedagogy:

- **The app** (`src/`) — a local-first web app that runs the teacher against
  the model you choose, with graded quizzes, plans, practice and a knowledge
  graph.
- **The vault and instruction layer** (`AGENTS.md`, `Lessons/`, `scripts/`) —
  for studying with a terminal agent and reading lessons in Obsidian.

The **pedagogy** — probe → plan → teach, the dependency map, the quiz
construction rules — originates in
[`amosblomqvist/learn`](https://github.com/amosblomqvist/learn). Ideas about the
philosophy itself are worth raising there too, where they help everyone.

## What I'd most like

**1. Support for another agent.** Gemini CLI, Aider, Cline, Zed — anything with
a project-instructions file. See
[docs/agents.md § Adding support](docs/agents.md#adding-support-for-an-agent).
Four small pieces: a pointer file, a row in the table, a setup-script line, and
**one honest paragraph about where it broke down when you actually studied with
it**. That paragraph is the valuable part.

**2. Reports of where the pedagogy failed you.** The most useful issue anyone
can file, and the least likely to get filed, because it feels like reporting
your own failure. It isn't. Open a
[Session report](.github/ISSUE_TEMPLATE/session-report.yml) and say what topic,
what agent, and what went sideways — the probe never converged, a Phase 2 root
was clearly wrong, it drifted into summarising your notes, it hallucinated and
you caught it.

**3. Translations of the teaching layer.** `AGENTS.md` already has a
`teaching_language` setting, but a localised `AGENTS.<lang>.md` with idiomatic
phrasing works better than a config flag. Spanish, in particular, I can review.

**4. Code.** Bugs, accessibility, another provider, better rendering, faster
graph layout. Start from the [development guide](docs/development.md) and the
[architecture](docs/architecture.md). For anything large, open an issue first so
we can agree on the shape.

**5. Platform fixes.** Especially anything that makes the full subagent /
rendered-diagram pipeline work somewhere it currently doesn't.

## Ground rules

- **Never commit anything from `Lessons/`, `Material/` or `viz/`.** They are
  git-ignored for a reason: they fill with personal notes and copyrighted
  textbooks. If a PR touches them, it will be closed.
- **Never vendor `.pi/`.** Upstream carries no license; it is cloned, never
  redistributed.
- **Never commit `.aula/`.** It holds sessions and API keys.
- **Prose is the product.** The teacher's method lives in prose:
  `src/lib/core/prompts.ts` for the app and `AGENTS.md` for terminal agents.
  Edits to either get read closely. Keep the two in step, match the existing
  register, and be concrete — vague instructions produce vague teaching.
- **Test by studying.** If you change how it teaches, run one real session
  against it before opening the PR, and say in the description what you
  studied and what changed.

## Practical

```bash
git clone https://github.com/<you>/aula
cd aula
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run check                     # lint, typecheck, formatting, tests
npm run build
npx markdownlint-cli2 "**/*.md"   # if you touched docs
```

Tests are deterministic and need no API key; demo mode drives the real agent
loop. Add a test with any behaviour change.

Commits follow [Conventional Commits](https://www.conventionalcommits.org)
(`feat:`, `fix:`, `docs:`, `test:`, `chore:`), one concern each.

## Code of conduct

Be decent. Full text in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Contributions are licensed under the [MIT License](LICENSE), same as the project.
