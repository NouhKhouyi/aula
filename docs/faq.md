# FAQ

## Why not just paste a good prompt into ChatGPT?

You can, and for a single question you should. The difference shows up over a
long topic, and it comes down to three things a chat window doesn't give you:

- **A process that runs whether or not you remember to ask for it.** Probe →
  plan → teach, the dependency map, the quiz-check after every node. A prompt
  decays over a long conversation; `AGENTS.md` is reloaded every session.
- **A rendered, persistent artefact.** The lesson ends up as a note in your
  vault, with real typeset math and a real drawn graph, linkable from your own
  notes, searchable next semester. Chat scrollback is not a study material.
- **Your own material in scope.** Your syllabus, your notation, your past exam —
  read from disk, not re-pasted every time.

If your agent can read files and you want the pedagogy without the vault, take
[`AGENTS.md`](../AGENTS.md) alone. That is a legitimate way to use this repo.

## Do I have to install `pi`?

No. `pi` is the reference path and gives you the graded-quiz popups and
automatic log mirroring, but the pedagogy lives in `AGENTS.md` as prose and works
on Claude Code, Codex and anything else that reads it. Run
`./scripts/setup.sh --skip-teaching-system` and skip `.pi/` entirely. See
[agents.md](agents.md).

## Do I have to use Obsidian?

Any markdown editor that renders LaTeX and Mermaid will do. Obsidian is the
recommendation because it does both **with no plugins**, has wikilinks for
connecting your own notes to lessons, and live-updates a file that is being
written underneath it — which is the entire point of the mirroring. VS Code with
a markdown preview works; you lose the graph view and the links.

## Why is `.pi/` git-ignored instead of included?

Two reasons. It is a separate upstream repository that should be updated with
`git pull`, and vendoring it would freeze it. And it carries **no LICENSE file**,
which under default copyright means all rights reserved by its author —
redistributing it is not mine to do. `aula` clones it. See
[Credits](../README.md#credits).

## It answered in the wrong language.

Set `teaching_language` in the config block at the top of
[`AGENTS.md`](../AGENTS.md) and restart the session (or `/reload` in `pi`). If
your agent caches instructions, start a fresh session.

## The quizzes feel too easy / it won't stop quizzing me.

Those are the same phenomenon. Phase 1 escalates until you miss something,
because the edge of your understanding is only located when it is bounded on
both sides. If you never miss, it hasn't found the edge yet and it will keep
climbing. Getting everything right is not a pass.

If it genuinely will not converge, say so — it may be probing the wrong strand
entirely, and telling it that is faster than enduring it.

## I lost my notes when I linked the log.

`/md-log` backfills: linking mid-session rewrites the file whole with the session
history. It is documented in [the guide](guide.md#the-correct-flow-the-order-matters)
and in the template, and it is the one destructive footgun in the system.

**Recovery:** Obsidian's **File recovery** core plugin keeps snapshots — right
click the note → *File recovery*. It is enabled in this vault's shipped config
for exactly this reason.

**Prevention:** link an *empty* file, before your first message, always. And keep
your own notes in `Lessons/<Topic> - my notes.md`, never in the log.

## Can I use this for something other than maths?

Yes. Nothing in the pedagogy is subject-specific — it is about dependency
structure, and every subject has one. It works best where there is a real graph
to uncover (physics, CS, economics, law, linguistics, music theory) and least
well on material that genuinely *is* a list to memorise (vocabulary,
anatomical names, dates). For those, use spaced repetition; this system has
nothing to add.

The LaTeX and Mermaid emphasis just falls away when the subject doesn't need it.

## How much does a session cost in tokens?

Meaningfully more than a chat, because Phase 2 deliberately thinks hard and the
accuracy rule triggers real web searches. Budget for it: a substantial topic is
a long session with a capable model. Using a cheap fast model to save money
defeats the entire design — Phase 2 is the highest-leverage step and it is
exactly the step a weak model does badly.

## Is my study data sent anywhere?

Only to whichever model provider you configured, like any agent session. `aula`
itself has no telemetry, no server and no network access of its own. `Lessons/`
and `Material/` are git-ignored, so nothing is published by accident.

## Can I contribute the pedagogy back upstream?

The pedagogy belongs to [`amosblomqvist/learn`](https://github.com/amosblomqvist/learn)
— improvements to *how it teaches* are best raised there. What belongs in `aula`
is the vault, the cross-agent adaptation layer, the docs and the tooling. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
