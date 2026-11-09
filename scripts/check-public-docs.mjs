// Enforces docs/DOCUMENTATION_POLICY.md: this repository is public, so it may only contain
// public-facing documentation. Design notes, plans, specs, reviews and research live elsewhere.
// Checks every file git could commit (tracked + untracked-but-not-ignored), never ignored files.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const POLICY = 'docs/DOCUMENTATION_POLICY.md';

const DOC_EXT = new Set(['.md', '.mdx', '.markdown', '.txt', '.rst', '.adoc', '.html', '.htm', '.pdf']);
const MARKDOWN_EXT = new Set(['.md', '.mdx', '.markdown']);
const OFFICE_EXT = new Set(['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.odt', '.odp', '.ods', '.key', '.pages']);
const PRIVATE_DIRS = new Set(['plans', 'specs', 'superpowers', 'council', 'internal', 'research', '.planning']);
// AGENTS.md is the single source of truth for coding agents; harness files may only import it.
const AGENT_POINTERS = new Map([
  ['CLAUDE.md', '@AGENTS.md'],
  ['GEMINI.md', '@./AGENTS.md'],
]);
const ROOT_MARKDOWN = new Set([
  'README.md', 'install.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'LICENSE.md',
  'AGENTS.md', ...AGENT_POINTERS.keys(),
]);
const PUBLIC_MARKDOWN_DIRS = ['docs/', '.github/'];
const PRIVATE_NAME = /(^|[-_.])(private|internal|draft|nda|confidential)([-_.]|$)/i;
const PRIVATE_MARKERS = [
  /^\s*visibility:\s*(private|internal|shared-nda)\s*$/im,
  /^\s*confidential:\s*(yes|true)\s*$/im,
  /<!--\s*visibility:\s*(private|internal|shared-nda)\s*-->/i,
];

/** Returns the reason a repository-relative path must not be public, or null when it may be. */
function violation(rel, readText) {
  const ext = path.posix.extname(rel).toLowerCase();
  const segments = rel.split('/');
  const base = segments[segments.length - 1];

  if (OFFICE_EXT.has(ext)) return 'office documents are not public documentation';
  if (!DOC_EXT.has(ext)) return null;
  if (/\.local\.md$/i.test(base)) return 'machine-local agent notes stay on the machine (git-ignored)';
  if (AGENT_POINTERS.has(rel)) {
    const expected = AGENT_POINTERS.get(rel);
    const text = readText(rel);
    if (text !== null && text.trim() !== expected) {
      return `must contain only the import of AGENTS.md ("${expected}"); write agent rules in AGENTS.md`;
    }
    return null;
  }

  const privateDir = segments.slice(0, -1).find((s) => PRIVATE_DIRS.has(s.toLowerCase()));
  if (privateDir) return `documents under a "${privateDir}" folder are private (plans, specs, reviews, research)`;
  if (PRIVATE_NAME.test(path.posix.basename(base, ext))) return 'the file name marks it as private or a draft';
  if (MARKDOWN_EXT.has(ext) && !ROOT_MARKDOWN.has(rel) && !PUBLIC_MARKDOWN_DIRS.some((d) => rel.startsWith(d))) {
    return `markdown is only public at the root (${[...ROOT_MARKDOWN].join(', ')}), in docs/ or in .github/`;
  }
  const text = readText(rel);
  if (text !== null && PRIVATE_MARKERS.some((re) => re.test(text))) return 'the document is marked private';
  return null;
}

function committableFiles(root) {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  // Entries ending in "/" are nested repositories (e.g. worktrees); deleted files are skipped by readText.
  return [...new Set(out.split('\0').filter((f) => f && !f.endsWith('/')))].sort();
}

function main() {
  const root = process.cwd();
  const readText = (rel) => {
    try {
      return fs.readFileSync(path.join(root, rel), 'utf8');
    } catch {
      return null;
    }
  };
  const files = committableFiles(root);
  const missingSource = !files.includes('AGENTS.md');
  const offenders = files
    .map((rel) => [rel, violation(rel, readText)])
    .map(([rel, reason]) =>
      reason === null && missingSource && AGENT_POINTERS.has(rel)
        ? [rel, 'imports AGENTS.md, which is missing']
        : [rel, reason])
    .filter(([, reason]) => reason !== null);

  if (offenders.length === 0) return;
  console.error('Private documentation found in a public repository:');
  for (const [rel, reason] of offenders) console.error(`  ${rel}: ${reason}`);
  console.error(`\nKeep design notes, plans, specs, reviews and research outside this repository. See ${POLICY}.`);
  process.exitCode = 1;
}

main();
