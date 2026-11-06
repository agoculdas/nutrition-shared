import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { deriveTotals, loadCatalog } from '../scripts/catalog.mjs';
import { loadEdition } from '../scripts/editions.mjs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const baseline = JSON.parse(fs.readFileSync(new URL('../docs/requirements/fixtures/shared-config-baseline.json', import.meta.url), 'utf8'));
const catalog = loadCatalog();
const shared = loadEdition('shared');
const india = loadEdition('india');

class OriginStorage {
  constructor() {
    this.data = new Map();
    this.reads = [];
    this.writes = [];
  }
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) {
    this.reads.push(key);
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.writes.push(key);
    this.data.set(key, String(value));
  }
  removeItem(key) { this.data.delete(key); }
  clearTrace() { this.reads = []; this.writes = []; }
}

function loadStorageApi(namespace, origin) {
  const start = source.indexOf('const storage = {');
  const end = source.indexOf('\n};', start) + 3;
  assert.ok(start >= 0 && end > start, 'application storage facade not found');
  const context = { NS: namespace, window: {}, localStorage: origin };
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.__storage = storage;`, context);
  return context.__storage;
}

test('REG-001 shared catalog preserves CP0 component and preset counts', () => {
  assert.equal(catalog.components.length, baseline.catalog.components);
  assert.equal(catalog.presets.length, baseline.catalog.presets);
});

test('REG-003 shared defaults preserve every CP0 target and eating-window value', () => {
  assert.deepEqual(shared.defaultTargets, baseline.defaultTargets);
  assert.deepEqual(shared.eatingWindow, baseline.eatingWindow);
});

test('REG-002 logging flow persists and restores a daily meal', async () => {
  const origin = new OriginStorage();
  const storage = loadStorageApi(shared.storageNamespace, origin);
  const meal = { id: 1, name: 'Regression meal', kcal: 330, p: 62, f: 7, c: 0, fiber: 0 };
  await storage.set('log:2026-07-16', JSON.stringify([meal]));
  assert.deepEqual(JSON.parse(await storage.get('log:2026-07-16')), [meal]);
});

test('REG-002 adjustment flow recalculates a changed preset quantity', () => {
  const preset = catalog.presets.find(item => Array.isArray(item._builder) && item._builder.length > 0);
  const before = deriveTotals(preset._builder, catalog.components);
  const adjusted = structuredClone(preset._builder);
  adjusted[0].qty *= 1.25;
  const after = deriveTotals(adjusted, catalog.components);
  assert.ok(after.kcal > before.kcal);
  assert.ok(after.p >= before.p);
});

test('REG-002 save flow preserves a meal for quick-add', async () => {
  const origin = new OriginStorage();
  const storage = loadStorageApi(shared.storageNamespace, origin);
  const saved = [{ id: 2, name: 'Saved regression meal', kcal: 413, p: 78, _builder: [{ componentId: 'chicken-breast', qty: 250, unit: 'g' }] }];
  await storage.set('meals:saved', JSON.stringify(saved));
  assert.deepEqual(JSON.parse(await storage.get('meals:saved')), saved);
});

test('REG-002 exclusion flow persists excluded component identifiers', async () => {
  const origin = new OriginStorage();
  const storage = loadStorageApi(shared.storageNamespace, origin);
  await storage.set('excludes:v1', JSON.stringify(['chicken-breast']));
  assert.deepEqual(JSON.parse(await storage.get('excludes:v1')), ['chicken-breast']);
});

test('REG-002 target-edit flow persists a complete target object', async () => {
  const origin = new OriginStorage();
  const storage = loadStorageApi(shared.storageNamespace, origin);
  const edited = structuredClone(shared.defaultTargets);
  edited.protein = 150;
  await storage.set('targets:v1', JSON.stringify(edited));
  assert.deepEqual(JSON.parse(await storage.get('targets:v1')), edited);
});

test('REG-002 history flow reads daily logs and aggregates their nutrition', async () => {
  const origin = new OriginStorage();
  const storage = loadStorageApi(shared.storageNamespace, origin);
  await storage.set('log:2026-07-15', JSON.stringify([{ kcal: 500, p: 40 }]));
  await storage.set('log:2026-07-16', JSON.stringify([{ kcal: 743, p: 140 }]));
  const days = await Promise.all(['log:2026-07-15', 'log:2026-07-16'].map(async key => JSON.parse(await storage.get(key))));
  const totals = days.flat().reduce((out, meal) => ({ kcal: out.kcal + meal.kcal, p: out.p + meal.p }), { kcal: 0, p: 0 });
  assert.deepEqual(totals, { kcal: 1243, p: 180 });
});

test('REG-004 actual storage facade records zero foreign reads and writes on one origin', async () => {
  const origin = new OriginStorage();
  const sharedStorage = loadStorageApi(shared.storageNamespace, origin);
  const indiaStorage = loadStorageApi(india.storageNamespace, origin);

  await sharedStorage.set('targets:v1', 'shared-targets');
  await indiaStorage.set('targets:v1', 'india-targets');
  assert.deepEqual(origin.writes, ['shared.targets:v1', 'india.targets:v1']);

  origin.clearTrace();
  assert.equal(await sharedStorage.get('targets:v1'), 'shared-targets');
  assert.deepEqual(origin.reads, ['shared.targets:v1']);
  origin.clearTrace();
  assert.equal(await indiaStorage.get('targets:v1'), 'india-targets');
  assert.deepEqual(origin.reads, ['india.targets:v1']);
});
