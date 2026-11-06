import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { beforeEach } from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../meal-prep-core.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const core = context.window.NutritionMealPrep;

const BASE_RECIPE = {
  id: "test-burrito", version: 3, baseYield: 4, minimumYield: 1,
  output: { label: "burrito", ingredientId: "wrap" },
  ingredients: [
    { id: "wrap", label: "Wraps", amount: 4, unit: "count", countable: true, kind: "wrapper", state: "ready-to-eat", macros: { calories: 400, protein: 12, carbs: 72, fat: 8, fibre: 8 } },
    { id: "bean", label: "Beans", amount: 400, unit: "g", state: "cooked, drained", macros: { calories: 500, protein: 32, carbs: 80, fat: 4, fibre: 28 } },
    { id: "lime", label: "Limes", amount: 1, unit: "count", countable: true, state: "raw", macros: { calories: 20, protein: 0.5, carbs: 7, fat: 0.1, fibre: 2 } }
  ]
};
let recipe;
beforeEach(() => { recipe = structuredClone(BASE_RECIPE); });

test("count ingredients use nearest whole with halves rounded up and define actual yield", () => {
  assert.equal(core.scale(recipe, 2.4).actualYield, 2);
  const upper = core.scale(recipe, 2.6);
  assert.equal(upper.actualYield, 3);
  assert.equal(upper.ingredients.find((item) => item.id === "lime").amount, 1);
  assert.equal(upper.ingredients.find((item) => item.id === "bean").amount, 260);
});

test("nutrition derives from rounded composition rather than requested scale alone", () => {
  const result = core.scale(recipe, 2);
  const expectedCalories = 200 + 250 + 20;
  assert.equal(result.batchMacros.calories, expectedCalories);
  assert.equal(result.perUnitMacros.calories, expectedCalories / 2);
});

test("minimum yield clamps continuous requested scaling", () => {
  const result = core.scale(recipe, 0.1);
  assert.equal(result.adjustedRequestedYield, 1);
  assert.equal(result.minimumApplied, true);
  assert.equal(result.actualYield, 1);
});

test("recipe minimum must keep essential count ingredients above zero", () => {
  const essential = {
    ...recipe,
    ingredients: recipe.ingredients.map((item) => item.id === "lime" ? { ...item, essential: true } : item)
  };
  assert.throws(() => core.scale(essential, 1), /minimumYield is too small/);
});

test("equal-portion recipes round actual output while keeping proportional ingredients", () => {
  const pot = { ...recipe, id: "pot", output: { label: "portion" } };
  const result = core.scale(pot, 2.5);
  assert.equal(result.actualYield, 3);
  assert.equal(result.ingredients.find((item) => item.id === "bean").amount, 250);
});

test("coverage matches annex examples and explains leftovers", () => {
  assert.deepEqual({ ...core.coverage(12, 2, 1, 1) }, { actualYield: 12, unitsPerMeal: 2, people: 1, mealsPerDay: 1, unitsPerSharedMeal: 2, completeSharedMeals: 6, completeDays: 6, unitsLeft: 0, individualMealsLeft: 0 });
  assert.equal(core.coverage(12, 2, 2, 1).completeDays, 3);
  const leftovers = core.coverage(10, 2, 2, 1);
  assert.equal(leftovers.completeDays, 2);
  assert.equal(leftovers.unitsLeft, 2);
  assert.equal(leftovers.individualMealsLeft, 1);
  assert.equal(core.coverage(12, 1, 1, 2).completeDays, 6);
  assert.equal(core.coverage(1, 2, 2, 1).completeDays, 0);
});

test("coverage rejects invalid and unsupported inputs", () => {
  for (const args of [[0, 1, 1, 1], [2.5, 1, 1, 1], [2, 0, 1, 1], [2, 0.3, 1, 1], [2, 1, 1.5, 1], [2, 1, 1, Infinity]]) {
    assert.throws(() => core.coverage(...args), /must/);
  }
  assert.equal(core.coverage(3, 0.5, 1, 1).completeSharedMeals, 6);
});

