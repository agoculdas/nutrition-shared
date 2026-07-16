import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const project = path.resolve('.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrition-repro-'));
const seed = path.join(temp, 'seed');
const a = path.join(temp, 'checkout-a');
const b = path.join(temp, 'checkout-b');
const evidencePath = path.join(project, 'docs', 'requirements', 'evidence', 'CP1A', 'reproducible-build.json');
const controlled = ['.gitignore', 'index.html', 'icon.svg', 'manifest.webmanifest', 'package.json', 'package-lock.json', 'scripts/build.mjs'];

function run(command, args, cwd, env = {}) {
  const isWindowsNpm = process.platform === 'win32' && command === 'npm';
  const executable = isWindowsNpm ? process.env.ComSpec : command;
  const commandArgs = isWindowsNpm ? ['/d', '/s', '/c', 'npm', ...args] : args;
  const result = spawnSync(executable, commandArgs, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout || ''}\n${result.stderr || result.error || ''}`);
  return result.stdout.trim();
}

function copyControlled(target) {
  for (const relative of controlled) {
    const destination = path.join(target, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(project, relative), destination);
  }
}

function hashes(checkout) {
  return JSON.parse(fs.readFileSync(path.join(checkout, 'dist', 'release-hashes.json'), 'utf8'));
}

try {
  fs.mkdirSync(seed, { recursive: true });
  copyControlled(seed);
  run('git', ['init', '--quiet'], seed);
  run('git', ['config', 'user.name', 'CP1 Reproducibility Test'], seed);
  run('git', ['config', 'user.email', 'cp1-test@example.invalid'], seed);
  run('git', ['add', '.'], seed);
  run('git', ['commit', '--quiet', '-m', 'Controlled Phase 1 source'], seed, { GIT_AUTHOR_DATE: '2026-07-16T00:00:00Z', GIT_COMMITTER_DATE: '2026-07-16T00:00:00Z' });
  const commit = run('git', ['rev-parse', 'HEAD'], seed);
  run('git', ['clone', '--quiet', seed, a], temp);
  run('git', ['clone', '--quiet', seed, b], temp);
  const cleanCheckouts = [a, b].map(checkout => run('git', ['status', '--porcelain'], checkout) === '');
  for (const checkout of [a, b]) {
    run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], checkout);
    run('npm', ['run', 'build'], checkout);
  }
  const first = hashes(a);
  const second = hashes(b);
  const identical = JSON.stringify(first) === JSON.stringify(second);
  const report = {
    requirement: 'FND-006',
    sourceCommit: commit,
    cleanCheckouts,
    identical,
    manifestSha256: crypto.createHash('sha256').update(JSON.stringify(first)).digest('hex'),
    files: first,
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!identical || report.cleanCheckouts.includes(false)) process.exitCode = 1;
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
