import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

class MemoryStorage {
  constructor(entries = {}) { this.data = new Map(Object.entries(entries)); }
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

function loadBackupApi(entries = {}) {
  const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const start = source.indexOf('const BACKUP_SCHEMA_VERSION = 1;');
  const endMarker = 'window.__nutritionBackup = {';
  const objectStart = source.indexOf(endMarker, start);
  const end = source.indexOf('\n};', objectStart) + 3;
  assert.ok(start >= 0 && objectStart >= 0 && end > objectStart);
  const context = {
    NS: 'shared.',
    localStorage: new MemoryStorage(entries),
    window: {},
    Blob: class {},
    URL: { createObjectURL() {}, revokeObjectURL() {} },
    document: {},
    setTimeout() {},
  };
  vm.runInNewContext(source.slice(start, end), context);
  return { api: context.window.__nutritionBackup, storage: context.localStorage };
}

const completeState = {
  'shared.targets:v1': '{"protein":140}',
  'shared.theme:v1': 'tidepool',
  'shared.meals:saved': '[{"id":"saved"}]',
  'shared.excludes:v1': '["creatine"]',
  'shared.log:2026-07-16': '[{"id":"meal"}]',
  'unrelated.key': 'leave-me-alone',
};

test('backup contains every required namespaced state class and a schema version', () => {
  const { api } = loadBackupApi(completeState);
  const backup = api.createBackup();
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.namespace, 'shared.');
  for (const key of ['shared.targets:v1', 'shared.theme:v1', 'shared.meals:saved', 'shared.excludes:v1', 'shared.log:2026-07-16']) {
    assert.equal(backup.entries[key], completeState[key]);
  }
  assert.equal(backup.entries['unrelated.key'], undefined);
});

test('export-import-export is byte-identical with canonical ordering', () => {
  const source = loadBackupApi(completeState).api;
  const text = source.canonicalStringify(source.createBackup());
  const parsed = JSON.parse(text);
  const target = loadBackupApi({ 'shared.old': 'remove', 'unrelated.key': 'preserve' });
  target.api.restoreBackup(parsed);
  assert.equal(target.api.canonicalStringify(target.api.createBackup()), text);
  assert.equal(target.storage.getItem('unrelated.key'), 'preserve');
});

test('unsupported schema is rejected without modifying application data', () => {
  const target = loadBackupApi(completeState);
  const before = target.api.canonicalStringify(target.api.createBackup());
  assert.throws(() => target.api.restoreBackup({ schemaVersion: 999, namespace: 'shared.', entries: {} }), /Unsupported backup schema version/);
  assert.equal(target.api.canonicalStringify(target.api.createBackup()), before);
});
