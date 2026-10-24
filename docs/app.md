# Using the app

A walk through a session, from the first question to the knowledge graph. For
what *you* have to do for any of it to work, read
[Your half of the system](pedagogy.md) — it is short.

**Contents**

1. [Setting up](#1-setting-up)
2. [Starting a session](#2-starting-a-session)
3. [Probe: finding your edge](#3-probe-finding-your-edge)
4. [Plan: the dependency map](#4-plan-the-dependency-map)
5. [Teach: one step at a time](#5-teach-one-step-at-a-time)
6. [Practice sessions](#6-practice-sessions)
7. [The knowledge graph](#7-the-knowledge-graph)
8. [Saving lessons to Obsidian](#8-saving-lessons-to-obsidian)
9. [Keyboard](#9-keyboard)

---

## 1. Setting up

```bash
npm install
npm run build && npm start
```

Open <http://localhost:3000> and go to **Settings**.

| Provider | What you need | Web verification |
|---|---|:---:|
| **Claude** (recommended) | An [Anthropic API key](https://console.anthropic.com) | ✅ |
| **OpenAI-compatible** | A base URL, a model id that supports tool calling, and usually a key | ➖ |
| **Demo** | Nothing — runs one scripted lesson | ➖ |

Planning is the step that decides the quality of a lesson, and it needs strong
reasoning. Use the most capable model you have access to; a cheap, fast model
defeats the design. With Claude, **effort** trades thoroughness for speed and
cost — *high* is a good default.

Without web search the teacher is told to say when it is working from memory
and to flag anything it is unsure of, rather than asserting it.

Also in Settings: the **language** lessons are taught in (technical terms can
stay in English), the default **style** — Socratic, where you attempt each
discovery first, or expository, where the teacher narrates — and the
**vault folder** that lessons are saved to.

## 2. Starting a session

On the home page, choose **Learn** or **Practise** and write what you want. Be
as vague or as specific as you like; part of the teacher's job is to make the
goal concrete.

> [!TIP]
> "I want to understand LLMs" can mean ten different things. You don't have to
> know which one you mean yet — the teacher will ask.

If you keep course material in the vault's `Material/` folder — a syllabus,
lecture notes, past exams, a textbook converted to text — the home page offers
it under **Use your material**. Attached files set the scope and the notation;
the lesson still starts from what you know rather than walking through them.
See [working with material](material.md).

Sessions are saved as you go. Close the tab, come back later, and pick up
exactly where you were.

## 3. Probe: finding your edge

The teacher asks a few multiple-choice questions, escalating sharply when you
get one right and narrowing in when you miss. It is mapping where your
understanding ends, so **missing questions is the point** — getting everything
right only means the questions were too easy.

Every quiz card has:

- **The options**, shuffled. Each is a bare statement; none carries its own
  justification, so the shape gives nothing away.
- **I don't know.** A distinct, honest signal, never scored as wrong. Use it
  whenever you would not bet on an answer: a lucky guess plants a false data
  point that steers the whole lesson off your real edge.
- **How sure are you?** A confidence slider. A confident wrong answer tells the
  teacher something very different from a hesitant one.
- **Think out loud.** Free text for your reasoning: why this option, what you
  were torn between, what feels off. This is the most useful thing you can
  give the teacher.

After you answer, the card shows the correct option, your own reasoning, and
the explanation.

## 4. Plan: the dependency map

Once it knows your edge and your goal, the teacher proposes a plan: the
approach in prose, and a map of the route. **Foundations sit at the bottom** —
statements you should be able to accept at face value, marked with a teal
underline — and **your goal sits at the top**.

Read the bottom row first. If a foundation does not feel obviously true to you,
choose **Request changes** and say so. This is the cheapest moment in the whole
session to change course; a wrong root corrupts everything built on it. If the
plan looks right, **Approve and start**.

The approved plan moves to the side panel and stays there, live:

| Mark | Meaning |
|---|---|
| Filled violet | Landed |
| Ringed | Being taught now |
| Solid outline | Ready: everything it depends on has landed |
| Dashed | Later |

## 5. Teach: one step at a time

The lesson reads like a document the teacher writes as you go. Each reasoning
step follows the same rhythm:

1. Often, a **prediction** first: you try the step before you are shown it.
2. The **explanation**, in the clearest form for that step — with real math and
   a diagram when it helps.
3. A **check**. Check questions start folded behind *Check your understanding*
   so you can finish reading before you answer.

A miss is not a failure; it localises exactly which step did not land, and the
teacher repairs it before moving on.

You can interrupt at any time — ask a question, push back, or reason out loud
in the box at the bottom. If a question is waiting for an answer, writing a
message skips it and the teacher responds to what you wrote instead.

## 6. Practice sessions

Practice makes knowledge usable. A practice session poses problems that require
the right idea to come to mind **without being named**. Write your attempt —
steps, half-ideas and dead ends all help — set your confidence, and submit. The
coach responds to your actual reasoning: it confirms what is right, locates the
first wrong step, and gives the smallest hint that unblocks you. Or choose
**Show me the solution**.

## 7. The knowledge graph

In a session's panel, **Add to knowledge graph** reads the session and folds
what it established into one persistent graph:

- **Propositions** — individual true claims, each with a short name and a
  precise statement.
- **Reasoning steps** — premises that jointly lead to a conclusion, drawn as
  arrows.
- **Provenance** — every proposition links back to the sessions it came up in,
  with how well you held it at the end of each: *solid*, *accepted*, *shaky*,
  *resisted* or *not yet engaged*.

Open **Knowledge** to explore it: drag to pan, scroll to zoom, search by name,
and click an idea to see what it follows from, what it leads to and where it
came up. Identical statements from different sessions merge into one node.

New sessions on related topics start with the relevant propositions in front of
the teacher, as evidence to verify — never as proof you still hold them.

## 8. Saving lessons to Obsidian

**Save to Obsidian vault** writes the session to the vault folder from Settings
(by default `Lessons/` in this repository, which is already an Obsidian vault).
The note uses callouts — `YOU`, `TUTOR`, quizzes in green, red or neutral, the
plan with its Mermaid map — so it renders as a class rather than a transcript.
Saving again updates the same note.

**Download as Markdown** gives you the same file without touching the vault.

Keep your own notes in a separate file such as `Lessons/<Topic> - my notes.md`
and link the lesson with `[[<Topic>]]`. Writing in your own words what you just
understood is the best proof it landed.

## 9. Keyboard

| Key | Where | Does |
|---|---|---|
| `Enter` | Message box | Send |
| `Shift` + `Enter` | Message box | New line |
| `1`–`9` | Open quiz | Pick an option |
| `0` or `?` | Open quiz | I don't know |
| `Ctrl`/`Cmd` + `Enter` | Answer and attempt fields | Submit |
