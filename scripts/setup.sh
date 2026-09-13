#!/usr/bin/env bash
#
# aula — study vault setup (macOS / Linux / WSL)
#
# Checks prerequisites, installs the upstream teaching system into .pi/, and
# prints what to do next. Safe to re-run: nothing is overwritten without asking.
#
# Usage:
#   ./scripts/setup.sh
#   ./scripts/setup.sh --skip-teaching-system

set -euo pipefail

VAULT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_URL="https://github.com/amosblomqvist/learn"
PI_DIR="$VAULT_ROOT/.pi"
SKIP_SYSTEM=0

for arg in "$@"; do
  case "$arg" in
    --skip-teaching-system) SKIP_SYSTEM=1 ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [ -t 1 ]; then
  C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_DIM=$'\033[2m';   C_BOLD=$'\033[1m';   C_OFF=$'\033[0m'
else
  C_CYAN=''; C_GREEN=''; C_YELLOW=''; C_DIM=''; C_BOLD=''; C_OFF=''
fi

step() { printf '\n%s==> %s%s\n' "$C_CYAN" "$1" "$C_OFF"; }
ok()   { printf '    %s[ok]   %s%s\n' "$C_GREEN" "$1" "$C_OFF"; }
warn() { printf '    %s[warn] %s%s\n' "$C_YELLOW" "$1" "$C_OFF"; }
info() { printf '    %s%s%s\n' "$C_DIM" "$1" "$C_OFF"; }
have() { command -v "$1" >/dev/null 2>&1; }

printf '\n  %saula — study vault setup%s\n' "$C_BOLD" "$C_OFF"
printf '  %s%s%s\n' "$C_DIM" "$VAULT_ROOT" "$C_OFF"

# ---------------------------------------------------------------- prerequisites
step 'Checking prerequisites'

if ! have git; then
  echo "git is required and was not found on PATH." >&2
  exit 1
fi
ok "git   $(git --version | sed 's/^git version //')"

if have pdftotext; then
  ok 'pdftotext found — PDFs in Material/ can be converted to text'
else
  warn 'pdftotext not found. You will need it to feed PDFs to the tutor.'
  info 'macOS:  brew install poppler'
  info 'Debian: sudo apt install poppler-utils'
fi

if have pi; then
  ok "pi    $(pi --version 2>/dev/null || echo '?')"
  HAS_PI=1
else
  info 'pi not found (optional — only needed for the reference path)'
  HAS_PI=0
fi

if have tmux; then
  ok "tmux  $(tmux -V | sed 's/^tmux //') — interactive subagents are available"
else
  info 'tmux not found (optional — enables the subagent/visual pipeline)'
fi

# ------------------------------------------------------------ teaching system
if [ "$SKIP_SYSTEM" -eq 1 ]; then
  step 'Skipping the teaching system (--skip-teaching-system)'
  info 'AGENTS.md alone carries the full pedagogy. That is enough for'
  info 'Claude Code, Codex, Cursor and anything else reading AGENTS.md.'
elif [ -d "$PI_DIR" ]; then
  step 'Teaching system already installed at .pi/'
  info 'Update it with:  git -C .pi pull'
else
  step 'Installing the teaching system into .pi/'
  info "Source: $UPSTREAM_URL"
  warn 'That repository carries NO license: all rights reserved by its'
  warn 'author. aula clones it, never redistributes it. Do not commit it.'

  printf '    Clone it now? [Y/n] '
  read -r answer </dev/tty || answer=y
  case "${answer:-y}" in
    ''|[Yy]*)
      git clone --depth 1 "$UPSTREAM_URL" "$PI_DIR"
      # Keep local settings out of the upstream clone's git status.
      if [ -f "$PI_DIR/.git/info/exclude" ]; then
        echo 'settings.json' >> "$PI_DIR/.git/info/exclude"
      fi
      ok 'Cloned into .pi/ (settings.json excluded locally)'
      ;;
    *) info 'Skipped.' ;;
  esac
fi

# ------------------------------------------------------------------ vault dirs
step 'Checking vault folders'
for dir in Lessons Material Templates viz; do
  if [ -d "$VAULT_ROOT/$dir" ]; then
    ok "$dir/"
  else
    mkdir -p "$VAULT_ROOT/$dir"
    ok "created $dir/"
  fi
done

# ----------------------------------------------------------------- next steps
step 'Next steps'
cat <<NEXT

    1. Open Obsidian -> "Open folder as vault" -> pick this folder:
       $VAULT_ROOT

    2. Drop your syllabus, notes or converted PDFs into Material/

    3. Create an EMPTY note at Lessons/<Topic>.md
NEXT

if [ "$HAS_PI" -eq 1 ]; then
  cat <<'NEXTPI'

    4. Run "pi" in this folder, then FIRST of all:
           /md-log Lessons/<Topic>.md
       and only then say what you want to study.
NEXTPI
else
  cat <<'NEXTGEN'

    4. Start your agent in this folder and say what you want to study.
       It reads AGENTS.md automatically.
NEXTGEN
fi

printf '\n    Read docs/guide.md for the full walkthrough.\n\n'
