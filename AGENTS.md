# AGENTS.md

The single source of truth for AI coding agents (Claude Code, Codex, Gemini CLI, Cursor and others)
working in this repository. `CLAUDE.md` and `GEMINI.md` only import this file. Change the rules
here; never write anything into those two files (`npm run check:docs` fails if you do).

## Project

`linkmodel-cli` (`lkm`) is the command-line client for the LinkModel API: it creates image and video
generation tasks, polls them and downloads the results. TypeScript, ESM, Node.js, MIT license.

| Task | Command |
|---|---|
| Install | `npm ci` |
| Build | `npm run build` |
| Test (includes the i18n and documentation checks) | `npm test` |
| Documentation boundary check only | `npm run check:docs` |

Contracts users and agents depend on, which a change must not break: command names and flags,
the single-line `--json` output, and the exit codes `0, 1, 2, 3, 4, 130` (4 and 130 mean the
server task is still running and can be resumed).

## Decide where your output goes before you write a file

This repository is public. Every file you create goes to exactly one of three places:

| What you produce | Where it goes |
|---|---|
| Source code, tests, scripts, CI workflows | this repository |
| User-facing documentation: README, install guide, changelog, command and error reference | this repository: the root files or `docs/`, in neutral, factual language |
| Scratch files, logs, exported transcripts, agent worktrees, local settings | the local machine only, in a git-ignored path (`.claude/`, `out/`, the system temp folder) |
| Design notes, specifications, plans, decisions, diagrams, reviews, research, meeting notes, anything about partners or commercial terms | the maintainers' private knowledge base, never this repository |

Rules for the private knowledge base:

1. Its location is in `AGENTS.local.md` at the repository root. That file is git-ignored and
   exists only on a maintainer's machine. Read it before writing any private document.
2. If `AGENTS.local.md` does not exist, stop and ask the maintainer where the document goes. Do
   not fall back to this repository, to `docs/`, or to a git-ignored folder inside it.
3. Every private document starts with front matter `visibility: internal` (or
   `visibility: shared-nda` for material prepared for a partner under NDA). The documentation
   check rejects any file carrying that marker, so a misplaced copy is caught.
4. Skills or tools that default to writing specs or plans inside the repository (for example
   `docs/superpowers/` or `docs/plans/`) write to the private knowledge base instead.

## Before you commit

- Run `npm test`. It runs `npm run check:docs`, which enforces
  [docs/DOCUMENTATION_POLICY.md](docs/DOCUMENTATION_POLICY.md).
- Never use `git add -f` to get past `.gitignore`; the check still catches forced files.
- When the check flags a file, move it to its correct place. Do not rename it or strip its
  marker to make the check pass.
