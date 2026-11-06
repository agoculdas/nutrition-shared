import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const project = path.resolve('.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrition-editions-'));
const checkout = path.join(temp, 'checkout');
const evidencePath = path.join(project, 'docs', 'requirements', 'evidence', 'CP2A', 'clean-build-and-config-change.json');
const controlled = [
  '.gitignore', 'index.html', 'icon.svg', 'meal-prep-core.js', 'meal-prep-recipes.js', 'fast-log-core.js', 'food-model-core.js', 'food-model-data.js', 'package.json', 'package-lock.json',
  'editions/shared.json', 'editions/india.json', 'editions/india-icon.svg',
  'scripts/build.mjs', 'scripts/editions.mjs', 'scripts/catalog.mjs', 'scripts/validate-food-model.mjs',
  'tests/food-model.test.mjs', 'tests/food-model-integration.test.mjs',
  'docs/PLAN-meal-prep-annex.md',
];

function run(command, args, cwd, env = {}) {
  const isWindowsNpm = process.platform === 'win32' && command === 'npm';
  const executable = isWindowsNpm ? process.env.ComSpec : command;
  const commandArgs = isWindowsNpm ? ['/d', '/s', '/c', 'npm', ...args] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout || ''}\n${result.stderr || result.error || ''}`);
  }
  return result.stdout.trim();
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function copyControlled() {
  fs.mkdirSync(checkout, { recursive: true });
  for (const relative of controlled) {
    const destination = path.join(checkout, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(project, relative), destination);
  }
}

function commit(message, timestamp) {
  run('git', ['add', '.'], checkout);
  run('git', ['commit', '--quiet', '-m', message], checkout, {
    GIT_AUTHOR_DATE: timestamp,
    GIT_COMMITTER_DATE: timestamp,
  });
  return run('git', ['rev-parse', 'HEAD'], checkout);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  copyControlled();
  run('git', ['init', '--quiet'], checkout);
  run('git', ['config', 'user.name', 'CP2A Architecture Test'], checkout);
  run('git', ['config', 'user.email', 'cp2a-test@example.invalid'], checkout);
  const sourceCommit = commit('Controlled CP2A source', '2026-07-16T01:00:00Z');

  run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], checkout);
  run('npm', ['run', 'build'], checkout);
  const firstBuild = readJson(path.join(checkout, 'dist', 'build-manifest.json'));
  const firstCoreHash = sha256(path.join(checkout, 'index.html'));
  const firstAppHashes = {
    shared: sha256(path.join(checkout, 'dist', 'shared', 'app.js')),
    india: sha256(path.join(checkout, 'dist', 'india', 'app.js')),
  };
  const firstSharedReleaseHash = sha256(path.join(checkout, 'dist', 'shared', 'release-hashes.json'));

  const configPath = path.join(checkout, 'editions', 'india.json');
  const changedConfig = readJson(configPath);
  changedConfig.copy.dashboardTitle = 'Protein, at a glance';
  changedConfig.theme.default = 'marine';
  fs.writeFileSync(configPath, JSON.stringify(changedConfig, null, 2) + '\n');
  const configOnlyCommit = commit('Demonstrate India config-only copy and theme change', '2026-07-16T01:01:00Z');
  const changedFiles = run('git', ['diff', '--name-only', `${sourceCommit}..${configOnlyCommit}`], checkout).split(/\r?\n/).filter(Boolean);

  run('npm', ['run', 'build'], checkout);
  const secondBuild = readJson(path.join(checkout, 'dist', 'build-manifest.json'));
  const secondCoreHash = sha256(path.join(checkout, 'index.html'));
  const secondAppHashes = {
    shared: sha256(path.join(checkout, 'dist', 'shared', 'app.js')),
    india: sha256(path.join(checkout, 'dist', 'india', 'app.js')),
  };
  const secondSharedReleaseHash = sha256(path.join(checkout, 'dist', 'shared', 'release-hashes.json'));

  const firstEditionCommits = firstBuild.editions.map(edition => edition.coreCommit);
  const sameCoreCommit = firstBuild.coreCommit === sourceCommit
    && firstEditionCommits.length === 2
    && firstEditionCommits.every(commitId => commitId === sourceCommit);
  const cleanBuild = firstBuild.sourceDirty === false && secondBuild.sourceDirty === false;
  const coreLogicUnchanged = firstCoreHash === secondCoreHash
    && firstAppHashes.shared === secondAppHashes.shared
    && firstAppHashes.india === secondAppHashes.india;
  const configOnlyChange = changedFiles.length === 1 && changedFiles[0] === 'editions/india.json';
  const sharedOutputUnchanged = firstSharedReleaseHash === secondSharedReleaseHash;

  assert(sameCoreCommit, 'Both first-build editions were not traced to the same clean source commit.');
  assert(cleanBuild, 'At least one controlled build reported dirty source.');
  assert(coreLogicUnchanged, 'Core source or compiled application logic changed during the config-only demonstration.');
  assert(configOnlyChange, `Expected one edition-config change; found: ${changedFiles.join(', ')}`);
  assert(sharedOutputUnchanged, 'The shared edition changed during an India-only configuration change.');

  const report = {
    requirements: ['EDI-001', 'EDI-005'],
    sourceCommit,
    configOnlyCommit,
    firstBuild: {
      sourceDirty: firstBuild.sourceDirty,
      editionCoreCommits: firstEditionCommits,
      coreSourceSha256: firstBuild.coreSourceSha256,
    },
    demonstration: {
      changedFiles,
      secondBuildSourceDirty: secondBuild.sourceDirty,
      coreLogicUnchanged,
      sharedOutputUnchanged,
      beforeCoreSourceSha256: firstBuild.coreSourceSha256,
      afterCoreSourceSha256: secondBuild.coreSourceSha256,
      beforeAppSha256: firstAppHashes,
      afterAppSha256: secondAppHashes,
    },
    pass: sameCoreCommit && cleanBuild && coreLogicUnchanged && configOnlyChange && sharedOutputUnchanged,
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
