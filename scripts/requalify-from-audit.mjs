/*
 * Offline re-qualification of the CP3A catalog overrides.
 *
 * scripts/qualify-food-catalog.mjs needs the raw USDA FoodData Central release dumps.
 * Those dumps are not kept in the repository, so this script reproduces the same
 * decisions from two artefacts that are kept:
 *   - docs/requirements/evidence/CP3A/source-candidate-audit.json (ranked candidates,
 *     per-100 g macros and USDA portion tables for every component), and
 *   - docs/requirements/evidence/CP3A/food-source-register.json (the previously
 *     generated register, used only to recover per-100 g macros and portion bases for
 *     curated FDC records that never appeared in any component's candidate list).
 *
 * It applies docs/requirements/food-source-policy.json, including the
 * `revertToCatalog` section that withdraws a USDA claim and restores the inherited
 * pre-CP3A catalog macros.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadCatalog } from './catalog.mjs';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const policyPath = valueAfter('--policy') || path.resolve('docs/requirements/food-source-policy.json');
const dataPath = valueAfter('--data') || path.resolve('food-model-data.js');
const registerPath = valueAfter('--register') || path.resolve('docs/requirements/evidence/CP3A/food-source-register.json');
const auditPath = valueAfter('--audit') || path.resolve('docs/requirements/evidence/CP3A/source-candidate-audit.json');
const accessDate = valueAfter('--access-date') || '2026-09-06';
const INHERITED_REF = 'inherited-catalog-nutrition';

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const previousRegister = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const catalog = loadCatalog();

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(dataPath, 'utf8'), context, { filename: dataPath });
const data = JSON.parse(JSON.stringify(context.NutritionFoodModelData));
if (!data.provenance?.[INHERITED_REF]) throw new Error(`provenance record ${INHERITED_REF} is missing`);

const auditById = new Map(audit.candidates.map(item => [item.componentId, item]));
const round = value => Math.round(value * 10) / 10;

/* Every USDA record the audit knows about, keyed by FDC id. */
const foods = new Map();
for (const entry of audit.candidates) {
  for (const candidate of entry.candidates) {
    const id = Number(candidate.fdcId);
    if (foods.has(id)) continue;
    foods.set(id, {
      fdcId: id,
      dataType: candidate.dataType,
      description: candidate.description,
      macrosPer100g: candidate.macrosPer100g,
      portions: (candidate.portions || []).filter(item => Number.isFinite(item.gramWeight) && item.gramWeight > 0),
      origin: 'audit',
    });
  }
}
/*
 * Curated FDC records selected in the first pass are not always present in the audit's
 * top-8 candidate lists. For those the previous register is the only surviving copy of
 * the USDA numbers: per-100 g macros are recovered by dividing the recorded portion
 * macros by the recorded basis, and the recorded portion basis is carried forward
 * verbatim because the USDA portion table cannot be re-read offline.
 */
const recordedBasis = new Map();
for (const row of previousRegister.rows || []) {
  if (!Number.isFinite(row.fdcId) || !Number.isFinite(row.basisGrams) || row.basisGrams <= 0) continue;
  recordedBasis.set(`${row.componentId}:${row.fdcId}`, { grams: row.basisGrams, description: row.portionBasis });
  if (foods.has(Number(row.fdcId))) continue;
  foods.set(Number(row.fdcId), {
    fdcId: Number(row.fdcId),
    dataType: row.dataType,
    description: row.sourceDescription,
    macrosPer100g: Object.fromEntries(Object.entries(row.macros).map(([key, value]) => [key, value * 100 / row.basisGrams])),
    portions: [],
    origin: 'register',
  });
}

