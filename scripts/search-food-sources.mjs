import fs from 'node:fs';

const args = process.argv.slice(2);
const valuesAfter = flag => {
  const result = [];
  for (let index = 0; index < args.length; index += 1) if (args[index] === flag) result.push(args[index + 1]);
  return result;
};
const sourcePaths = valuesAfter('--source');
const queries = valuesAfter('--query').map(value => value.toLowerCase());
if (!sourcePaths.length || !queries.length) {
  console.error('Usage: node scripts/search-food-sources.mjs --source FILE [...] --query TEXT [...]');
  process.exit(2);
}

const collectionKeys = ['FoundationFoods', 'SRLegacyFoods', 'SurveyFoods'];
const foods = sourcePaths.flatMap(sourcePath => {
  const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const key = collectionKeys.find(candidate => Array.isArray(parsed[candidate]));
  if (!key) throw new Error(`No supported food collection in ${sourcePath}`);
  return parsed[key].filter(Boolean);
});

function nutrient(food, name, unitName = null) {
  const found = (food.foodNutrients || []).find(entry => entry.nutrient?.name === name
    && (!unitName || String(entry.nutrient?.unitName).toLowerCase() === unitName));
  return found?.amount ?? null;
}

for (const query of queries) {
  const terms = query.split(/\s+/).filter(Boolean);
  const matches = foods.filter(food => terms.every(term => food.description.toLowerCase().includes(term))).slice(0, 40);
  console.log(`\n# ${query} (${matches.length}${matches.length === 40 ? '+' : ''})`);
  for (const food of matches) {
    console.log(JSON.stringify({
      fdcId: food.fdcId,
      dataType: food.dataType,
      description: food.description,
      macrosPer100g: {
        kcal: nutrient(food, 'Energy', 'kcal'),
        p: nutrient(food, 'Protein'),
        f: nutrient(food, 'Total lipid (fat)'),
        c: nutrient(food, 'Carbohydrate, by difference'),
        fiber: nutrient(food, 'Fiber, total dietary'),
      },
      portions: (food.foodPortions || []).slice(0, 8).map(item => ({
        description: item.portionDescription || item.modifier || item.measureUnit?.name,
        amount: item.amount ?? null,
        unit: item.measureUnit?.name || item.measureUnit?.abbreviation || null,
        gramWeight: item.gramWeight ?? null,
      })),
    }));
  }
}
