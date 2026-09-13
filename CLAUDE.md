# CLAUDE.md

This project's instructions live in **[`AGENTS.md`](AGENTS.md)**. Read that file
in full before doing anything — it defines the pedagogy you must follow, how to
handle the learner's source material, and how to write the lesson log.

Claude Code specifics are in [`docs/agents.md`](docs/agents.md#claude-code).
The short version:

- There is no graded-quiz popup here. Build quizzes exactly as `AGENTS.md` §2
  specifies, write them into the lesson note as `> [!question] Quiz` callouts,
  and take the answer in chat. Reveal the correct answer and the explanation
  **only after** the learner answers.
- There is no `/md-log`. You maintain `Lessons/<Topic>.md` yourself, appending
  after each meaningful exchange. Never rewrite it whole — the learner may have
  the file open.
- Use web search per the accuracy rule in `AGENTS.md` §2. It is not optional.
