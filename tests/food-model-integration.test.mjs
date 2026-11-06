import assert from 'node:assert/strict';
import test from 'node:test';
import { FoodModel, deriveTotals, loadCatalog, loadFoodModelData } from '../scripts/catalog.mjs';

const catalog = loadCatalog();
const data = loadFoodModelData();
const enriched = FoodModel.enrichCatalog(catalog.components, catalog.presets, data);
const indiaCatalog = FoodModel.enrichCatalog(catalog.components, catalog.presets, data, { applyCatalogOverrides: true });
const byId = new Map(enriched.components.map(x => [x.id, x]));

test('production sidecar exhaustively covers components and preset contexts', () => {
  assert.equal(Object.keys(data.componentMeta).length, catalog.components.length);
  assert.equal(Object.keys(data.presetContextByName).length, catalog.presets.length);
  const result = FoodModel.validateFoodModel(catalog, data);
  assert.deepEqual(result.errors, []);
});

test('enrichment is additive and preserves every existing catalog value', () => {
  for (let i = 0; i < catalog.components.length; i += 1) {
    for (const [key, value] of Object.entries(catalog.components[i])) assert.equal(JSON.stringify(enriched.components[i][key]), JSON.stringify(value));
  }
  for (let i = 0; i < catalog.presets.length; i += 1) {
    for (const [key, value] of Object.entries(catalog.presets[i])) assert.equal(JSON.stringify(enriched.presets[i][key]), JSON.stringify(value));
  }
});

test('qualified nutrition overrides are opt-in and preserve stable component identifiers', () => {
  assert.deepEqual(indiaCatalog.components.map(item => item.id), catalog.components.map(item => item.id));
  assert.deepEqual(indiaCatalog.components.map(item => item.name), catalog.components.map(item => item.name));
  assert.ok(indiaCatalog.components.every(item => typeof item.sourceDescription === 'string' && item.sourceDescription.length > 0));
  assert.ok(indiaCatalog.components.some((item, index) => JSON.stringify(item.macros) !== JSON.stringify(catalog.components[index].macros)));
});

test('every preset classification and onion/garlic result equals its full composition', () => {
  const rank = { vegan: 0, vegetarian: 1, egg: 2, nonveg: 3 };
  const names = ['vegan', 'vegetarian', 'egg', 'nonveg'];
  for (const preset of enriched.presets) {
    const ingredients = preset._builder.map(row => byId.get(row.componentId));
    assert.equal(preset.dietClass, names[Math.max(...ingredients.map(x => rank[x.dietClass]))], preset.name);
    const qualification = data.presetQualificationByName?.[preset.name];
    const ingredientPositive = ingredients.some(x => x.containsOnionGarlic);
    const expected = ingredientPositive || qualification?.containsOnionGarlic === true
      ? true
      : qualification && Object.prototype.hasOwnProperty.call(qualification, 'containsOnionGarlic')
        ? qualification.containsOnionGarlic
        : false;
    assert.equal(preset.containsOnionGarlic, expected, preset.name);
  }
});

test('global vegan preference keeps both shipped vegan meal-prep recipes usable through saved setup and logging', async () => {
  globalThis.window = globalThis;
  await import('../meal-prep-core.js');
  await import('../meal-prep-recipes.js');
  const recipes = globalThis.NutritionMealPrepRecipes;
  const visible = recipes.filter(recipe => FoodModel.evaluateFood({
    ...recipe,
    ...FoodModel.deriveRecipeMetadata(recipe, byId),
  }, { dietType: 'vegan' }).compatible === true);
  assert.deepEqual(visible.map(recipe => recipe.id), ['chickpea-vegetable-curry-rice', 'lentil-bolognese-pasta']);

  const recipe = visible[0];
  const scaled = globalThis.NutritionMealPrep.scale(recipe, recipe.baseYield);
  const usage = { requestedYield: recipe.baseYield, unitsPerMeal: 1, people: 1, mealsPerDay: 1 };
  const setup = globalThis.NutritionMealPrep.createSetupSnapshot(recipe, recipe.baseYield, usage);
  assert.equal(globalThis.NutritionMealPrep.validateSetupSnapshot(setup), true);
  const reopened = setup.recipe;
  assert.equal(FoodModel.evaluateFood({ ...reopened, ...FoodModel.deriveRecipeMetadata(reopened, byId) }, { dietType: 'vegan' }).compatible, true);
  const conflicting = { ...reopened, vegan: true, diet: ['vegan'], ingredients: [...reopened.ingredients, { id: 'conflict', componentId: 'chicken-breast' }] };
  assert.equal(FoodModel.evaluateFood({ ...conflicting, ...FoodModel.deriveRecipeMetadata(conflicting, byId) }, { dietType: 'vegan' }).compatible, false);
  const log = globalThis.NutritionMealPrep.createLogSnapshot(scaled, 1);
  assert.ok(log.totals.calories > 0);
  assert.ok(log.totals.protein > 0);
});

test('all supported production conversions remain finite and preserve preset totals', () => {
  for (const component of enriched.components) {
    for (const unit of component.units) {
      const factor = component.unitFactor?.[unit] ?? (unit === component.defaultUnit ? 1 : NaN);
      assert.ok(Number.isFinite(factor) && factor > 0, `${component.id}/${unit}`);
    }
  }
  for (let i = 0; i < catalog.presets.length; i += 1) {
    const before = deriveTotals(catalog.presets[i]._builder, catalog.components);
    const after = deriveTotals(enriched.presets[i]._builder, enriched.components);
    for (const macro of ['kcal', 'p', 'f', 'c', 'fiber']) assert.ok(Math.abs(before[macro] - after[macro]) <= 1e-9, `${catalog.presets[i].name}/${macro}`);
  }
});

test('active restrictions never return unknown or incompatible production foods', () => {
  for (const preference of [
    { dietType: 'vegan' }, { dietType: 'vegetarian' }, { dietType: 'vegetarian_eggs' },
    { dietType: 'all', noOnionGarlic: true },
  ]) {
    for (const food of FoodModel.filterFoods(enriched.presets, preference)) {
      assert.equal(FoodModel.evaluateFood(food, preference).compatible, true, food.name);
    }
  }
});