test("saved setup round-trips as a versioned immutable composition snapshot", () => {
  const saved = core.createSetupSnapshot(recipe, 2.6, { unitsPerMeal: 1.5, people: 2, mealsPerDay: 1 });
  const roundTrip = JSON.parse(JSON.stringify(saved));
  assert.equal(core.validateSetupSnapshot(roundTrip), true);
  assert.equal(roundTrip.recipeVersion, 3);
  assert.equal(roundTrip.recipe.ingredients[0].state, "ready-to-eat");
  recipe.ingredients[0].macros.calories = 9999;
  assert.equal(roundTrip.composition.batchMacros.calories, saved.composition.batchMacros.calories);
  assert.equal(Object.isFrozen(saved.composition.ingredients[0]), true);
  assert.equal(core.validateSetupSnapshot({ ...roundTrip, schemaVersion: 99 }), false);
});

test("object coverage alias supports the UI contract", () => {
  assert.equal(core.scaleRecipe, core.scale);
  assert.equal(core.calculateCoverage({ yieldUnits: 12, unitsPerMeal: 2, people: 2, mealsPerDay: 1 }).completeDays, 3);
});

test("log snapshots preserve totals and composition after recipe mutation", () => {
  const scaled = core.scale({ ...recipe, ingredients: recipe.ingredients.map((i) => ({ ...i, macros: { ...i.macros } })) }, 4);
  const logged = core.createLogSnapshot(scaled, 1.5);
  const before = JSON.stringify(logged);
  recipe.version = 4;
  recipe.ingredients[1].macros.calories = 1;
  assert.equal(JSON.stringify(logged), before);
  assert.equal(logged.totals.calories, scaled.perUnitMacros.calories * 1.5);
});

test("recipe validation catches missing references and invalid macro values", () => {
  assert.throws(() => core.scale({ ...recipe, output: { label: "x", ingredientId: "missing" } }, 2), /reference/);
  assert.throws(() => core.scale({ ...recipe, ingredients: [{ ...recipe.ingredients[0], macros: { ...recipe.ingredients[0].macros, fat: NaN } }] }, 2), /finite/);
});

test("yield-defining base count and countable quantities are coherent", () => {
  assert.throws(() => core.validateRecipe({ ...recipe, baseYield: 5 }), /must equal/);
  const fractional = { ...recipe, ingredients: recipe.ingredients.map((item) => item.id === "wrap" ? { ...item, amount: 3.5 } : item) };
  assert.throws(() => core.validateRecipe(fractional), /must be whole/);
  const unsupported = { ...recipe, ingredients: recipe.ingredients.map((item) => item.id === "bean" ? { ...item, unit: "handful" } : item) };
  assert.throws(() => core.validateRecipe(unsupported), /not supported/);
});

test("scale rejects finite inputs whose derived values overflow", () => {
  assert.throws(() => core.scale(recipe, Number.MAX_VALUE), /finite/);
});

test("setup validation rejects missing recipes, invalid servings, and tampering", () => {
  const saved = JSON.parse(JSON.stringify(core.createSetupSnapshot(recipe, 4, { unitsPerMeal: 1, people: 1, mealsPerDay: 1 })));
  assert.equal(core.validateSetupSnapshot({ ...saved, recipe: undefined }), false);
  assert.equal(core.validateSetupSnapshot({ ...saved, use: { ...saved.use, unitsPerMeal: 0.3 } }), false);
  const tampered = structuredClone(saved);
  tampered.composition.batchMacros.calories += 1;
  assert.equal(core.validateSetupSnapshot(tampered), false);
  const mismatched = structuredClone(saved);
  mismatched.recipe.version += 1;
  assert.equal(core.validateSetupSnapshot(mismatched), false);
});
