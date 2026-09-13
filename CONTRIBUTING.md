# Contributing to aula

Thanks for looking. This is a small, opinionated project and contributions are
genuinely welcome — especially the unglamorous ones.

## What this project is (and isn't)

`aula` is **the vault, the cross-agent instruction layer and the documentation**.

The **pedagogy** — probe → plan → teach, the dependency map, the quiz
construction rules — originates in
[`amosblomqvist/learn`](https://github.com/amosblomqvist/learn). `AGENTS.md`
restates it so that agents other than `pi` can follow it, but improvements to
*how it teaches* are best raised upstream, where they help everyone.

So, roughly:

| Belongs here | Belongs upstream |
|---|---|
| Support for another agent | Changes to the teaching philosophy |
| Vault layout, Obsidian config, templates | The `quiz` / `md-log` extensions |
| Setup scripts, platform fixes | The `teach` and `visualize` skills |
| Docs, translations, examples | Subagent definitions |

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

**4. Platform fixes.** Especially anything that makes the full subagent /
rendered-diagram pipeline work somewhere it currently doesn't.

## Ground rules

- **Never commit anything from `Lessons/`, `Material/` or `viz/`.** They are
  git-ignored for a reason: they fill with personal notes and copyrighted
  textbooks. If a PR touches them, it will be closed.
- **Never vendor `.pi/`.** Upstream carries no license; it is cloned, never
  redistributed.
- **Prose is the product.** `AGENTS.md` is the most important file in this repo
  and it is entirely prose. Edits to it get read closely. Wrap at 80 columns,
  match the existing register, and be concrete — vague instructions produce
  vague teaching.
- **Test by studying.** If you change the instruction layer, run one real
  session against it before opening the PR, and say in the description what you
  studied and what changed.

## Practical

```bash
git clone https://github.com/<you>/aula
cd aula
./scripts/setup.sh --skip-teaching-system
```

There is no build and no test suite. CI checks markdown formatting and that
links resolve:

```bash
npx markdownlint-cli2 "**/*.md"
npx lychee --no-progress .
```

Commits: plain, imperative, one concern each. No convention enforced.

## Code of conduct

Be decent. Full text in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Contributions are licensed under the [MIT License](LICENSE), same as the project.
