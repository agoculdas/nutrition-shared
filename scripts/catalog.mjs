import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const MACROS = ['kcal', 'p', 'f', 'c', 'fiber'];
export const TOTAL_TOLERANCE = 0.05;

function extractArray(source, identifier) {
  const marker = `const ${identifier} = [`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${identifier}`);
  const arrayStart = source.indexOf('[', start);
  const terminator = source.indexOf('\n];', arrayStart);
  if (terminator < 0) throw new Error(`Unterminated ${identifier}`);
  return vm.runInNewContext(`(${source.slice(arrayStart, terminator + 2)})`, Object.create(null), { timeout: 1000 });
}

export function loadCatalog(indexPath = path.resolve('index.html')) {
  const source = fs.readFileSync(indexPath, 'utf8');
  return {
    components: extractArray(source, 'BUILDER_COMPONENTS'),
    presets: extractArray(source, 'PRESET_DEFS'),
  };
}

export function deriveTotals(builder, components) {
  const byId = new Map(components.map(component => [component.id, component]));
  const totals = Object.fromEntries(MACROS.map(macro => [macro, 0]));
  for (const row of builder || []) {
    const component = byId.get(row.componentId);
    if (!component) continue;
    const factor = component.unitFactor?.[row.unit] ?? 1;
    const ratio = (Number(row.qty) * factor) / component.defaultQty;
    for (const macro of MACROS) totals[macro] += component.macros[macro] * ratio;
  }
  return totals;
}

export function validateCatalog(catalog, { tolerance = TOTAL_TOLERANCE } = {}) {
  const errors = [];
  const { components, presets } = catalog;
  const componentIds = new Set();
  const presetNames = new Set();

  for (const component of components) {
    if (componentIds.has(component.id)) errors.push({ rule: 'unique-component-id', subject: component.id });
    componentIds.add(component.id);
    if (!Array.isArray(component.units) || !component.units.includes(component.defaultUnit)) {
      errors.push({ rule: 'supported-unit', subject: component.id, unit: component.defaultUnit });
    }
    if (!(Number.isFinite(component.defaultQty) && component.defaultQty > 0)) {
      errors.push({ rule: 'positive-default-quantity', subject: component.id });
    }
    for (const macro of MACROS) {
      const value = component.macros?.[macro];
      if (!(Number.isFinite(value) && value >= 0)) errors.push({ rule: 'finite-nonnegative-macro', subject: component.id, macro });
    }
    for (const unit of component.units || []) {
      const factor = component.unitFactor?.[unit] ?? (unit === component.defaultUnit ? 1 : undefined);
      if (!(Number.isFinite(factor) && factor > 0)) errors.push({ rule: 'supported-unit', subject: component.id, unit });
    }
  }

  for (const preset of presets) {
    if (presetNames.has(preset.name)) errors.push({ rule: 'unique-preset-name', subject: preset.name });
    presetNames.add(preset.name);
    for (const row of preset._builder || []) {
      const component = components.find(item => item.id === row.componentId);
      if (!component) {
        errors.push({ rule: 'resolvable-component-reference', subject: preset.name, componentId: row.componentId });
        continue;
      }
      if (!component.units.includes(row.unit)) errors.push({ rule: 'supported-unit', subject: preset.name, unit: row.unit });
      if (!(Number.isFinite(row.qty) && row.qty > 0)) errors.push({ rule: 'positive-preset-quantity', subject: preset.name });
    }
    const totals = deriveTotals(preset._builder, components);
    for (const macro of MACROS) {
      if (!(Number.isFinite(totals[macro]) && totals[macro] >= 0)) {
        errors.push({ rule: 'derived-total-tolerance', subject: preset.name, macro });
      }
      if (preset._expectedTotals && Math.abs(totals[macro] - preset._expectedTotals[macro]) > tolerance) {
        errors.push({ rule: 'derived-total-tolerance', subject: preset.name, macro });
      }
    }
  }
  return errors;
}
