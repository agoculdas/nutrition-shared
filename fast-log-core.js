(function (global) {
  "use strict";

  const API_VERSION = 1;
  const MS_PER_DAY = 86400000;
  const MS_PER_HOUR = 3600000;
  const DAY_KEY_PATTERN = /^log:\d{4}-\d{2}-\d{2}$/;
  const PERIOD_DAYS = { today: 1, week: 7, month: 30 };
  const RECENCY_HALF_LIFE_DAYS = 7;
  const SLOT_BONUS = 1.5;

  function fail(message) {
    throw new TypeError(message);
  }

  function finiteNumber(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) fail(`${name} must be a finite number`);
    return value;
  }

  function nonNegativeNumber(value, name) {
    finiteNumber(value, name);
    if (value < 0) fail(`${name} must be finite and non-negative`);
    return value;
  }

  function positiveNumber(value, name) {
    finiteNumber(value, name);
    if (value <= 0) fail(`${name} must be a finite positive number`);
    return value;
  }

  function positiveWhole(value, name) {
    positiveNumber(value, name);
    if (!Number.isInteger(value)) fail(`${name} must be a whole number`);
    return value;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach((key) => deepFreeze(value[key]));
    return value;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function plainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  // instanceof is unreliable across realms (vm contexts, iframes); the tag is not.
  function isDate(value) {
    return Object.prototype.toString.call(value) === "[object Date]";
  }

  // `now` may be a Date or an ISO string; anything else is a caller error.
  function toDate(value, name) {
    if (isDate(value)) {
      if (!Number.isFinite(value.getTime())) fail(`${name} must be a valid Date`);
      return new Date(value.getTime());
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = new Date(value);
      if (!Number.isFinite(parsed.getTime())) fail(`${name} must be a valid ISO date string`);
      return parsed;
    }
    return fail(`${name} must be a Date or an ISO date string`);
  }

  // Meal macros arrive from JSON storage; treat unusable values as absent rather than as zero.
  function numericValue(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function identityKey(meal) {
    return `${text(meal.name).toLowerCase()}|${text(meal.sub).toLowerCase()}`;
  }

  // addedAt may be missing or malformed; those meals simply carry no slot information.
  function parseAddedAt(value) {
    if (isDate(value)) return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null;
    if (typeof value !== "string" || value.trim() === "") return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  // Local time of day in fractional hours, matching the app's own eating-window maths.
  function hourOfDay(date) {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  }

  function circularHourDistance(a, b) {
    const raw = Math.abs(a - b);
    return Math.min(raw, 24 - raw);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function localDayKey(date) {
    return `log:${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function localMidnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  function dayKeyMidnight(key) {
    const year = Number(key.slice(4, 8));
    const month = Number(key.slice(9, 11));
    const day = Number(key.slice(12, 14));
    const date = new Date(year, month - 1, day);
    return Number.isFinite(date.getTime()) ? date.getTime() : null;
  }

  function validateDayRecord(day, index, label) {
    if (!plainObject(day)) fail(`${label}[${index}] must be an object`);
    if (typeof day.key !== "string" || !DAY_KEY_PATTERN.test(day.key)) fail(`${label}[${index}].key must look like log:YYYY-MM-DD`);
    if (!Array.isArray(day.meals)) fail(`${label}[${index}].meals must be an array`);
    return day;
  }

  function validateTargets(targets) {
    if (!plainObject(targets)) fail("targets must be an object");
    finiteNumber(targets.protein, "targets.protein");
    finiteNumber(targets.caloriesFloor, "targets.caloriesFloor");
    finiteNumber(targets.caloriesTarget, "targets.caloriesTarget");
    for (const group of ["fat", "carbs", "fiber"]) {
      if (!plainObject(targets[group])) fail(`targets.${group} must be an object`);
      finiteNumber(targets[group].min, `targets.${group}.min`);
    }
    return targets;
  }

  function validateTotals(totals) {
    if (!plainObject(totals)) fail("totals must be an object");
    for (const key of ["kcal", "p", "c", "f", "fiber"]) finiteNumber(totals[key], `totals.${key}`);
    return totals;
  }

  // A later entry in a day's meals array is treated as the later log of that day.
  function isNewerOccurrence(candidate, current) {
    if (!current) return true;
    if (candidate.daysAgo !== current.daysAgo) return candidate.daysAgo < current.daysAgo;
    if (candidate.atMs !== current.atMs) return candidate.atMs > current.atMs;
    return candidate.index >= current.index;
  }

  /**
   * Rank the user's own meals from their stored day logs.
   * horizonDays counts today plus the previous horizonDays - 1 days, matching periodKeys.
   */
  function rankMeals(options) {
    if (!plainObject(options)) fail("rankMeals options are required");
    if (!Array.isArray(options.days)) fail("days must be an array");
    const now = toDate(options.now, "now");
    const limit = options.limit === undefined ? 8 : positiveWhole(options.limit, "limit");
    const slotHours = options.slotHours === undefined ? 2.5 : positiveNumber(options.slotHours, "slotHours");
    const horizonDays = options.horizonDays === undefined ? 30 : positiveWhole(options.horizonDays, "horizonDays");

    const nowHour = hourOfDay(now);
    const nowMidnight = localMidnight(now);
    const groups = new Map();

    options.days.forEach((day, dayIndex) => {
      validateDayRecord(day, dayIndex, "days");
      const midnight = dayKeyMidnight(day.key);
      if (midnight === null) return;
      const daysAgo = Math.round((nowMidnight - midnight) / MS_PER_DAY);
      if (!Number.isFinite(daysAgo) || daysAgo < 0 || daysAgo >= horizonDays) return;
      const recencyWeight = Math.pow(0.5, daysAgo / RECENCY_HALF_LIFE_DAYS);

      day.meals.forEach((meal, mealIndex) => {
        if (!plainObject(meal)) return;
        const name = text(meal.name);
        if (!name) return;
        if (numericValue(meal.kcal) === null || numericValue(meal.p) === null) return;

        const at = parseAddedAt(meal.addedAt);
        const slotWeight = at
          ? 1 + SLOT_BONUS * Math.max(0, 1 - circularHourDistance(hourOfDay(at), nowHour) / slotHours)
          : 1;
        const key = identityKey(meal);
        const occurrence = { daysAgo, atMs: at ? at.getTime() : -Infinity, index: mealIndex, at, meal };

        let group = groups.get(key);
        if (!group) {
          group = { key, name: "", sub: "", count: 0, score: 0, best: null };
          groups.set(key, group);
        }
        group.count += 1;
        group.score += recencyWeight * slotWeight;
        if (isNewerOccurrence(occurrence, group.best)) {
          group.best = occurrence;
          group.name = name;
          group.sub = text(meal.sub);
        }
      });
    });

    const entries = [];
    groups.forEach((group) => {
      const copy = clone(group.best.meal);
      delete copy.id;
      delete copy.addedAt;
      entries.push({
        key: group.key,
        name: group.name,
        sub: group.sub,
        count: group.count,
        lastAt: group.best.at ? group.best.at.toISOString() : null,
        score: group.score,
        meal: copy,
      });
    });

    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aAt = a.lastAt ? Date.parse(a.lastAt) : -Infinity;
      const bAt = b.lastAt ? Date.parse(b.lastAt) : -Infinity;
      if (aAt !== bAt) return bAt - aAt;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      if (a.key !== b.key) return a.key < b.key ? -1 : 1;
      return 0;
    });

    return deepFreeze(entries.slice(0, limit));
  }

  function periodKeys(now, period) {
    const date = toDate(now, "now");
    if (typeof period !== "string" || !Object.prototype.hasOwnProperty.call(PERIOD_DAYS, period)) {
      fail("period must be 'today', 'week' or 'month'");
    }
    const total = PERIOD_DAYS[period];
    const keys = [];
    for (let offset = 0; offset < total; offset += 1) {
      keys.push(localDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)));
    }
    return deepFreeze(keys);
  }

  function dayTotals(meals) {
    if (!Array.isArray(meals)) fail("meals must be an array");
    const totals = { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, count: 0 };
    meals.forEach((meal, index) => {
      if (!plainObject(meal)) fail(`meals[${index}] must be an object`);
      totals.kcal += numericValue(meal.kcal) || 0;
      totals.p += numericValue(meal.p) || 0;
      totals.c += numericValue(meal.c) || 0;
      totals.f += numericValue(meal.f) || 0;
      totals.fiber += numericValue(meal.fiber) || 0;
      totals.count += 1;
    });
    return deepFreeze(totals);
  }

  // Exactly the history-sheet rule.
  function isHitDay(totals, targets) {
    validateTotals(totals);
    validateTargets(targets);
    return totals.p >= targets.protein
      && totals.kcal >= targets.caloriesFloor
      && totals.kcal <= targets.caloriesTarget * 1.05
      && totals.f >= targets.fat.min
      && totals.c >= targets.carbs.min
      && totals.fiber >= targets.fiber.min;
  }

  function periodStats(options) {
    if (!plainObject(options)) fail("periodStats options are required");
    if (!Array.isArray(options.days)) fail("days must be an array");
    const targets = validateTargets(options.targets);

    let loggedDays = 0;
    let proteinTotal = 0;
    let kcalTotal = 0;
    let hitDays = 0;

    const cells = options.days.map((day, index) => {
      validateDayRecord(day, index, "days");
      const totals = dayTotals(day.meals);
      const logged = totals.count > 0;
      if (logged) {
        loggedDays += 1;
        proteinTotal += totals.p;
        kcalTotal += totals.kcal;
      }
      const hit = logged && isHitDay(totals, targets);
      if (hit) hitDays += 1;
      return { key: day.key, p: totals.p, kcal: totals.kcal, hit, logged };
    });

    return deepFreeze({
      loggedDays,
      totalDays: options.days.length,
      proteinTotal,
      kcalTotal,
      avgProtein: loggedDays > 0 ? proteinTotal / loggedDays : 0,
      avgKcal: loggedDays > 0 ? kcalTotal / loggedDays : 0,
      density: kcalTotal > 0 ? (proteinTotal / kcalTotal) * 100 : 0,
      hitDays,
      cells,
    });
  }

  function formatProteinTotal(grams) {
    nonNegativeNumber(grams, "grams");
    if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
    return `${Math.round(grams)} g`;
  }

  function picksVisible(options) {
    if (!plainObject(options)) fail("picksVisible options are required");
    const now = toDate(options.now, "now");
    if (!Array.isArray(options.meals)) fail("meals must be an array");
    const proteinRemaining = finiteNumber(options.proteinRemaining, "proteinRemaining");
    if (!plainObject(options.eatingWindow)) fail("eatingWindow must be an object");
    const startHour = finiteNumber(options.eatingWindow.startHour, "eatingWindow.startHour");
    const endHour = finiteNumber(options.eatingWindow.endHour, "eatingWindow.endHour");
    if (startHour > endHour) fail("eatingWindow.startHour must not be after eatingWindow.endHour");
    const gapHours = options.gapHours === undefined ? 2.5 : positiveNumber(options.gapHours, "gapHours");

    let latest = null;
    options.meals.forEach((meal, index) => {
      if (!plainObject(meal)) fail(`meals[${index}] must be an object`);
      const at = parseAddedAt(meal.addedAt);
      if (at && (latest === null || at.getTime() > latest)) latest = at.getTime();
    });

    if (proteinRemaining <= 0) return false;
    const hour = hourOfDay(now);
    if (hour < startHour || hour > endHour) return false;
    if (latest === null) return true;
    return now.getTime() - latest > gapHours * MS_PER_HOUR;
  }

  global.NutritionFastLog = deepFreeze({
    API_VERSION,
    rankMeals,
    periodKeys,
    dayTotals,
    isHitDay,
    periodStats,
    formatProteinTotal,
    picksVisible,
  });
})(typeof window !== "undefined" ? window : globalThis);
