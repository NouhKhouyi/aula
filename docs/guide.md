# The aula guide

Everything you need to run this system. This note lives inside the vault, so
you can read it from Obsidian.

**Contents**

1. [What this actually is](#1-what-this-actually-is)
2. [Install](#2-install)
3. [First launch](#3-first-launch)
4. [How it teaches](#4-how-it-teaches)
5. [The tools you will see](#5-the-tools-you-will-see)
6. [Obsidian: the bridge](#6-obsidian-the-bridge)
7. [A session, start to finish](#7-a-session-start-to-finish)
8. [Command reference](#8-command-reference)
9. [Customising](#9-customising)
10. [The three things that decide whether this works](#10-the-three-things-that-decide-whether-this-works)

---

## 1. What this actually is

Two separate pieces, and confusing them will waste your afternoon.

**`aula`** — this repository. An Obsidian vault: a folder layout, an
instruction layer (`AGENTS.md`), a lesson template, setup scripts and these
docs. There is nothing here to *run*.

**The teaching system** — [`amosblomqvist/learn`](https://github.com/amosblomqvist/learn),
cloned into `.pi/` by the setup script. It is **not an application** and **not a
Claude Code plugin**. It is a configuration for [`pi`](https://github.com/earendil-works/pi),
a terminal agent. The repo *is* the `.pi` directory — that is why it gets cloned
under that name: `pi` looks for a `.pi` folder in the project and loads whatever
it finds inside.

Its four pieces:

| Piece | What it is |
|---|---|
| `.pi/skills/` | Markdown instructions the model loads and follows. The pedagogy lives here. |
| `.pi/extensions/` | TypeScript that adds real tools and commands to `pi`. |
| `.pi/agents/` | Subagent definitions. |
| `.pi/settings.json` | Project configuration. |

The important consequence: **the "system" is mostly very well-written text.**
The `teach` skill is ~18 KB of pedagogical instructions. Its power comes from
the model following them, not from code. If you want to change how it teaches,
you edit prose, not programs.

And the corollary that `aula` is built on: **if the pedagogy is just prose, any
capable agent can follow it.** That is why `AGENTS.md` restates it in full, and
why this vault works — with reduced machinery — on Claude Code, Codex and
anything else that reads `AGENTS.md`. See [agents.md](agents.md).

> [!warning] Licensing
> `amosblomqvist/learn` ships **no LICENSE file**, which under default copyright
> means all rights reserved by its author. `aula` therefore **clones** it and
> never vendors or redistributes it, and `.pi/` is git-ignored. Please respect
> that if you fork this repo.

---

## 2. Install

```bash
git clone https://github.com/NouhKhouyi/aula
cd aula
```

**Windows:**

```powershell
.\scripts\setup.ps1
```

**macOS / Linux / WSL:**

```bash
./scripts/setup.sh
```

The script checks `git`, `pdftotext`, `pi` and `tmux`, offers to clone the
teaching system into `.pi/`, and creates the vault folders.

Pass `-SkipTeachingSystem` / `--skip-teaching-system` if you only want the vault
and the `AGENTS.md` layer — that is the right choice if you are using Claude
Code or Codex and have no intention of installing `pi`.

### Installing `pi` (the reference path)

Only needed if you want the graded-quiz popups and automatic log mirroring.

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi install npm:@mariozechner/pi-web-access     # web search, for verification
```

`pi-web-access` is not optional in spirit: the accuracy rule is the backbone of
the whole system, and without search the agent is working from memory, which is
exactly where models invent.

### Getting `pdftotext`

You need it the first time you point the tutor at a PDF.

- **Windows:** it ships with Git for Windows — add `C:\Program Files\Git\mingw64\bin`
  to your PATH. Or `winget install --id oschwartz10612.Poppler`.
- **macOS:** `brew install poppler`
- **Debian/Ubuntu:** `sudo apt install poppler-utils`

---

## 3. First launch

Open a terminal in the vault folder and start your agent. With `pi`:

```console
pi
```

Then, in this order:

1. **Trust the project.** `pi` notices there is a `.pi/` with extensions (code it
   is about to execute) and asks permission. Accept. Run `/trust` once and
   restart to stop being asked.
2. **Authenticate:** `/login`, then pick a provider. A Claude Pro/Max, ChatGPT
   Plus/Pro or GitHub Copilot subscription works directly; otherwise use an API
   key.
3. **Pick the model:** `/model` (or `Ctrl+L`). With the model highlighted, press
   `Ctrl+S` to save it as the default. **This system demands strong
   reasoning** — Phase 2 is literally "think hard here". Use the most capable
   model you have access to, not the fastest.
4. **Check the startup header.** It should list the skills (`teach`,
   `visualize`) and the extensions (`quiz`, `ask-user-question`, `md-log`,
   `visual-tools`). If they are missing, you did not trust the project.

Quick check that extensions loaded: type `/md-log` with no arguments. It should
answer `Usage: /md-log <filepath>`. If the command does not exist, the extension
did not load.

With any other agent, just start it in this folder — it reads `AGENTS.md`
automatically. Confirm by asking it what its teaching phases are; it should
answer *probe → plan → teach*.

---

## 4. How it teaches

This is the part that actually matters. Worth understanding, because **you are
the other half of the system.**

### The core idea

Two brains can hold the same statements and answer the same questions. But one
stores **a pile of loose facts** and the other stores **a few core truths that
all those facts derive from.** That connection *is* understanding.

- Connected knowledge > disconnected knowledge
- A dependency graph > isolated nodes
- Understanding > memorising

Memorised facts rot. Understood ones do not, because their connections hold them
up. The feeling you are chasing is **the click**: the moment a pile of loose
facts collapses into a few generating ideas. Same information, far fewer moving
parts.

The mechanism that explains why it works: **a brain does not fully commit to a
fact if it does not know whether it is safe to pin down.** If something more
fundamental might contradict it later, committing is risky — it would force a
costly update — so the brain hedges and the fact never really lands. The two
principles remove that risk.

### Principle i — Unconditional truths first

Start from the floor: truths you can accept **as they stand, with no caveats**.
Not because bottom-up is the logically correct order, but because those are the
**easiest** to accept and pin. They are safe, so they land instantly and give
you the first firm ground.

A distinction the system is careful about, and which helps you follow it:

- **Unconditional truth** — you can take it at face value, no caveats. A
  property of *how the fact is held up*.
- **Axiom** — derives from nothing else. A property of *where it sits* in the
  graph (a root node).

They overlap but are not synonyms. Many unconditional truths do derive from
deeper things; they just don't need that derivation to be accepted. The system
defaults to "unconditional truth" and reserves "axiom" for what genuinely
bottoms out.

Especially powerful forms: **universal statements** ("every X is Y", "no X is
Y"), because they admit no exceptions to hedge against — and their special case,
the **atomic unit** ("ALL X happens by means of {\_\_\_\_}", e.g. "all
communication between computers happens by means of {sending packets}"). Also
**real definitions**, if they are genuine definitions and not a vague list of
properties in disguise.

**It will confirm the foundations before building.** If a core truth does not
strike you as obviously true, say so: the foundation needs fixing, not building
on.

### Principle ii — "How could I have discovered this myself?"

Facts feel arbitrary when you can see no reason they *had* to be that way. And a
brain will not commit to information that feels arbitrary. The fix: make it feel
**discovered, not decreed**.

Every step has to be **motivated** — why we are doing this, what problem brought
us here, why try *this* formula, why manipulate the equation *this* way. Nothing
appears out of nowhere. The declared reference is 3Blue1Brown.

This turns disconnected propositions into connected ones: it adds the **edges**
of the graph, where Principle i adds the **nodes**.

Two modes:

- **Socratic** — it poses the problem and lets you attempt the discovery before
  revealing it. More effort, much better retention. The default whenever you can
  reason it out.
- **Expository** — it narrates the motivated path, 3B1B style, with no back and
  forth. For topics beyond cold reasoning, or when you are low on energy.

Ask for either mode explicitly whenever you want it.

### The process: probe → plan → teach

The two principles are the *how*. This is the *when*. The three phases always
run in order; what scales with the topic is their *size*, not their *shape*.

#### Phase 1 — Probe

You cannot be taught in your zone of proximal development if nobody knows where
its borders are. Two separate unknowns, two tools:

**Your level, via quizzes.** This is *cartography*, not a test. It is looking for
the **edge** of your understanding, and the edge is only located when it is
**bounded on both sides**: something at that level you get right (a floor) and
something you get wrong or don't know (a ceiling). Consequences you will notice:

- Getting everything right is **not** a pass — it means the questions were too
  easy. It will escalate until something breaks. If you never miss, it has not
  found the edge.
- It **binary-searches**: a correct answer raises difficulty sharply, a wrong one
  narrows in to pin the exact point.
- A wrong answer is not the end either, nor the signal to start teaching. It will
  probe *around* the failure to work out what kind it was: a slip, an isolated
  gap, or a **systematic misconception**. That last one matters most — a wrong
  mental model held with confidence has to be **evicted**, not just topped up.
- This phase can run long. There is no hurry. It is the investment that makes
  everything afterwards point in the right direction.

**Your goal, via an open question.** "I want to understand LLMs" can mean ten
different things, and which one it is completely changes what gets taught. It
will interrogate you until it is concrete. This has no correct answer, so it is
never a quiz.

#### Phase 2 — Plan

The highest-leverage step. It first sweeps the topic so it is not planning from
a half-remembered version of it. Then it presents, **in chat and always before
teaching**:

1. **The approach in prose** — what is covered, in what order, and why that
   order.
2. **The dependency map** — a directed graph (```mermaid```) with the
   unconditional truths at the roots and your goal as the destination. That map
   *is* the teaching order.

Before showing it, it stress-tests the roots: is this really an unconditional
truth, or a theorem in disguise that derives from something simpler? If it
derives, it gets pushed down and the map extends.

**And then it stops and waits for your approval.** This is your checkpoint, and
it matters that you use it: a misplaced root or a wrong scope is cheap to fix now
and expensive mid-lesson. Read the map. If something does not add up, say so.

#### Phase 3 — Teach

It builds the graph **node by node**. Every node — foundational truths and
derived steps alike — goes through the same loop:

1. **Motivate** — why we need this node now.
2. **Establish** — state it plainly (if foundational) or derive it with a
   motivated move (if derived).
3. **Connect** — make the edge explicit: how it hangs off what is already
   established.
4. **Quiz-check** — confirm the node landed. If you miss, that node is not solid
   and gets repaired before anything is built on top of it.

It does not front-load all the foundations in order to stop checking later: every
new node runs the full loop.

### Why the quizzes look so uniform

There is an explicit construction rule, and knowing it stops you guessing from
the shape instead of the content:

1. **Every option is a bare assertion, with no justification.** The number-one
   tell is the correct one carrying its own reasoning ("…, because it preserves
   X") while the others don't. All the "why" goes in the `explanation` field,
   which only appears **after** you answer.
2. **The correct option is written first, then mutated into each distractor**,
   with the same skeleton, grain and register. Parallelism then holds by
   construction.
3. Each distractor is a real mistake you could make (which is why *which one* you
   pick is diagnostic) but unambiguously false.
4. **No asymmetric bolding.**

If you can read the set cold and tell which is correct without knowing the
subject, it is badly built and gets regenerated.

### Accuracy: the non-negotiable rule

You have to be able to trust the teacher completely; **a single
confidently-stated hallucination poisons that trust in everything else.** Working
from memory alone is exactly where models invent. So: the moment it has the
slightest doubt about a fact, a name, a date, a formula, a definition or a claim,
**it stops and verifies it** with web search before saying it. Stopping to verify
is always acceptable; accuracy beats flow, every time. And if verification
changes what it was about to teach, it says so openly instead of papering over
it.

A wrong unconditional truth or a wrong "discovered" step does not merely
misinform: **it corrupts every node built on top of it.**

---

## 5. The tools you will see

Availability depends on your agent — see [agents.md](agents.md). On the `pi`
reference path you get all of them.

### `quiz` — graded questions

A popup in the terminal. Numbered options, single or multiple answer. On
answering you immediately see ✓/✗, the correct answer and the explanation.

Details that matter:

- **The options are shuffled.** There is no positional pattern to exploit.
- **There is always an "I don't know"**, and it is **not** a normal option: it is
  excluded from the shuffle and produces a distinct signal (`dontKnow`), not a
  failure. An honest "I don't know" is never confused with a lucky guess or with
  an error. **Use it.** Guessing contaminates the map of your level; it is false
  information that derails the whole lesson.
- **There is a free-text note field** on every question. Use it to explain your
  reasoning, or why you were torn between two options. Very useful: it turns a
  wrong answer into a diagnosis.
- It does not accept free text as the answer, and has no "Other" option, because
  a free answer cannot be graded against an index.

### `ask_user_question` — decisions with no correct answer

The same kind of popup, but for preferences and direction: what you want to
learn, where to go next. This one does have an "Other" option and free text.

### `/md-log` and `/md-unlog` — the Obsidian bridge

See the next section.

---

## 6. Obsidian: the bridge

This is the reason half the system exists. The terminal is uncomfortable to read
and renders neither markdown nor math nor diagrams. The fix is not to render in
the terminal, but to **mirror the session to a markdown file** and read it in
Obsidian, already rendered.

### Opening the vault

1. Obsidian → **Open folder as vault**.
2. Pick the `aula` folder.

`.pi/`, `.obsidian/` and `.github/` will not appear in Obsidian's explorer — it
ignores folders starting with a dot. Your vault looks clean.

### The correct flow (the order matters)

```text
1. Create Lessons/<Topic>.md  → EMPTY
2. Start your agent in the vault folder
3. FIRST command, before talking to the agent:
       /md-log Lessons/<Topic>.md
4. Now ask for the topic
5. Open that note in Obsidian and study there, not in the terminal
```

> [!danger] Why the order is not negotiable
> Linking performs a *backfill*: if the session already has history, `md-log`
> **rewrites the entire file** with that history. It is a whole-file write, not
> an append. Linking a note that already had content, mid-session, **destroys
> that content**.
>
> Link first, when there is no history, and nothing is written and nothing is
> lost. `/md-log` also refuses to create files — it only links an existing one —
> precisely so a mistyped path cannot scatter files across your vault.

> [!warning] Do not edit the note while it is linked
> Every append rewrites the whole file. Your edits disappear. For your own notes,
> create `Lessons/<Topic> - my notes.md` and link it with `[[<Topic>]]`. Writing
> in your own words what you just understood is the best proof it landed
> connected rather than memorised — it deserves its own file.

In the terminal you will see `🗒 <name>` in the status bar while it is linked.
The link **survives restarts** (it is stored in the session). `/md-unlog` cuts it.

### Exactly what gets written

Only what is worth reading: your messages, the agent's prose, and the
question/answer blocks. Calls to `bash`, `read`, `write` and so on are omitted,
so the log reads like a class and not like a technical log.

It is written with **Obsidian callouts**, which render as coloured boxes:

| Callout | When |
|---|---|
| `> [!quote] YOU` | Your message |
| `> [!abstract] TUTOR` | The agent's explanation |
| `> [!question] Quiz` / `Question` | The question, **before** you answer |
| `> [!success] Quiz — correct ✓` | You got it right |
| `> [!failure] Quiz — incorrect ✗` | You got it wrong |
| `> [!question] Quiz — I don't know` | You said you don't know (neither green nor red) |
| `> [!example] Answer` | Your answer to a non-graded question |
| `> [!note] SKILL loaded: …` | A skill was loaded |

Two well-thought-out details:

- **The question is written before you answer**, so you watch it appear live in
  Obsidian and can read it there, comfortably and rendered. And **that block
  never contains the correct answer or the explanation** — precisely because you
  are reading it live. Those are only appended once you answer.
- **Options are recorded in the shuffled order you actually saw**, not the order
  the model wrote them. The log matches your screen.

### Rendering: math and diagrams

Obsidian renders both natively, with no plugins:

- **LaTeX** — `$f(x)$` inline, `$$...$$` display. The system requires LaTeX
  wherever there is mathematical notation: in explanations, in questions, in
  options, in quiz explanations. You will see $f(x) = x^2$, not `f(x) = x^2`.
- **Mermaid** — ```` ```mermaid ```` blocks draw themselves. That is why the
  Phase 2 dependency map looks like an actual graph.

Because the mirror reflects text **verbatim**, all of this works without the
system having to render anything.

### Recommended Obsidian settings

None are mandatory. `aula` ships with `attachmentFolderPath: viz`,
`newFileFolderPath: Lessons` and wikilinks already configured. Also useful:

- **Appearance → Readable line length**: on (already is). The logs are long.
- The **Outline** pane, for navigating a long lesson.
- If you use the template often, enable the **Templates** core plugin
  (Settings → Core plugins) and point it at `Templates`.

---

## 7. A session, start to finish

1. Create an empty `Lessons/<Topic>.md` (in Obsidian or the file explorer).
2. Terminal in the vault folder → start your agent.
3. `/md-log Lessons/<Topic>.md` — **first thing.** (Skip on agents without it;
   the agent writes the log itself.)
4. Open that note in Obsidian and put it on the other half of the screen.
5. Say what you want to study. The `teach` skill loads on its own.
6. **Phase 1:** answer the quizzes honestly. Use "I don't know" when you don't
   know, and the note field to explain your doubts. Expect to miss — that is the
   point; it is how it finds your edge.
7. **Phase 2:** it presents the plan and the dependency map, and **stops**. Read
   it in Obsidian, where the graph is drawn. If a root does not look obvious or
   the scope is not what you wanted, say so now.
8. **Phase 3:** the lesson, node by node — reading in Obsidian, answering in the
   terminal.
9. When you are done: write your own conclusions, in your own words, in
   `Lessons/<Topic> - my notes.md`.

---

## 8. Command reference

Inside `pi`:

| Command | What it does |
|---|---|
| `/md-log <path>` | Link the log. **Run it first.** |
| `/md-unlog` | Stop mirroring |
| `/login` | Authenticate with a provider |
| `/model` (`Ctrl+L`) | Change model (`Ctrl+S` saves the default) |
| `/thinking` | Reasoning level |
| `/trust` | Persist the project trust decision |
| `/settings` | Settings |
| `/reload` | Reload extensions and skills after editing them |
| `/skill:teach` | Force-load the teaching skill |
| `/hotkeys` | All keyboard shortcuts |
| `/resume`, `/continue` | Resume an earlier session |

In the terminal:

| Command | What it does |
|---|---|
| `pi` | Interactive session |
| `pi -c` | Continue the last session |
| `pi -r` | Pick a session to resume |
| `pi update --all` | Update `pi` and the installed extensions |

---

## 9. Customising

### Adapting the pedagogy to you

The upstream author says it explicitly: *"the teaching skill is written for one
learner (me). Edit the skill to fit how you learn best."*

Worth doing once you have a few sessions behind you and start noticing patterns:
Phase 1 drags, you want more Socratic, you would rather have the terms in another
language.

**But do it in `AGENTS.md`, not in `.pi/skills/teach/SKILL.md`.** `.pi/` is a git
clone; editing it creates conflicts on the next `git pull`. `AGENTS.md` is always
loaded and can override any instruction in the skill. The config block at the top
of `AGENTS.md` is the intended first stop:

```yaml
teaching_language: English
keep_technical_terms_in_english: true
default_mode: socratic
```

If you end up wanting to rewrite the pedagogy wholesale, then yes: fork the
upstream repo and clone your own.

After any edit, `/reload` applies it without restarting.

### Updating

```bash
git -C .pi pull     # update the teaching system
pi update --all     # update pi and its extensions
git pull            # update aula itself
```

The setup script excludes `.pi/settings.json` from the clone's git locally, so it
does not get in the way of `git pull`.

---

## 10. The three things that decide whether this works

1. **Answer the quizzes honestly, and use "I don't know."** The whole system
   rests on locating your real edge. A lucky guess introduces a false data point
   that derails the entire lesson.
2. **Actually read the Phase 2 plan and respond.** It is your checkpoint. A
   misplaced root corrupts every node built on top of it, and right there is
   where it is cheap to fix.
3. **Link the log before you speak, and read in Obsidian, not the terminal.** The
   system is written assuming you read it rendered: math in LaTeX, diagrams in
   Mermaid, questions in callouts.
