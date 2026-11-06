(function (global) {
  "use strict";

  const API_VERSION = 1;
  const MACRO_KEYS = ["calories", "protein", "carbs", "fat", "fibre"];
  const SUPPORTED_UNITS = new Set(["count", "pc", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "katori"]);

  function fail(message) {
    throw new TypeError(message);
  }

  function positiveNumber(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      fail(`${name} must be a finite positive number`);
    }
    return value;
  }

  function positiveWhole(value, name) {
    positiveNumber(value, name);
    if (!Number.isInteger(value)) fail(`${name} must be a whole number`);
    return value;
  }

  function nonNegativeNumber(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      fail(`${name} must be finite and non-negative`);
    }
    return value;
  }

  function halfUp(value) {
    return Math.floor(value + 0.5);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach((key) => deepFreeze(value[key]));
    return value;
  }

  function validateRecipe(recipe) {
    if (!recipe || typeof recipe !== "object") fail("recipe must be an object");
    if (typeof recipe.id !== "string" || !recipe.id.trim()) fail("recipe.id is required");
    if ((typeof recipe.version !== "string" && typeof recipe.version !== "number") || String(recipe.version).trim() === "") {
      fail("recipe.version is required");
    }
    positiveWhole(recipe.baseYield, "recipe.baseYield");
    positiveWhole(recipe.minimumYield, "recipe.minimumYield");
    if (!recipe.output || typeof recipe.output.label !== "string" || !recipe.output.label.trim()) {
      fail("recipe.output.label is required");
    }
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) fail("recipe.ingredients must not be empty");

    const ids = new Set();
    recipe.ingredients.forEach((ingredient, index) => {
      const prefix = `recipe.ingredients[${index}]`;
      if (!ingredient || typeof ingredient !== "object") fail(`${prefix} must be an object`);
      if (typeof ingredient.id !== "string" || !ingredient.id.trim()) fail(`${prefix}.id is required`);
      if (ids.has(ingredient.id)) fail(`duplicate ingredient id: ${ingredient.id}`);
      ids.add(ingredient.id);
      positiveNumber(ingredient.amount, `${prefix}.amount`);
      if (!SUPPORTED_UNITS.has(ingredient.unit)) fail(`${prefix}.unit is not supported`);
      if (ingredient.countable && !Number.isInteger(ingredient.amount)) fail(`${prefix}.amount must be whole when countable`);
      if (!ingredient.macros || typeof ingredient.macros !== "object") fail(`${prefix}.macros is required`);
      MACRO_KEYS.forEach((key) => {
        const value = ingredient.macros[key];
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(`${prefix}.macros.${key} must be finite and non-negative`);
      });
    });
    if (recipe.output.ingredientId) {
      const defining = recipe.ingredients.find((item) => item.id === recipe.output.ingredientId);
      if (!defining) fail("recipe.output.ingredientId must reference an ingredient");
      if (!defining.countable) fail("yield-defining ingredient must be countable");
      if (defining.amount !== recipe.baseYield) fail("yield-defining ingredient amount must equal recipe.baseYield");
    }
    recipe.ingredients.forEach((ingredient) => {
      if (ingredient.countable && ingredient.essential && halfUp(ingredient.amount * recipe.minimumYield / recipe.baseYield) === 0) {
        fail(`recipe.minimumYield is too small for essential ingredient ${ingredient.id}`);
      }
    });
    return recipe;
  }

  function sumMacros(ingredients) {
    const totals = Object.fromEntries(MACRO_KEYS.map((key) => [key, 0]));
    ingredients.forEach((ingredient) => {
      MACRO_KEYS.forEach((key) => { totals[key] += ingredient.macros[key]; });
    });
    return totals;
  }

  function scale(recipe, requestedYield) {
    validateRecipe(recipe);
    positiveNumber(requestedYield, "requestedYield");
    const adjustedRequestedYield = Math.max(requestedYield, recipe.minimumYield);
    const factor = adjustedRequestedYield / recipe.baseYield;
    const ingredients = recipe.ingredients.map((source) => {
      const proportionalAmount = source.amount * factor;
      const amount = source.countable ? halfUp(proportionalAmount) : proportionalAmount;
      if (source.countable) nonNegativeNumber(amount, `scaled amount for ${source.id}`);
      else positiveNumber(amount, `scaled amount for ${source.id}`);
      if (source.countable && source.essential && amount === 0) {
        fail(`${source.label || source.id} rounds to zero below the supported batch size`);
      }
      const ratio = amount / source.amount;
      return {
        id: source.id,
        label: source.label,
        amount,
        unit: source.unit,
        countable: Boolean(source.countable),
        kind: source.kind || null,
        state: source.state || null,
        macros: Object.fromEntries(MACRO_KEYS.map((key) => {
          const value = source.macros[key] * ratio;
          nonNegativeNumber(value, `scaled ${key} for ${source.id}`);
          return [key, value];
        }))
      };
    });
    const yieldIngredient = recipe.output.ingredientId
      ? ingredients.find((item) => item.id === recipe.output.ingredientId)
      : null;
    const actualYield = yieldIngredient ? yieldIngredient.amount : halfUp(adjustedRequestedYield);
    if (actualYield < recipe.minimumYield) fail("scaled recipe produced less than its minimum supported yield");
    const batchMacros = sumMacros(ingredients);
    MACRO_KEYS.forEach((key) => nonNegativeNumber(batchMacros[key], `batchMacros.${key}`));
    const perUnitMacros = Object.fromEntries(MACRO_KEYS.map((key) => {
      const value = batchMacros[key] / actualYield;
      nonNegativeNumber(value, `perUnitMacros.${key}`);
      return [key, value];
    }));
    return deepFreeze({
      schemaVersion: API_VERSION,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      outputLabel: recipe.output.label,
      requestedYield,
      adjustedRequestedYield,
      minimumApplied: adjustedRequestedYield !== requestedYield,
      factor,
      actualYield,
      ingredients,
      batchMacros,
      perUnitMacros
    });
  }

  function coverage(actualYield, unitsPerMeal, people, mealsPerDay) {
    positiveWhole(actualYield, "actualYield");
    positiveNumber(unitsPerMeal, "unitsPerMeal");
    if (!Number.isInteger(unitsPerMeal * 2)) fail("unitsPerMeal must use whole or half units");
    positiveWhole(people, "people");
    positiveWhole(mealsPerDay, "mealsPerDay");
    const unitsPerSharedMeal = unitsPerMeal * people;
    const unitsPerDay = unitsPerSharedMeal * mealsPerDay;
    positiveNumber(unitsPerSharedMeal, "unitsPerSharedMeal");
    positiveNumber(unitsPerDay, "unitsPerDay");
    const completeSharedMeals = Math.floor(actualYield / unitsPerSharedMeal);
    const completeDays = Math.floor(actualYield / unitsPerDay);
    const unitsLeft = actualYield - completeDays * unitsPerDay;
    return deepFreeze({ actualYield, unitsPerMeal, people, mealsPerDay, unitsPerSharedMeal, completeSharedMeals, completeDays, unitsLeft, individualMealsLeft: Math.floor(unitsLeft / unitsPerMeal) });
  }

  function calculateCoverage(options) {
    if (!options || typeof options !== "object") fail("coverage options are required");
    return coverage(options.yieldUnits, options.unitsPerMeal, options.people, options.mealsPerDay);
  }

  function createSetupSnapshot(recipe, requestedYield, settings) {
    const scaled = scale(recipe, requestedYield);
    const use = settings || {};
    coverage(scaled.actualYield, use.unitsPerMeal, use.people, use.mealsPerDay);
    return deepFreeze({
      schemaVersion: API_VERSION,
      kind: "meal-prep-setup",
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      requestedYield,
      use: { unitsPerMeal: use.unitsPerMeal, people: use.people, mealsPerDay: use.mealsPerDay },
      recipe: clone(recipe),
      composition: clone(scaled)
    });
  }

  function validateSetupSnapshot(snapshot) {
    if (!snapshot || snapshot.schemaVersion !== API_VERSION || snapshot.kind !== "meal-prep-setup") return false;
    try {
      validateRecipe(snapshot.recipe);
      const expected = scale(snapshot.recipe, snapshot.requestedYield);
      coverage(expected.actualYield, snapshot.use.unitsPerMeal, snapshot.use.people, snapshot.use.mealsPerDay);
      if (snapshot.recipeId !== snapshot.recipe.id || snapshot.recipeId !== snapshot.composition.recipeId) return false;
      if (snapshot.recipeVersion !== snapshot.recipe.version || snapshot.recipeVersion !== snapshot.composition.recipeVersion) return false;
      return JSON.stringify(snapshot.composition) === JSON.stringify(expected);
    } catch (_) {
      return false;
    }
  }

  function createLogSnapshot(scaledComposition, unitsEaten) {
    if (!scaledComposition || typeof scaledComposition !== "object") fail("scaledComposition is required");
    positiveWhole(scaledComposition.actualYield, "scaledComposition.actualYield");
    positiveNumber(unitsEaten, "unitsEaten");
    if (!Number.isInteger(unitsEaten * 2)) fail("unitsEaten must use whole or half units");
    const totals = Object.fromEntries(MACRO_KEYS.map((key) => {
      nonNegativeNumber(scaledComposition.perUnitMacros[key], `scaledComposition.perUnitMacros.${key}`);
      return [key, scaledComposition.perUnitMacros[key] * unitsEaten];
    }));
    return deepFreeze({
      schemaVersion: API_VERSION,
      kind: "meal-prep-log",
      recipeId: scaledComposition.recipeId,
      recipeVersion: scaledComposition.recipeVersion,
      unitsEaten,
      outputLabel: scaledComposition.outputLabel,
      totals,
      composition: clone(scaledComposition)
    });
  }

  global.NutritionMealPrep = deepFreeze({
    API_VERSION,
    MACRO_KEYS: MACRO_KEYS.slice(),
    validateRecipe,
    scale,
    scaleRecipe: scale,
    coverage,
    calculateCoverage,
    createSetupSnapshot,
    validateSetupSnapshot,
    createLogSnapshot
  });
})(typeof window !== "undefined" ? window : globalThis);