function hasCoreMacros(food) {
  return ['kcal', 'p', 'f', 'c'].every(key => Number.isFinite(food?.macrosPer100g?.[key]));
}
function chooseFood(component, rule) {
  if (rule?.fdcId) {
    const food = foods.get(Number(rule.fdcId));
    if (!food) throw new Error(`${component.id}: policy FDC ${rule.fdcId} is not in the audit or the previous register`);
    if (!hasCoreMacros(food)) throw new Error(`${component.id}: policy FDC ${rule.fdcId} lacks core macros`);
    return { food, method: 'curated-override' };
  }
  const candidate = (auditById.get(component.id)?.candidates || [])
    .find(item => hasCoreMacros(foods.get(Number(item.fdcId))));
  if (!candidate) throw new Error(`${component.id}: no complete USDA candidate`);
  return { food: foods.get(Number(candidate.fdcId)), method: 'ranked-candidate-reviewed' };
}
/* Mirrors the portion resolution in scripts/qualify-food-catalog.mjs. */
function portionBasis(component, food, rule) {
  if (Number.isFinite(rule?.basisGrams)) {
    return {
      grams: rule.basisGrams,
      description: rule.portionBasis || `Policy-defined ${rule.basisGrams} g basis for ${component.defaultQty} ${component.defaultUnit}`,
    };
  }
  if (component.defaultUnit === 'g') return { grams: component.defaultQty, description: `${component.defaultQty} g` };
  if (component.defaultUnit === 'ml') return { grams: component.defaultQty, description: `${component.defaultQty} ml modeled as ${component.defaultQty} g; declared application density convention` };
  const unitTerms = {
    pc: ['piece', 'item', 'slice', 'egg', 'roll', 'bagel', 'tortilla', 'pita', 'naan', 'dosa', 'idli', 'patty', 'link'],
    bowl: ['cup', 'bowl', 'quantity not specified'],
    katori: ['cup', 'quantity not specified'],
    tbsp: ['tbsp', 'tablespoon'], tsp: ['tsp', 'teaspoon'],
    mug: ['cup'], glass: ['cup'], scoop: ['scoop'], cup: ['cup'],
  }[component.defaultUnit] || [];
  let matching = food.portions.filter(item => unitTerms.some(term => String(item.description).toLowerCase().includes(term)));
  if (!matching.length && component.defaultUnit === 'pc') matching = food.portions;
  if (matching.length) {
    const per100 = food.macrosPer100g.kcal;
    const best = matching.slice().sort((a, b) => Math.abs(per100 * a.gramWeight * component.defaultQty / 100 - component.macros.kcal)
      - Math.abs(per100 * b.gramWeight * component.defaultQty / 100 - component.macros.kcal))[0];
    return { grams: best.gramWeight * component.defaultQty, description: `${component.defaultQty} × USDA portion “${best.description}” (${best.gramWeight} g each)` };
  }
  const recorded = recordedBasis.get(`${component.id}:${food.fdcId}`);
  if (recorded) return { grams: recorded.grams, description: recorded.description };
  const conventional = { pc: 100, bowl: 240, katori: 124, tbsp: 15, tsp: 5, mug: 240, glass: 250, scoop: 30, cup: 240 }[component.defaultUnit];
  if (!conventional) throw new Error(`${component.id}: no portion basis for ${component.defaultUnit}`);
  return { grams: conventional * component.defaultQty, description: `${component.defaultQty} ${component.defaultUnit}; application-controlled ${conventional} g unit convention` };
}
function scaledMacros(food, grams) {
  return Object.fromEntries(Object.entries(food.macrosPer100g)
    .map(([key, value]) => [key, round((Number.isFinite(value) ? value : 0) * grams / 100)]));
}

const rows = [];
for (const component of catalog.components) {
  const meta = data.componentMeta[component.id];
  if (!meta) throw new Error(`${component.id}: missing component metadata`);

  const revert = policy.revertToCatalog?.[component.id];
  if (revert) {
    const record = data.provenance[INHERITED_REF];
    /* A withdrawn nutrition claim does not withdraw the authored dietary metadata. */
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
      accessDate,
      portionBasis: custom.portionBasis,
      licenseStatus: custom.licenseStatus,
    };
    rows.push({
      componentId: component.id,
      displayName: component.name,
      sourceDescription: custom.displayName,
      sourceType: 'NIH/public-domain',
      sourceUrl: custom.sourceUrl,
      portionBasis: custom.portionBasis,
      macros: custom.macros,
      selectionMethod: 'curated-non-food-record',
      remediation: 'keep',
    });
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
    accessDate,
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
  accessDate,
  componentCount: rows.length,
  sourceLicense: 'USDA FoodData Central data are CC0/public domain; NIH material is a U.S. government public-domain source.',
  sourceLicenseUrl: 'https://fdc.nal.usda.gov/api-guide/',
  policyFile: path.relative(path.dirname(registerPath), policyPath).replaceAll('\\', '/'),
  generator: 'scripts/requalify-from-audit.mjs',
  remediationCounts: rows.reduce((out, row) => ({ ...out, [row.remediation]: (out[row.remediation] || 0) + 1 }), {}),
  unqualifiedComponents: rows.filter(row => row.remediation === 'revert').map(row => row.componentId),
  rows,
};
fs.writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`);
fs.writeFileSync(dataPath, `/* Generated explicit CP3A food-model sidecar. Qualified catalog overrides are edition-gated. */\n(function (root) {\n  'use strict';\n  root.NutritionFoodModelData = ${JSON.stringify(data, null, 2)};\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n`);
console.log(`Requalified ${rows.length} components (${JSON.stringify(register.remediationCounts)}) and wrote ${registerPath}`);
