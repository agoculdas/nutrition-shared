import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { FoodModel, loadCatalog, loadFoodModelData } from '../scripts/catalog.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('../docs/requirements/evidence/CP3A/portion-qualification.json', import.meta.url), 'utf8'));
const catalog = loadCatalog();
const data = loadFoodModelData();
const indiaCatalog = FoodModel.enrichCatalog(catalog.components, catalog.presets, data, { applyCatalogOverrides: true });
const componentById = new Map(indiaCatalog.components.map(component => [component.id, component]));

test('approved production fixture covers every CP3A household unit', () => {
  assert.equal(fixture.status, 'approved-local-candidate');
  assert.deepEqual([...new Set(fixture.fixtures.map(item => item.unit))].sort(), ['cup', 'g', 'glass', 'katori', 'ml', 'pc', 'tbsp', 'tsp']);
});

test('production household metadata matches the independently recorded fixture within 0.1%', () => {
  for (const item of fixture.fixtures) {
    const definition = data.componentMeta[item.componentId]?.householdUnits?.[item.unit];
    assert.ok(definition, `${item.componentId}/${item.unit} metadata`);
    assert.equal(definition.baseUnit, item.baseUnit, `${item.componentId}/${item.unit} base unit`);
    const relativeError = Math.abs(definition.baseQty - item.expectedBaseQty) / item.expectedBaseQty;
    assert.ok(relativeError <= fixture.tolerancePercent / 100, `${item.componentId}/${item.unit} relative error ${relativeError}`);
    assert.equal(data.provenance[definition.provenanceRef]?.licenseStatus, 'approved', `${item.componentId}/${item.unit} source approval`);
  }
});

test('production catalog conversion factors implement the approved fixture', () => {
  for (const item of fixture.fixtures) {
    const component = componentById.get(item.componentId);
    assert.ok(component, item.componentId);
    const factors = component.unitFactor || { [component.defaultUnit]: 1 };
    if (item.baseUnit === component.defaultUnit) {
      assert.equal(factors[item.unit] ?? 1, item.expectedBaseQty, `${item.componentId}/${item.unit}`);
    } else if (item.unit === component.defaultUnit && component.units.includes(item.baseUnit)) {
      assert.ok(Math.abs(factors[item.baseUnit] - 1 / item.expectedBaseQty) < 1e-12, `${item.componentId}/${item.baseUnit}`);
    }
  }
});
