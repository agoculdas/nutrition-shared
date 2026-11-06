import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog } from './catalog.mjs';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};

const sourcePaths = [valueAfter('--foundation'), valueAfter('--sr'), valueAfter('--survey')].filter(Boolean);
const outputPath = valueAfter('--output');
if (!sourcePaths.length || !outputPath) {
  console.error('Usage: node scripts/audit-food-sources.mjs --foundation FILE --sr FILE --survey FILE --output FILE');
  process.exit(2);
}

const collectionKeys = ['FoundationFoods', 'SRLegacyFoods', 'SurveyFoods'];
const foods = sourcePaths.flatMap(sourcePath => {
  const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const key = collectionKeys.find(candidate => Array.isArray(parsed[candidate]));
  if (!key) throw new Error(`No supported food collection in ${sourcePath}`);
  return parsed[key].filter(Boolean);
});

const stopWords = new Set(['a', 'and', 'in', 'of', 'plain', 'regular', 'the', 'with']);
const aliases = new Map([
  ['prawns', 'shrimp'], ['pc', 'piece'], ['veggies', 'vegetables'], ['veg', 'vegetables'],
  ['roti', 'chapati'], ['rajma', 'kidney beans'], ['toor', 'pigeon peas'], ['lassi', 'yogurt drink'],
  ['mutton', 'goat'], ['mince', 'ground'], ['mayo', 'mayonnaise'], ['soba', 'buckwheat noodles'],
]);

function tokens(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .flatMap(token => (aliases.get(token) || token).split(' '))
    .filter(token => token && !stopWords.has(token));
}

function nutrient(food, names, unitName = null) {
  const wanted = new Set(names);
  const found = (food.foodNutrients || []).find(entry => wanted.has(entry.nutrient?.name)
    && (!unitName || String(entry.nutrient?.unitName).toLowerCase() === unitName));
  return found?.amount ?? null;
}

function macroSnapshot(food) {
  return {
    kcal: nutrient(food, ['Energy'], 'kcal'),
    p: nutrient(food, ['Protein']),
    f: nutrient(food, ['Total lipid (fat)']),
    c: nutrient(food, ['Carbohydrate, by difference']),
    fiber: nutrient(food, ['Fiber, total dietary']),
  };
}

function textScore(component, food) {
  const nameTokens = new Set(tokens(component.name));
  const subTokens = new Set(tokens(component.sub));
  const candidate = new Set(tokens(food.description));
  let score = 0;
  for (const token of nameTokens) score += candidate.has(token) ? (token.length > 5 ? 8 : 6) : -5;
  for (const token of subTokens) if (candidate.has(token)) score += 0.5;

  const animalTerms = ['beef', 'chicken', 'turkey', 'pork', 'lamb', 'goat', 'duck', 'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'squid', 'scallop', 'mussel', 'octopus', 'mackerel'];
  const requestedAnimals = animalTerms.filter(token => nameTokens.has(token));
  const candidateAnimals = animalTerms.filter(token => candidate.has(token));
  if (requestedAnimals.length && candidateAnimals.length && !requestedAnimals.some(token => candidate.has(token))) score -= 20;
  return score;
}

function macroScore(component, foodMacros) {
  if (component.defaultUnit !== 'g' || component.defaultQty <= 0) return 0;
  const expected = Object.fromEntries(Object.entries(component.macros).map(([key, value]) => [key, value * 100 / component.defaultQty]));
  let error = 0;
  let compared = 0;
  for (const key of ['kcal', 'p', 'f', 'c', 'fiber']) {
    if (foodMacros[key] == null) continue;
    const scale = Math.max(5, expected[key], foodMacros[key]);
    error += Math.abs(expected[key] - foodMacros[key]) / scale;
    compared += 1;
  }
  return compared ? Math.max(-5, 4 - (error / compared) * 8) : 0;
}

const catalog = loadCatalog();
const candidates = catalog.components.map(component => {
  const ranked = foods.map(food => {
    const macrosPer100g = macroSnapshot(food);
    return {
      fdcId: food.fdcId,
      dataType: food.dataType,
      description: food.description,
      score: Number((textScore(component, food) + macroScore(component, macrosPer100g)).toFixed(3)),
      macrosPer100g,
      portions: (food.foodPortions || []).slice(0, 12).map(portion => ({
        description: portion.portionDescription || portion.modifier || portion.measureUnit?.name,
        amount: portion.amount ?? null,
        unit: portion.measureUnit?.name || portion.measureUnit?.abbreviation || null,
        gramWeight: portion.gramWeight ?? null,
      })),
    };
  }).sort((a, b) => b.score - a.score).slice(0, 8);

  return {
    componentId: component.id,
    name: component.name,
    currentBasis: { defaultQty: component.defaultQty, defaultUnit: component.defaultUnit, macros: component.macros },
    candidates: ranked,
  };
});

const result = {
  generatedAt: new Date().toISOString(),
  sourceFiles: sourcePaths.map(sourcePath => path.basename(sourcePath)),
  sourceLicense: 'USDA FoodData Central CC0 1.0 / public domain',
  sourceLicenseUrl: 'https://fdc.nal.usda.gov/api-guide/',
  componentCount: catalog.components.length,
  candidates,
};
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${candidates.length} component audits to ${outputPath}`);
