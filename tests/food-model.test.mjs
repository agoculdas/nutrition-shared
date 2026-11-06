import assert from 'node:assert/strict';
import test from 'node:test';
import { FoodModel, deriveTotals } from '../scripts/catalog.mjs';

const components = [
  { id: 'lentil', name: 'Lentil', defaultUnit: 'g', defaultQty: 100, units: ['g'], macros: { kcal: 116, p: 9, f: 0.4, c: 20, fiber: 8 } },
  { id: 'paneer', name: 'Paneer', defaultUnit: 'g', defaultQty: 100, units: ['g'], macros: { kcal: 265, p: 18, f: 20, c: 3, fiber: 0 } },
  { id: 'egg', name: 'Egg', defaultUnit: 'pc', defaultQty: 1, units: ['pc'], macros: { kcal: 72, p: 6.3, f: 4.8, c: 0.4, fiber: 0 } },
  { id: 'chicken', name: 'Chicken', defaultUnit: 'g', defaultQty: 100, units: ['g'], macros: { kcal: 165, p: 31, f: 3.6, c: 0, fiber: 0 } },
  { id: 'onion', name: 'Onion', defaultUnit: 'g', defaultQty: 100, units: ['g'], macros: { kcal: 40, p: 1.1, f: 0.1, c: 9.3, fiber: 1.7 } },
];
const meta = {
  lentil: { dietClass: 'vegan', containsOnionGarlic: false, context: 'generic', provenanceRef: 'approved', householdUnits: { katori: { baseUnit: 'g', baseQty: 150, basis: 'fixture', provenanceRef: 'approved' } } },
  paneer: { dietClass: 'vegetarian', containsOnionGarlic: false, context: 'generic', provenanceRef: 'approved' },
  egg: { dietClass: 'egg', containsOnionGarlic: false, context: 'generic', provenanceRef: 'approved' },
  chicken: { dietClass: 'nonveg', containsOnionGarlic: false, context: 'generic', provenanceRef: 'approved' },
  onion: { dietClass: 'vegan', containsOnionGarlic: true, context: 'generic', provenanceRef: 'approved' },
};
const presets = [
  { name: 'Vegan bowl', _builder: [{ componentId: 'lentil', qty: 1, unit: 'katori' }] },
  { name: 'Paneer bowl', _builder: [{ componentId: 'lentil', qty: 100, unit: 'g' }, { componentId: 'paneer', qty: 50, unit: 'g' }] },
  { name: 'Egg bowl', _builder: [{ componentId: 'egg', qty: 1, unit: 'pc' }, { componentId: 'onion', qty: 20, unit: 'g' }] },
  { name: 'Chicken bowl', _builder: [{ componentId: 'chicken', qty: 100, unit: 'g' }] },
];
const data = {
  componentMeta: meta,
  presetContextByName: Object.fromEntries(presets.map(x => [x.name, 'home'])),
  provenance: { approved: { source: 'Test fixture', url: null, accessDate: '2026-09-05', portionBasis: 'Declared fixture basis', licenseStatus: 'approved' } },
};
const enriched = FoodModel.enrichCatalog(components, presets, data);

test('normalizes dietary and no-onion-garlic aliases without calling them Jain', () => {
  assert.deepEqual(FoodModel.normalizePreference('veg'), { dietType: 'vegetarian', noOnionGarlic: false });
  assert.deepEqual(FoodModel.normalizePreference('no-onion-garlic'), { dietType: 'all', noOnionGarlic: true });
});

test('derives the strictest dietary class and onion/garlic flag from all components', () => {
  assert.deepEqual(enriched.presets.map(x => [x.name, x.dietClass, x.containsOnionGarlic]), [
    ['Vegan bowl', 'vegan', false], ['Paneer bowl', 'vegetarian', false],
    ['Egg bowl', 'egg', true], ['Chicken bowl', 'nonveg', false],
  ]);
});

test('applies the same compatibility semantics to components and presets', () => {
  assert.deepEqual(FoodModel.filterFoods(enriched.presets, { dietType: 'vegetarian_eggs', noOnionGarlic: true }).map(x => x.name), ['Vegan bowl', 'Paneer bowl']);
  assert.equal(FoodModel.evaluateFood({ name: 'Saved totals only' }, { dietType: 'vegan' }).compatible, null);
  assert.equal(FoodModel.evaluateFood(enriched.components[0], { dietType: 'vegan' }).compatible, true);
});

test('known katori fixture converts to independently calculated totals', () => {
  const totals = deriveTotals(enriched.presets[0]._builder, enriched.components);
  assert.deepEqual(totals, { kcal: 174, p: 13.5, f: 0.6000000000000001, c: 30, fiber: 12 });
});

test('all eight named units use fixed, independently expected conversions', () => {
  const unitComponent = {
    id: 'fixture', defaultUnit: 'g', defaultQty: 100, units: ['g'],
    macros: { kcal: 200, p: 10, f: 4, c: 30, fiber: 6 },
  };
  const expectedGrams = { katori: 150, pc: 80, tsp: 5, tbsp: 15, cup: 240, glass: 250, g: 1, ml: 1 };
  const unitData = {
    componentMeta: { fixture: {
      dietClass: 'vegan', containsOnionGarlic: false, context: 'generic', provenanceRef: 'approved',
      householdUnits: Object.fromEntries(Object.entries(expectedGrams).map(([unit, baseQty]) => [unit, { baseUnit: 'g', baseQty, basis: 'fixed test fixture', provenanceRef: 'approved' }])),
    } },
    provenance: data.provenance,
  };
  const food = FoodModel.enrichCatalog([unitComponent], [], unitData).components[0];
  for (const [unit, grams] of Object.entries(expectedGrams)) {
    const totals = deriveTotals([{ componentId: 'fixture', qty: 1, unit }], [food]);
    assert.equal(totals.kcal, grams * 2, unit);
    assert.equal(totals.p, grams * 0.1, unit);
  }
});

test('prototype reports unapproved provenance but strict release rejects it', () => {
  const unapproved = structuredClone(data);
  unapproved.provenance.approved.licenseStatus = 'unapproved';
  const prototype = FoodModel.validateFoodModel({ components, presets }, unapproved);
  assert.equal(prototype.valid, true);
  assert.equal(prototype.warnings.length, components.length);
  const release = FoodModel.validateFoodModel({ components, presets }, unapproved, { release: true });
  assert.equal(release.valid, false);
  assert.equal(release.errors.filter(x => x.rule === 'unapproved-provenance').length, components.length);
});

test('validation fails closed for missing metadata and incomplete sources', () => {
  const broken = structuredClone(data);
  delete broken.componentMeta.lentil;
  broken.provenance.approved.source = '';
  const result = FoodModel.validateFoodModel({ components, presets }, broken);
  assert.ok(result.errors.some(x => x.rule === 'component-metadata'));
  assert.ok(result.errors.some(x => x.rule === 'provenance-complete'));
  assert.ok(result.errors.some(x => x.rule === 'preset-diet-derived'));
});

test('a false preset qualification cannot certify an unknown component', () => {
  const preset = { name: 'Unknown sauce meal', _builder: [{ componentId: 'missing' }] };
  const data = { presetQualificationByName: { 'Unknown sauce meal': { containsOnionGarlic: false, basis: 'Qualified recipe', provenanceRef: 'qualified' } } };
  const result = FoodModel.derivePresetMetadata(preset, new Map(), data);
  assert.equal(result.containsOnionGarlic, null);
  assert.equal(result.metadataUnknown, true);
});
