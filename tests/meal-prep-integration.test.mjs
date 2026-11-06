import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

class MemoryStorage {
  constructor(entries = {}) { this.data = new Map(Object.entries(entries)); }
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

function loadBackupApi(namespace, entries = {}) {
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const start = source.indexOf('const BACKUP_SCHEMA_VERSION = 1;');
  const objectStart = source.indexOf('window.__nutritionBackup = {', start);
  const end = source.indexOf('\n};', objectStart) + 3;
  assert.ok(start >= 0 && objectStart >= 0 && end > objectStart, 'backup facade must remain extractable');
  const context = {
    NS: namespace,
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

function loadMealPrep() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'meal-prep-core.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'meal-prep-recipes.js'), 'utf8'), context);
  return { api: context.window.NutritionMealPrep, recipes: context.window.NutritionMealPrepRecipes };
}

test('all shipped recipes satisfy the core contract and survive setup round-trip', () => {
  const { api, recipes } = loadMealPrep();
  assert.equal(recipes.length, 6);
  for (const recipe of recipes) {
    assert.doesNotThrow(() => api.validateRecipe(recipe), recipe.id);
    const setup = api.createSetupSnapshot(recipe, recipe.baseYield, {
      unitsPerMeal: recipe.output.defaultUnitsPerMeal,
      people: 1,
      mealsPerDay: 1,
    });
    assert.equal(api.validateSetupSnapshot(JSON.parse(JSON.stringify(setup))), true, recipe.id);
  }
});

test('India backup round-trip preserves a validated saved setup and leaves other editions untouched', () => {
  const { api: mealPrep, recipes } = loadMealPrep();
  const recipe = recipes[0];
  const setup = mealPrep.createSetupSnapshot(recipe, 10, { unitsPerMeal: 2, people: 2, mealsPerDay: 1 });
  const setupText = JSON.stringify([setup]);
  const source = loadBackupApi('india.', {
    'india.meal-prep:setups:v1': setupText,
    'india.targets:v1': '{"protein":140}',
    'shared.meal-prep:setups:v1': '["shared-unchanged"]',
  });
  const exported = JSON.parse(source.api.canonicalStringify(source.api.createBackup()));
  assert.equal(exported.entries['india.meal-prep:setups:v1'], setupText);
  assert.equal(exported.entries['shared.meal-prep:setups:v1'], undefined);

  const target = loadBackupApi('india.', {
    'india.old': 'remove',
    'shared.meal-prep:setups:v1': '["shared-unchanged"]',
  });
  target.api.restoreBackup(exported);
  const restored = JSON.parse(target.storage.getItem('india.meal-prep:setups:v1'))[0];
  assert.equal(mealPrep.validateSetupSnapshot(restored), true);
  assert.equal(target.storage.getItem('shared.meal-prep:setups:v1'), '["shared-unchanged"]');
});

test('older backups without meal-prep state remain valid and do not erase another edition', () => {
  const target = loadBackupApi('india.', {
    'india.meal-prep:setups:v1': '[{"old":true}]',
    'shared.targets:v1': '{"protein":90}',
  });
  const oldBackup = { schemaVersion: 1, namespace: 'india.', entries: { 'india.targets:v1': '{"protein":120}' } };
  assert.doesNotThrow(() => target.api.validateBackup(oldBackup));
  target.api.restoreBackup(oldBackup);
  assert.equal(target.storage.getItem('india.meal-prep:setups:v1'), null);
  assert.equal(target.storage.getItem('shared.targets:v1'), '{"protein":90}');
});

test('meal-prep log payload is a detached recipe-version composition snapshot', () => {
  const { api, recipes } = loadMealPrep();
  const scaled = api.scale(recipes[1], 8);
  const logged = api.createLogSnapshot(scaled, 1.5);
  const serialized = JSON.stringify(logged);
  const expectedCalories = scaled.perUnitMacros.calories * 1.5;
  assert.equal(logged.totals.calories, expectedCalories);
  assert.equal(logged.recipeVersion, recipes[1].version);
  assert.equal(JSON.stringify(logged), serialized);
  assert.equal(Object.isFrozen(logged.composition), true);
});

test('edition flags keep meal prep disabled in shared and enabled in India', () => {
  const shared = JSON.parse(fs.readFileSync(path.join(root, 'editions/shared.json'), 'utf8'));
  const india = JSON.parse(fs.readFileSync(path.join(root, 'editions/india.json'), 'utf8'));
  assert.equal(shared.features.mealPrep, false);
  assert.equal(india.features.mealPrep, true);
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(source, /EDITION\.features\?\.mealPrep\s*&&\s*MEAL_PREP\s*&&\s*<MealPrepEntry/);
});

test('both edition builds copy and pre-cache meal-prep runtime assets without deleting unrelated caches', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
  for (const edition of ['shared', 'india']) {
    const directory = path.join(root, 'dist', edition);
    const workerSource = fs.readFileSync(path.join(directory, 'service-worker.js'), 'utf8');
    for (const asset of ['meal-prep-core.js', 'meal-prep-recipes.js']) {
      assert.equal(fs.readFileSync(path.join(directory, asset), 'utf8'), fs.readFileSync(path.join(root, asset), 'utf8'));
      assert.match(workerSource, new RegExp(`\\./${asset.replace('.', '\\.')}`));
      const hashes = JSON.parse(fs.readFileSync(path.join(directory, 'release-hashes.json'), 'utf8'));
      assert.ok(hashes.some((entry) => entry.file === asset && /^[a-f0-9]{64}$/.test(entry.sha256)));
    }

    const listeners = {};
    const deleted = [];
    const context = {
      self: {
        addEventListener(type, handler) { listeners[type] = handler; },
        clients: { claim: async () => {} },
        skipWaiting: async () => {},
      },
      caches: {
        keys: async () => [
          `nutrition-${edition}-stale`,
          `nutrition-${edition === 'shared' ? 'india' : 'shared'}-current`,
          'foreign-library-cache',
        ],
        delete: async (key) => { deleted.push(key); return true; },
        open: async () => ({ addAll: async () => {} }),
        match: async () => null,
      },
      fetch: async () => {},
    };
    vm.runInNewContext(workerSource, context);
    assert.equal(typeof listeners.activate, 'function');
    let activation;
    listeners.activate({ waitUntil(promise) { activation = promise; } });
    await activation;
    assert.deepEqual(deleted, [`nutrition-${edition}-stale`]);
  }
});
