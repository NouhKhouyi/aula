# Agents

`aula` keeps its instructions in [`AGENTS.md`](../AGENTS.md), the cross-agent
convention. Most terminal agents load it automatically, with no configuration.

What differs between agents is not the pedagogy — that is plain prose, and any
capable model can follow it — but how much **interactive machinery** survives.

## Compatibility

| | [pi](#pi) | [Claude Code](#claude-code) | [Codex / Cursor / others](#codex-cursor-and-others) |
|---|:---:|:---:|:---:|
| Reads `AGENTS.md` automatically | ✅ | ✅ | ✅ |
| Graded quiz popup (shuffled, "I don't know", note field) | ✅ native | ➖ in-chat | ➖ in-chat |
| Open-question popup | ✅ native | ➖ in-chat | ➖ in-chat |
| Automatic verbatim session mirroring | ✅ `/md-log` | ✍️ agent-written | ✍️ agent-written |
| Web search for the accuracy rule | ✅ extension | ✅ built in | varies |
| Subagent for research | ✅ tmux only | ✅ | varies |
| Rendered-and-verified diagram images | ✅ macOS + tmux | ➖ inline Mermaid | ➖ inline Mermaid |

✅ native · ✍️ the agent does it by hand · ➖ degraded but working

**None of the degradations touch the pedagogy.** Probe → plan → teach, the
dependency map, the quiz construction rules and the accuracy rule are identical
everywhere, because they live in `AGENTS.md` as prose.

---

## pi

The reference path. [`earendil-works/pi`](https://github.com/earendil-works/pi)
is the agent the teaching system was written for.

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi install npm:@mariozechner/pi-web-access
./scripts/setup.sh          # or .\scripts\setup.ps1
```

Everything works: graded quiz popups, `/md-log` mirroring, the lot. Full
walkthrough in [the guide](guide.md#3-first-launch).

**Optional, for the complete system:** subagents via
[`pi-interactive-subagents`](https://github.com/amosblomqvist/pi-interactive-subagents).
It is **tmux-only**, so it needs macOS, Linux or WSL2 — see
[windows.md](windows.md). Without it you lose the `researcher` subagent and the
rendered-image visual pipeline; the main session does both jobs itself.

---

## Claude Code

Works out of the box. `AGENTS.md` is read automatically, and
[`CLAUDE.md`](../CLAUDE.md) points at it with the Claude-specific notes.

```bash
./scripts/setup.sh --skip-teaching-system
claude
```

You can skip the `.pi/` clone entirely — `AGENTS.md` carries the whole pedagogy
on its own.

**What is different:**

- **Quizzes are in-chat.** The agent writes the question into
  `Lessons/<Topic>.md` as a `> [!question] Quiz` callout — so you read it
  rendered in Obsidian — and you answer with a number in the terminal. The
  correct answer and explanation are appended only afterwards. Options are still
  shuffled and "I don't know" is still offered; the rules in `AGENTS.md` §2 are
  binding.
- **The log is written by the agent.** There is no `/md-log`, so no backfill
  hazard — but also no verbatim guarantee. Tell it up front if you want it
  appending after every exchange rather than at the end of a section.
- **Web search is built in**, so the accuracy rule needs no extra setup.
- **Subagents exist**, so you can ask it to delegate the Phase 2 topic sweep.

**Worth doing:** run it in plan mode for Phase 2, so the dependency map lands as
a plan you explicitly approve. That maps exactly onto the system's intended
checkpoint.

---

## Codex, Cursor and others

Anything that reads `AGENTS.md` works the same way as Claude Code: full
pedagogy, in-chat quizzes, agent-written log.

```bash
./scripts/setup.sh --skip-teaching-system
```

If your agent uses a different instruction filename, create it as a pointer to
`AGENTS.md` — the same one-paragraph shape as [`CLAUDE.md`](../CLAUDE.md).

Check it took by asking: *"What are your three teaching phases?"* The answer
should be **probe → plan → teach**. If it isn't, the file wasn't loaded.

---

## Adding support for an agent

This is the contribution I would most like to receive. What it involves:

1. **A pointer file** (`GEMINI.md`, `.cursorrules`, whatever the agent reads)
   that directs to `AGENTS.md` and lists the agent-specific deviations.
2. **A row in the table above** and a section in this file, honest about what
   degrades.
3. **A line in [`scripts/setup.ps1`](../scripts/setup.ps1) and
   [`setup.sh`](../scripts/setup.sh)** if there is anything to detect or install.
4. **One real session.** Study something with it for an hour and say in the PR
   where it broke down. That paragraph is worth more than the code.

See [CONTRIBUTING.md](../CONTRIBUTING.md).
