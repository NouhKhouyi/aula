# Windows, and the tmux problem

The teaching system was written on macOS, and it delegates to three subagents
(`researcher`, `mermaid-maker`, `svg-maker`) through
[`pi-interactive-subagents`](https://github.com/amosblomqvist/pi-interactive-subagents),
which drives them in **tmux panes**. There is no tmux on native Windows, so
there is no `subagent` tool there.

This page is how `aula` runs at near-full fidelity anyway, and what the complete
setup would cost you if you decide you want it.

## What you lose without subagents

Upstream is upfront about it: *"You can run the system without subagents. The
main session does the teaching. You just lose the researcher (truth
verification) and the generated visuals."*

Two losses, and they are not equal.

### 1. Fact verification — fully recovered

This was the important job. Install a web-search extension and the main session
does it directly:

```bash
pi install npm:@mariozechner/pi-web-access
```

That gives the session `web_search`, `fetch_content` and `source_check`, and
`AGENTS.md` §6 instructs it to verify there. **The accuracy rule survives
intact**, which is what was actually at stake. On Claude Code and most other
agents, search is built in and there is nothing to install.

### 2. Rendered diagrams — mostly recovered

Diagrams become **inline ```mermaid``` blocks**, which Obsidian renders natively.

And here is the observation that shrinks this loss a lot: the **Phase 2
dependency map — the single most important visual in the system — was already
inline Mermaid in the original design**, precisely because Obsidian draws it.
It never needed subagents. `AGENTS.md` simply extends that approach to every
other visual.

**What you genuinely lose:** the `visualize` skill's PNG pipeline, whose real
guarantee was that a subagent *looked at* the rendered image before returning
it, discarding diagrams that render fine but assert something false. Inline
Mermaid has no such visual check.

And Mermaid is bad at anything **purely geometric** — coordinate geometry,
number lines, vectors, function plots. `AGENTS.md` tells the agent to describe
those in prose with LaTeX instead of forcing them.

## Technical notes if you ever touch the upstream code

Discovered while getting this running on Windows. Kept here so nobody else has
to rediscover them.

- **`visual-tools` is hardcoded for macOS.** `CHROME_CANDIDATES` contains only
  `/Applications/...` paths, and `EXTRA_PATH` uses MacPorts and Homebrew paths
  joined with `:` (the POSIX separator, not Windows' `;`). Rendering SVG also
  needs `rsvg-convert` or ImageMagick.
- **Do not run `npm install` in `.pi/extensions/visual-tools/`.** Its
  `package.json` declares a devDependency by absolute path on the author's
  machine (`file:/Users/amos/.nvm/...`), and the install fails.
- **`agents/researcher.md` declares tools that may not exist.** It asks for
  `web_search, web_fetch, safe_bash`: `safe_bash` comes from the subagents
  extension, and in `pi-web-access` the fetch tool is called `fetch_content`,
  not `web_fetch`. Fix that line if you ever enable subagents.
- **Good news:** the extensions import the package's old name
  (`@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`), but current `pi`
  keeps compatibility aliases for those and for `@sinclair/typebox`. The symbols
  they use (`Editor`, `Key`, `Text`, `matchesKey`, `truncateToWidth`,
  `wrapTextWithAnsi`) still exist in today's `pi-tui`. That is why `quiz`,
  `ask-user-question` and `md-log` work untouched.

*(Verified against pi 0.85.0. Upstream may have moved since.)*

## The full-fidelity route: WSL2

If you decide you want the complete system on a Windows machine:

1. **WSL2 with Ubuntu 24.04 and tmux.**

   ```powershell
   wsl --install -d Ubuntu-24.04
   ```

   ```bash
   sudo apt update && sudo apt install tmux
   ```

2. **Native Node inside WSL.** Without it, the `npm` WSL sees is the Windows one
   leaking through PATH interop, and it will not work. Install Node 22+ with
   [`nvm`](https://github.com/nvm-sh/nvm).
3. **pi and the subagent extension:**

   ```bash
   npm install -g --ignore-scripts @earendil-works/pi-coding-agent
   pi install git:github.com/amosblomqvist/pi-interactive-subagents
   ```

4. **For rendered diagrams:** Google Chrome from the `.deb` (on Ubuntu 24.04
   `chromium` is a snap package, and snap does not work in WSL by default), plus
   `sudo apt install librsvg2-bin` for `rsvg-convert`.
5. **Patch `CHROME_CANDIDATES` and `EXTRA_PATH`** in
   `.pi/extensions/visual-tools/tools/_common.ts` with Linux paths, and remove
   the broken devDependency from its `package.json` before `npm install`.
6. **Keep the vault on the Windows filesystem**, at
   `/mnt/c/Users/<you>/.../aula`, so Obsidian on Windows still reads it normally.
7. **Loosen `AGENTS.md` §6** — with subagents and image tooling present, the
   agent can use them; the capability table already handles this, but say so
   explicitly if it keeps defaulting to inline Mermaid.

**My recommendation: don't do this yet.** Study a few sessions with what you
have. The value is in the teaching loop, and that works in full. The verified
PNGs are a bonus. If you find yourself actually missing geometric diagrams, then
it is worth the afternoon.
