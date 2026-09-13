# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] — 2026-09-13

First public release.

### Added

- **The vault.** `Lessons/`, `Material/`, `Templates/`, `viz/`, and an Obsidian
  config that renders lessons sensibly out of the box (readable line length,
  attachments in `viz/`, new notes in `Lessons/`, file recovery on).
- **`AGENTS.md`** — the instruction layer. Restates the pedagogy in full
  (probe → plan → teach, unconditional truths first, "how could I have
  discovered this myself?", the quiz construction rules, the accuracy rule) so
  that it works on agents other than `pi`. Includes a capability table telling
  the agent how to degrade gracefully when quizzes, subagents, web search or
  image tooling are missing.
- **Cross-agent support.** `pi` as the reference path; Claude Code and anything
  else that reads `AGENTS.md` with documented degradation. `CLAUDE.md` pointer
  file.
- **A configurable teaching language**, defaulting to English, with settled
  technical terms left in English.
- **Setup scripts** for Windows (`setup.ps1`) and macOS/Linux/WSL (`setup.sh`):
  prerequisite checks, optional clone of the upstream teaching system, vault
  scaffolding, and next steps.
- **Documentation** — a full guide, a learner-facing page on how not to break
  the system, per-agent notes, the Windows/WSL2 story, how to work with source
  material, an FAQ, and a worked example lesson.
- **Safety rails.** `Lessons/`, `Material/` and `viz/` are git-ignored, and CI
  fails if anything from them — or a vendored `.pi/` — is ever committed.
- **CI** — markdownlint, link checking, shellcheck, PSScriptAnalyzer.

### Notes

- The teaching philosophy originates in
  [`amosblomqvist/learn`](https://github.com/amosblomqvist/learn). That
  repository carries no license, so `aula` clones it at setup time and never
  redistributes it.

[Unreleased]: https://github.com/NouhKhouyi/aula/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/NouhKhouyi/aula/releases/tag/v0.1.0
