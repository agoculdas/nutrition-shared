import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveTotals, loadCatalog, validateCatalog } from '../scripts/catalog.mjs';

const production = loadCatalog();
const clone = value => structuredClone(value);

const fixtures = [
  ['unique-component-id', catalog => catalog.components.push(clone(catalog.components[0]))],
  ['unique-preset-name', catalog => catalog.presets.push(clone(catalog.presets[0]))],
  ['resolvable-component-reference', catalog => { catalog.presets[0]._builder[0].componentId = 'missing-component'; }],
  ['supported-unit', catalog => { catalog.presets[0]._builder[0].unit = 'unsupported-unit'; }],
  ['finite-nonnegative-macro', catalog => { catalog.components[0].macros.p = -1; }],
  ['positive-default-quantity', catalog => { catalog.components[0].defaultQty = 0; }],
  ['positive-preset-quantity', catalog => { catalog.presets[0]._builder[0].qty = 0; }],
  ['derived-total-tolerance', catalog => {
    catalog.presets[0]._expectedTotals = deriveTotals(catalog.presets[0]._builder, catalog.components);
    catalog.presets[0]._expectedTotals.p += 1;
  }],
];

test('production catalog satisfies DATA-RULESET-01', () => {
  assert.deepEqual(validateCatalog(production), []);
});

for (const [rule, mutate] of fixtures) {
  test(`rejects ${rule}`, () => {
    const catalog = clone(production);
    mutate(catalog);
    assert.ok(validateCatalog(catalog).some(error => error.rule === rule));
  });
}
