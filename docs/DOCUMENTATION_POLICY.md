# Documentation policy

This repository is public. It contains the source code of `linkmodel-cli` (`lkm`) and the
documentation its users and contributors need. Nothing else.

## What belongs here

| Document | Location |
|---|---|
| Project overview and quick start | `README.md` |
| Installation | `install.md` |
| Release notes | `CHANGELOG.md` |
| Contribution, security and conduct guides | `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` |
| User and reference documentation (commands, output formats, exit codes, errors) | `docs/` |
| Issue and pull request templates, CI workflows | `.github/` |
| Rules for AI coding agents (source of truth) | `AGENTS.md` |
| Harness entry points that only import `AGENTS.md` | `CLAUDE.md`, `GEMINI.md` |

Documentation describes how the tool behaves for its users. It is written in neutral, factual
language and stays accurate for the released version.

## What does not belong here

Design notes, plans, specifications, architecture decision drafts, review notes, research,
meeting notes and any document marked confidential are maintained outside this repository.
They are not committed, even temporarily.

## How it is enforced

`npm run check:docs` runs on every `npm test` and in CI. It inspects every file git could commit
(tracked files and untracked files that are not ignored) and fails when it finds:

- a document inside a `plans`, `specs`, `superpowers`, `council`, `internal`, `research` or
  `.planning` folder;
- Markdown outside the root files listed above, `docs/` or `.github/`;
- a document whose name marks it as `private`, `internal`, `draft`, `nda` or `confidential`;
- a document carrying `visibility: private`, `visibility: internal`, `visibility: shared-nda` or
  `confidential: yes` front matter, or the equivalent HTML comment;
- office documents (`.docx`, `.pptx`, `.xlsx` and similar);
- `CLAUDE.md` or `GEMINI.md` containing anything other than the import of `AGENTS.md`, or either
  of them present without `AGENTS.md`;
- machine-local agent notes (`*.local.md`), which stay on the maintainer's machine.

The common private folders are also listed in `.gitignore`, so they are not picked up by
`git add` by accident. A file forced past `.gitignore` is still caught by the check.

If the check flags a file that is genuinely public, move it to `docs/` and remove any private
marker, or open an issue to discuss extending the policy.
