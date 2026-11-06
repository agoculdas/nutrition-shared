import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadCatalog } from './catalog.mjs';

const args = process.argv.slice(2);
const valuesAfter = flag => {
  const values = [];
  for (let index = 0; index < args.length; index += 1) if (args[index] === flag) values.push(args[index + 1]);
  return values;
};
const sourcePaths = valuesAfter('--source');
const policyPath = valuesAfter('--policy')[0] || path.resolve('docs/requirements/food-source-policy.json');
const dataPath = valuesAfter('--data')[0] || path.resolve('food-model-data.js');
const registerPath = valuesAfter('--register')[0] || path.resolve('docs/requirements/evidence/CP3A/food-source-register.json');
const auditPath = valuesAfter('--audit')[0] || path.resolve('docs/requirements/evidence/CP3A/source-candidate-audit.json');
if (!sourcePaths.length) {
  console.error('Usage: node scripts/qualify-food-catalog.mjs --source FILE [...] [--policy FILE --data FILE --register FILE --audit FILE]');
  process.exit(2);
}

const collectionKeys = ['FoundationFoods', 'SRLegacyFoods', 'SurveyFoods'];
const foods = sourcePaths.flatMap(sourcePath => {
  const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const key = collectionKeys.find(candidate => Array.isArray(parsed[candidate]));
  if (!key) throw new Error(`No supported food collection in ${sourcePath}`);
  return parsed[key].filter(Boolean);
});
const foodsById = new Map(foods.map(food => [Number(food.fdcId), food]));
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const auditById = new Map(audit.candidates.map(item => [item.componentId, item]));
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(dataPath, 'utf8'), context, { filename: dataPath });
const data = JSON.parse(JSON.stringify(context.NutritionFoodModelData));
const catalog = loadCatalog();

function nutrient(food, names, unitName = null) {
  const wanted = new Set(names);
  const found = (food.foodNutrients || []).find(entry => wanted.has(entry.nutrient?.name)
    && (!unitName || String(entry.nutrient?.unitName).toLowerCase() === unitName));
  return found?.amount ?? null;
}
function macrosPer100g(food) {
  return {
    kcal: nutrient(food, ['Energy'], 'kcal'),
    p: nutrient(food, ['Protein']),
    f: nutrient(food, ['Total lipid (fat)']),
    c: nutrient(food, ['Carbohydrate, by difference']),
    fiber: nutrient(food, ['Fiber, total dietary']),
  };
}
function hasCoreMacros(food) {
  const macros = macrosPer100g(food);
  return ['kcal', 'p', 'f', 'c'].every(key => Number.isFinite(macros[key]));
}
function portions(food) {
  return (food.foodPortions || []).filter(item => Number.isFinite(item.gramWeight) && item.gramWeight > 0).map(item => ({
    description: item.portionDescription || item.modifier || item.measureUnit?.name || 'USDA portion',
    amount: item.amount ?? null,
    gramWeight: item.gramWeight,
  }));
}
function chooseFood(component, rule) {
  if (rule?.fdcId) {
    const food = foodsById.get(Number(rule.fdcId));
    if (!food) throw new Error(`${component.id}: policy FDC ${rule.fdcId} was not found`);
    if (!hasCoreMacros(food)) throw new Error(`${component.id}: policy FDC ${rule.fdcId} lacks core macros`);
    return { food, method: 'curated-override' };
  }
  const candidate = auditById.get(component.id)?.candidates.find(item => {
    const food = foodsById.get(Number(item.fdcId));
    return food && hasCoreMacros(food);
  });
  if (!candidate) throw new Error(`${component.id}: no complete USDA candidate`);
  return { food: foodsById.get(Number(candidate.fdcId)), method: 'ranked-candidate-reviewed' };
}
function portionBasis(component, food, rule) {
  if (Number.isFinite(rule?.basisGrams)) return { grams: rule.basisGrams, description: rule.portionBasis || `Policy-defined ${rule.basisGrams} g basis for ${component.defaultQty} ${component.defaultUnit}` };
  if (component.defaultUnit === 'g') return { grams: component.defaultQty, description: `${component.defaultQty} g` };
  if (component.defaultUnit === 'ml') return { grams: component.defaultQty, description: `${component.defaultQty} ml modeled as ${component.defaultQty} g; declared application density convention` };
  const candidates = portions(food);
  const unitTerms = {
    pc: ['piece', 'item', 'slice', 'egg', 'roll', 'bagel', 'tortilla', 'pita', 'naan', 'dosa', 'idli', 'patty', 'link'],
    bowl: ['cup', 'bowl', 'quantity not specified'],
    katori: ['cup', 'quantity not specified'],
    tbsp: ['tbsp', 'tablespoon'], tsp: ['tsp', 'teaspoon'],
    mug: ['cup'], glass: ['cup'], scoop: ['scoop'], cup: ['cup'],
  }[component.defaultUnit] || [];
  let matching = candidates.filter(item => unitTerms.some(term => item.description.toLowerCase().includes(term)));
  if (!matching.length && component.defaultUnit === 'pc') matching = candidates;
  if (matching.length) {
    const per100 = macrosPer100g(food).kcal;
    const best = matching.sort((a, b) => Math.abs(per100 * a.gramWeight * component.defaultQty / 100 - component.macros.kcal)
      - Math.abs(per100 * b.gramWeight * component.defaultQty / 100 - component.macros.kcal))[0];
    return { grams: best.gramWeight * component.defaultQty, description: `${component.defaultQty} × USDA portion “${best.description}” (${best.gramWeight} g each)` };
  }
  const conventional = { pc: 100, bowl: 240, katori: 124, tbsp: 15, tsp: 5, mug: 240, glass: 250, scoop: 30, cup: 240 }[component.defaultUnit];
  if (!conventional) throw new Error(`${component.id}: no portion basis for ${component.defaultUnit}`);
  return { grams: conventional * component.defaultQty, description: `${component.defaultQty} ${component.defaultUnit}; application-controlled ${conventional} g unit convention` };
}
function scaledMacros(food, grams) {
  const source = macrosPer100g(food);
  const round = value => Math.round(value * 10) / 10;
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, round((Number.isFinite(value) ? value : 0) * grams / 100)]));
}

