# Security

## Supported versions

Only the latest release on `main` receives fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's
[private vulnerability reporting](https://github.com/NouhKhouyi/aula/security/advisories/new)
instead. Include what you found, how to reproduce it, and what an attacker could
do with it. You will get a reply within a week.

## The model you should have in mind

aula is a single-user application that runs on your own machine.

- The server has **no authentication**. It is meant to listen on `localhost`.
  Do not expose it to a network you do not trust.
- API keys live in `.aula/secrets.json` (owner-only permissions on macOS and
  Linux) or in environment variables. They are used only by the server and are
  never sent to the browser.
- Lesson content is written by a language model. It is rendered as Markdown
  without raw HTML, and diagrams run with Mermaid's strict security level.
- Your sessions, knowledge graph and settings are plain files in `.aula/`.
  Back them up, and keep them out of version control (the repository's
  `.gitignore` and CI already do).
