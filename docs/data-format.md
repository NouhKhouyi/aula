# Data format

Everything aula knows about you is in `.aula/` (or `AULA_DATA_DIR`), as JSON
you can read, back up, diff and delete. The folder is git-ignored.

```text
.aula/
├── settings.json        provider, model, teaching preferences, vault folder
├── secrets.json         API keys (owner-only permissions on macOS/Linux)
├── graph.json           the knowledge graph
└── sessions/
    └── s_<id>.json      one file per session
```

The types below are the source of truth in
[`src/lib/core/types.ts`](../src/lib/core/types.ts).

## A session

| Field | Meaning |
|---|---|
| `version` | Format version, currently `1`. |
| `id`, `title`, `kind` | Identity; `kind` is `teach` or `practice`. |
| `provider`, `model` | What answered the most recent turn. |
| `phase` | `probe` until a plan is approved, then `teach`. |
| `plan` | The approved plan: approach, goal, nodes, edges, revision. |
| `progress` | The current plan node and every node that has landed. |
| `messages` | The complete transcript, in order. |
| `usage` | Input and output tokens across the session. |
| `extractedAt`, `exportedTo` | When it was last added to the graph; where it was last saved in the vault. |

### Messages

```jsonc
{ "id": "msg_…", "role": "user", "ts": 1767225600000, "text": "Why does…" }

{
  "id": "msg_…", "role": "assistant", "ts": 1767225601000,
  "blocks": [
    { "type": "text", "text": "Let me find your edge." },
    { "type": "search", "query": "…", "sources": [{ "title": "…", "url": "…" }] },
    { "type": "tool_call", "id": "toolu_…", "name": "quiz", "input": { /* … */ } }
  ],
  "raw": { "provider": "anthropic", "content": [ /* replayed verbatim */ ] }
}

{
  "id": "msg_…", "role": "tool", "ts": 1767225700000,
  "results": [
    { "callId": "toolu_…", "name": "quiz", "output": "…for the model…", "details": { /* … */ } }
  ]
}
```

### Answers

A tool result's `details` holds what the learner did, in a shape the interface
and the export can read without the model's help:

| `kind` | Fields |
|---|---|
| `quiz` | `role` (probe/predict/check), `question`, `options` **in display order**, `correctIndex`, `chosenIndex` (`null` for I don't know), `dontKnow`, `correct`, `confidence` (0–100, absent for I don't know), `thinking`, `explanation` |
| `ask` | `question`, `text` |
| `plan` | `approved`, `feedback` |
| `problem` | `statement`, `attempt`, `confidence`, `gaveUp` |
| `progress` | `current`, `done` |

A result with no `details` and no error is a question the learner skipped by
writing a message instead.

## The knowledge graph

```jsonc
{
  "propositions": [
    {
      "id": "p_…",
      "name": "Derivative of x²",
      "statement": "The derivative of x² is 2x.",
      "aliases": [],
      "sources": [
        { "sessionId": "s_…", "at": "2026-…", "understanding": "solid" }
      ],
      "createdAt": "2026-…"
    }
  ],
  "chains": [
    { "id": "c_…", "premises": ["p_…"], "conclusion": "p_…", "sources": [{ "sessionId": "s_…", "at": "2026-…" }] }
  ]
}
```

`understanding` is one of `solid`, `accepted`, `shaky`, `resisted`,
`not yet engaged`: how well the learner held the proposition at the end of that
session, judged from their answers and their own words. It is evidence about a
moment, not a grade.

## Compatibility

Files without a `version` are treated as version 1. A future format change will
bump the version and migrate on read, never silently rewrite your record.
