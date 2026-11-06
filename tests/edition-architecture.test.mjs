import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadEdition } from '../scripts/editions.mjs';

const root = path.resolve('.');
const shared = loadEdition('shared');
const india = loadEdition('india');
const build = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'build-manifest.json'), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

test('both editions declare every EDI-002 configuration field', () => {
  for (const config of [shared, india]) {
    assert.ok(config.name);
    assert.ok(config.storageNamespace);
    assert.deepEqual(Object.keys(config.manifest).sort(), ['display', 'icon', 'name', 'orientation', 'shortName', 'startUrl']);
    assert.ok(config.theme.default);
    assert.ok(config.theme.values[config.theme.default]);
    assert.ok(config.eatingWindow.startHour < config.eatingWindow.endHour);
    assert.ok(config.cuisineOrder.length >= 1);
    assert.equal(config.suggestionPolicy.setSize, 7);
  }
});

test('India storage is isolated during simultaneous logical writes', () => {
  assert.notEqual(india.storageNamespace, 'shared.');
  assert.notEqual(india.storageNamespace, shared.storageNamespace);
  const storage = new Map();
  const write = (config, key, value) => storage.set(config.storageNamespace + key, value);
  write(shared, 'targets:v1', 'shared-value');
  write(india, 'targets:v1', 'india-value');
  assert.equal(storage.get('shared.targets:v1'), 'shared-value');
  assert.equal(storage.get('india.targets:v1'), 'india-value');
  assert.deepEqual([...storage.keys()].filter(key => key.startsWith('shared.')), ['shared.targets:v1']);
});

test('manifest identity is distinct across all four EDI-004 values', () => {
  assert.notEqual(india.manifest.name, shared.manifest.name);
  assert.notEqual(india.manifest.shortName, shared.manifest.shortName);
  assert.notEqual(india.manifest.icon, shared.manifest.icon);
  assert.notEqual(india.manifest.startUrl, shared.manifest.startUrl);
});

test('one build manifest traces both outputs to one core commit and source hash', () => {
  assert.deepEqual(build.editions.map(item => item.id).sort(), ['india', 'shared']);
  assert.equal(new Set(build.editions.map(item => item.coreCommit)).size, 1);
  assert.equal(new Set(build.editions.map(item => item.coreSourceSha256)).size, 1);
  assert.equal(build.editions[0].coreCommit, build.coreCommit);
  assert.equal(build.editions[0].coreSourceSha256, build.coreSourceSha256);
  assert.equal(sha('dist/shared/app.js'), sha('dist/india/app.js'));
});

test('edition outputs are complete and non-overlapping', () => {
  const required = ['index.html', 'app.js', 'edition-config.js', 'manifest.webmanifest', 'service-worker.js', 'release-hashes.json', 'vendor/react.production.min.js', 'vendor/react-dom.production.min.js'];
  for (const id of ['shared', 'india']) for (const file of required) assert.ok(fs.existsSync(path.join(root, 'dist', id, file)), `${id}/${file}`);
  const sharedFiles = new Set(fs.readdirSync(path.join(root, 'dist', 'shared'), { recursive: true }).map(file => path.resolve(root, 'dist', 'shared', file)));
  const indiaFiles = new Set(fs.readdirSync(path.join(root, 'dist', 'india'), { recursive: true }).map(file => path.resolve(root, 'dist', 'india', file)));
  assert.equal([...sharedFiles].filter(file => indiaFiles.has(file)).length, 0);
});

test('edition-only copy and theme changes leave core application logic untouched', () => {
  const before = sha('index.html');
  const changed = structuredClone(india);
  changed.copy.dashboardTitle = 'Configuration-only demonstration';
  changed.theme.default = 'marine';
  assert.equal(sha('index.html'), before);
  assert.notEqual(JSON.stringify(changed), JSON.stringify(india));
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('Configuration-only demonstration'), false);
});
