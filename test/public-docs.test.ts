import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Compiled path: test-dist/test/public-docs.test.js -> <repo>/scripts/check-public-docs.mjs
const CHECKER = fileURLToPath(new URL('../../scripts/check-public-docs.mjs', import.meta.url));

type Files = Record<string, string>;

/** Builds a throwaway git repo, stages `staged`, leaves `untracked` unstaged, and runs the checker in it. */
function runChecker(staged: Files, untracked: Files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lkm-public-docs-'));
  try {
    const write = (files: Files) => {
      for (const [rel, content] of Object.entries(files)) {
        const full = path.join(root, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
      }
    };
    git(root, 'init', '-q');
    write(staged);
    // --force: a private file force-added past .gitignore must still be caught.
    git(root, 'add', '-A', '--force');
    write(untracked);
    const r = spawnSync(process.execPath, [CHECKER], { cwd: root, encoding: 'utf8' });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function git(cwd: string, ...args: string[]) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
}

const frontMatter = (...lines: string[]) => ['---', ...lines, '---', '', '# Title', ''].join('\n');

const PUBLIC_TREE: Files = {
  'README.md': '# linkmodel-cli\n',
  'install.md': '# Install\n',
  'CHANGELOG.md': '# Changelog\n',
  'docs/usage.md': frontMatter('title: Usage'),
  'docs/reference/errors.md': '# Errors\n',
  '.github/pull_request_template.md': '## Summary\n',
  'src/internal.ts': 'export const x = 1;\n',
  '.gitignore': 'docs/superpowers/\n',
};

test('a tree with only public documentation passes', () => {
  const r = runChecker(PUBLIC_TREE);
  assert.equal(r.status, 0, r.out);
});

test('planning and design folders are rejected wherever they sit', () => {
  for (const rel of [
    'docs/superpowers/specs/2026-11-09-design.md',
    'docs/plans/plan.md',
    'specs/design.md',
    'notes/council/01-correctness.md',
    '.planning/STATE.md',
    'docs/internal/decisions.md',
    'docs/research/vendors.md',
  ]) {
    const r = runChecker({ ...PUBLIC_TREE, [rel]: '# x\n' });
    assert.equal(r.status, 1, `${rel} should be rejected:\n${r.out}`);
    assert.match(r.out, new RegExp(rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('markdown outside the public allowlist is rejected', () => {
  const r = runChecker({ ...PUBLIC_TREE, 'notes/roadmap.md': '# Roadmap\n' });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /notes\/roadmap\.md/);
});

test('a public path carrying a private marker is rejected', () => {
  for (const marker of ['visibility: private', 'visibility: internal', 'confidential: yes', 'confidential: true']) {
    const r = runChecker({ ...PUBLIC_TREE, 'docs/usage.md': frontMatter('title: Usage', marker) });
    assert.equal(r.status, 1, `${marker} should be rejected:\n${r.out}`);
    assert.match(r.out, /docs\/usage\.md/);
  }
  const html = runChecker({ ...PUBLIC_TREE, 'docs/usage.md': '<!-- visibility: private -->\n# Usage\n' });
  assert.equal(html.status, 1, html.out);
  assert.match(html.out, /docs\/usage\.md/);
});

test('office documents and private-named docs are rejected', () => {
  for (const rel of ['docs/proposal.docx', 'deck.pptx', 'docs/spec-draft.md', 'docs/nda.md', 'design.private.html']) {
    const r = runChecker({ ...PUBLIC_TREE, [rel]: 'x' });
    assert.equal(r.status, 1, `${rel} should be rejected:\n${r.out}`);
    assert.ok(r.out.includes(rel), `output should name ${rel}:\n${r.out}`);
  }
});

test('untracked files that could be committed are checked too', () => {
  const r = runChecker(PUBLIC_TREE, { 'docs/plans/next.md': '# next\n' });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /docs\/plans\/next\.md/);
});

test('git-ignored files are not reported', () => {
  const r = runChecker(PUBLIC_TREE, { 'docs/superpowers/specs/x.md': '# private\n' });
  assert.equal(r.status, 0, r.out);
});

test('the failure message points to the policy', () => {
  const r = runChecker({ ...PUBLIC_TREE, 'docs/plans/plan.md': '# x\n' });
  assert.match(r.out, /docs\/DOCUMENTATION_POLICY\.md/);
});