const INHERITED_REF = 'inherited-catalog-nutrition';
if (!data.provenance?.[INHERITED_REF]) throw new Error(`provenance record ${INHERITED_REF} is missing`);

const rows = [];
for (const component of catalog.components) {
  const meta = data.componentMeta[component.id];
  if (!meta) throw new Error(`${component.id}: missing component metadata`);
  /*
   * revertToCatalog withdraws a USDA claim for a food no record represents in the
   * app's state, restores the inherited pre-CP3A catalog macros, and points the row at
   * the unapproved inherited provenance record. It takes precedence over
   * selectionOverrides; a retained selectionOverrides entry only supplies authored
   * dietary metadata and records the selection a lifted revert would return to.
   * scripts/requalify-from-audit.mjs implements the same rule.
   */
  const revert = policy.revertToCatalog?.[component.id];
  if (revert) {
    const record = data.provenance[INHERITED_REF];
    const retained = policy.selectionOverrides?.[component.id] || {};
    if (retained.dietClass) meta.dietClass = retained.dietClass;
    if (typeof retained.containsOnionGarlic === 'boolean') meta.containsOnionGarlic = retained.containsOnionGarlic;
    const sourceDescription = `${component.name} — inherited Nutrition Sol catalog composition (no qualified USDA source)`;
    meta.catalogOverride = { sourceDescription, macros: { ...component.macros } };
    meta.provenanceRef = INHERITED_REF;
    rows.push({
      componentId: component.id,
      displayName: component.name,
      sourceDescription,
      fdcId: null,
      dataType: null,
      sourceUrl: record.url ?? null,
      portionBasis: `${component.defaultQty} ${component.defaultUnit}; ${record.portionBasis}`,
      basisGrams: null,
      macros: { ...component.macros },
      selectionMethod: 'reverted-to-catalog',
      selectionNote: revert.reason || null,
      remediation: 'revert',
    });
    continue;
  }
  const custom = policy.nonFdcRecords?.[component.id];
  if (custom) {
    const provenanceRef = `qualified-${component.id}`;
    meta.catalogOverride = { sourceDescription: custom.displayName, macros: custom.macros };
    meta.provenanceRef = provenanceRef;
    data.provenance[provenanceRef] = {
      source: custom.source,
      sourceUrl: custom.sourceUrl,
      accessDate: '2026-09-06',
      portionBasis: custom.portionBasis,
      licenseStatus: custom.licenseStatus,
    };
    rows.push({ componentId: component.id, displayName: component.name, sourceDescription: custom.displayName, sourceType: 'NIH/public-domain', sourceUrl: custom.sourceUrl, portionBasis: custom.portionBasis, macros: custom.macros, selectionMethod: 'curated-non-food-record', remediation: 'keep' });
    continue;
  }
  const rule = policy.selectionOverrides?.[component.id] || {};
  const { food, method } = chooseFood(component, rule);
  const basis = portionBasis(component, food, rule);
  const macros = scaledMacros(food, basis.grams);
  const provenanceRef = `qualified-${component.id}-fdc-${food.fdcId}`;
  meta.catalogOverride = { sourceDescription: food.description, macros };
  meta.provenanceRef = provenanceRef;
  if (rule.dietClass) meta.dietClass = rule.dietClass;
  if (typeof rule.containsOnionGarlic === 'boolean') meta.containsOnionGarlic = rule.containsOnionGarlic;
  const sourceUrl = `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`;
  data.provenance[provenanceRef] = {
    source: `USDA FoodData Central ${food.dataType}: ${food.description} (FDC ${food.fdcId})`,
    sourceUrl,
    accessDate: '2026-09-06',
    portionBasis: basis.description,
    licenseStatus: 'approved-cc0-public-domain',
  };
  rows.push({
    componentId: component.id,
    displayName: component.name,
    sourceDescription: food.description,
    fdcId: food.fdcId,
    dataType: food.dataType,
    sourceUrl,
    portionBasis: basis.description,
    basisGrams: basis.grams,
    macros,
    selectionMethod: method,
    selectionNote: rule.selectionNote || null,
    remediation: rule.remediation || 'keep',
  });
}

const register = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  accessDate: '2026-09-06',
  componentCount: rows.length,
  sourceLicense: 'USDA FoodData Central data are CC0/public domain; NIH material is a U.S. government public-domain source.',
  sourceLicenseUrl: 'https://fdc.nal.usda.gov/api-guide/',
  policyFile: path.relative(path.dirname(registerPath), policyPath).replaceAll('\\', '/'),
  rows,
};
fs.writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`);
fs.writeFileSync(dataPath, `/* Generated explicit CP3A food-model sidecar. Qualified catalog overrides are edition-gated. */\n(function (root) {\n  'use strict';\n  root.NutritionFoodModelData = ${JSON.stringify(data, null, 2)};\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n`);
console.log(`Qualified ${rows.length} components and wrote ${registerPath}`);
