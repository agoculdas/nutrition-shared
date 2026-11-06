import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../fast-log-core.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const core = context.window.NutritionFastLog;

// Local-time helpers that mirror index.html's dateKey() and the stored addedAt format.
const key = (y, m, d) => `log:${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).toISOString();
const NOW = new Date(2026, 8, 6, 13, 0, 0); // Sunday 6 September 2026, 13:00 local
const TARGETS = {
  protein: 140,
  caloriesTarget: 2000,
  caloriesFloor: 1500,
  fat: { min: 55, max: 75 },
  carbs: { min: 180, max: 250 },
  fiber: { min: 25, max: 35 },
};
const WINDOW = { startHour: 7, endHour: 22 };
const plain = value => JSON.parse(JSON.stringify(value));
const names = ranked => [...ranked].map(entry => entry.name);
const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} vs ${expected}`);

// The history-sheet rule, re-implemented here so periodStats is checked against it rather than itself.
function historyHit(totals, targets) {
  return totals.p >= targets.protein
    && totals.kcal >= targets.caloriesFloor
    && totals.kcal <= targets.caloriesTarget * 1.05
    && totals.f >= targets.fat.min
    && totals.c >= targets.carbs.min
    && totals.fiber >= targets.fiber.min;
}

test("API surface is exactly the fast-log contract", () => {
  assert.equal(core.API_VERSION, 1);
  assert.deepEqual(Object.keys(core).sort(), [
    "API_VERSION", "dayTotals", "formatProteinTotal", "isHitDay",
    "periodKeys", "periodStats", "picksVisible", "rankMeals",
  ]);
});

test("FL-1 a meal logged yesterday ranks today and returns a loggable copy", () => {
  const builder = [{ componentId: "rajma", qty: 180, unit: "g" }];
  const mealPrep = { schemaVersion: 1, kind: "meal-prep-log", recipeId: "rajma-batch", unitsEaten: 1 };
  const ranked = core.rankMeals({
    days: [{
      key: key(2026, 9, 5),
      meals: [{
        id: 17, name: "Rajma bowl", sub: "1 katori", kcal: 420, p: 22, c: 55, f: 9, fiber: 12,
        addedAt: at(2026, 9, 5, 13, 0), _builder: builder, _mealPrep: mealPrep,
      }],
    }],
    now: NOW,
  });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].key, "rajma bowl|1 katori");
  assert.equal(ranked[0].name, "Rajma bowl");
  assert.equal(ranked[0].sub, "1 katori");
  assert.equal(ranked[0].count, 1);
  assert.equal(ranked[0].lastAt, at(2026, 9, 5, 13, 0));
  assert.deepEqual(plain(ranked[0].meal), {
    name: "Rajma bowl", sub: "1 katori", kcal: 420, p: 22, c: 55, f: 9, fiber: 12,
    _builder: builder, _mealPrep: mealPrep,
  });
  assert.equal("id" in ranked[0].meal, false);
  assert.equal("addedAt" in ranked[0].meal, false);
  assert.equal(Object.isFrozen(ranked[0].meal), true);
  // Copy, not a reference into the caller's day records.
  assert.notEqual(ranked[0].meal._builder, builder);
});

// FL-2, derived by hand with r = 0.5 ** (1/7) = 0.905723663:
//   r^1 = 0.905723664  r^2 = 0.820335356  r^3 = 0.742997145  r^4 = 0.672950096
// At 13:00 the lunch bowl sits at hour distance 0 -> slotWeight 1 + 1.5 * 1 = 2.5,
// the eggs sit at distance 5 h -> 5 / 2.5 = 2 -> max(0, 1 - 2) = 0 -> slotWeight 1.
//   lunch (2 days) = 2.5 * (r^1 + r^2)             = 2.5 * 1.726059020 = 4.315147551
//   eggs  (4 days) = 1.0 * (r^1 + r^2 + r^3 + r^4) =                     3.142006261
// Twice-eaten-in-slot beats four-times-eaten-out-of-slot. At 08:00 the weights swap:
//   lunch = 1.726059020, eggs = 2.5 * 3.142006261 = 7.855015653.
test("FL-2 slot weighting outranks raw frequency at the matching hour and loses at another", () => {
  const days = [
    { key: key(2026, 9, 5), meals: [
      { id: 1, name: "Lunch bowl", kcal: 600, p: 45, addedAt: at(2026, 9, 5, 13, 0) },
      { id: 2, name: "Morning eggs", kcal: 300, p: 25, addedAt: at(2026, 9, 5, 8, 0) },
    ] },
    { key: key(2026, 9, 4), meals: [
      { id: 3, name: "Lunch bowl", kcal: 600, p: 45, addedAt: at(2026, 9, 4, 13, 0) },
      { id: 4, name: "Morning eggs", kcal: 300, p: 25, addedAt: at(2026, 9, 4, 8, 0) },
    ] },
    { key: key(2026, 9, 3), meals: [{ id: 5, name: "Morning eggs", kcal: 300, p: 25, addedAt: at(2026, 9, 3, 8, 0) }] },
    { key: key(2026, 9, 2), meals: [{ id: 6, name: "Morning eggs", kcal: 300, p: 25, addedAt: at(2026, 9, 2, 8, 0) }] },
  ];

  const atLunch = core.rankMeals({ days, now: NOW });
  assert.deepEqual(names(atLunch), ["Lunch bowl", "Morning eggs"]);
  close(atLunch[0].score, 4.315147551, "lunch score at 13:00");
  close(atLunch[1].score, 3.142006261, "eggs score at 13:00");
  assert.deepEqual([...atLunch].map(entry => entry.count), [2, 4]);

  const atBreakfast = core.rankMeals({ days, now: new Date(2026, 8, 6, 8, 0, 0) });
  assert.deepEqual(names(atBreakfast), ["Morning eggs", "Lunch bowl"]);
  close(atBreakfast[0].score, 7.855015653, "eggs score at 08:00");
  close(atBreakfast[1].score, 1.726059020, "lunch score at 08:00");
});

test("meals dedupe on the normalised name|sub identity and keep the newest occurrence", () => {
  const ranked = core.rankMeals({
    days: [
      { key: key(2026, 9, 6), meals: [{ id: 1, name: "  Paneer Bhurji ", sub: " Large ", kcal: 400, p: 30, addedAt: at(2026, 9, 6, 12, 0) }] },
      { key: key(2026, 9, 5), meals: [{ id: 2, name: "paneer bhurji", sub: "large", kcal: 380, p: 28, addedAt: at(2026, 9, 5, 12, 0) }] },
      { key: key(2026, 9, 5), meals: [{ id: 3, name: "Paneer bhurji", sub: "small", kcal: 200, p: 15, addedAt: at(2026, 9, 5, 12, 0) }] },
    ],
    now: NOW,
  });

  assert.deepEqual([...ranked].map(entry => entry.key), ["paneer bhurji|large", "paneer bhurji|small"]);
  assert.equal(ranked[0].count, 2);
  assert.equal(ranked[0].name, "Paneer Bhurji");
  assert.equal(ranked[0].sub, "Large");
  assert.equal(ranked[0].meal.kcal, 400);
  assert.equal(ranked[1].count, 1);
  // Meals without sub group under an empty sub segment.
  const noSub = core.rankMeals({
    days: [{ key: key(2026, 9, 6), meals: [{ name: "Dal", kcal: 200, p: 12 }, { name: "dal", kcal: 210, p: 13 }] }],
    now: NOW,
  });
  assert.equal(noSub.length, 1);
  assert.equal(noSub[0].key, "dal|");
  assert.equal(noSub[0].count, 2);
});

test("ties break by lastAt then name and the ordering is stable under input reordering", () => {
  const stamp = at(2026, 9, 5, 13, 0);
  const meals = [
    { id: 1, name: "Beta bowl", kcal: 300, p: 20, addedAt: stamp },
    { id: 2, name: "Alpha bowl", kcal: 300, p: 20, addedAt: stamp },
    { id: 3, name: "Charlie bowl", kcal: 300, p: 20, addedAt: stamp },
  ];
  const forward = core.rankMeals({ days: [{ key: key(2026, 9, 5), meals }], now: NOW });
  const reversed = core.rankMeals({ days: [{ key: key(2026, 9, 5), meals: [...meals].reverse() }], now: NOW });
  assert.deepEqual(names(forward), ["Alpha bowl", "Beta bowl", "Charlie bowl"]);
  assert.deepEqual(names(reversed), names(forward));

  // Equal scores but different lastAt: the newer occurrence wins before the name tie-break.
  const byTime = core.rankMeals({
    days: [{ key: key(2026, 9, 5), meals: [
      { id: 1, name: "Aaa", kcal: 300, p: 20, addedAt: at(2026, 9, 5, 11, 0) },
      { id: 2, name: "Zzz", kcal: 300, p: 20, addedAt: at(2026, 9, 5, 15, 0) },
    ] }],
    now: NOW,
  });
  assert.deepEqual(names(byTime), ["Zzz", "Aaa"]);
});

test("invalid meals are skipped and malformed addedAt only drops the slot bonus", () => {
  const ranked = core.rankMeals({
    days: [{ key: key(2026, 9, 6), meals: [
      { id: 1, name: "Good meal", kcal: 400, p: 30, addedAt: "not-a-date" },
      { id: 2, name: "No kcal", p: 30 },
      { id: 3, name: "NaN kcal", kcal: NaN, p: 30 },
      { id: 4, name: "Infinite protein", kcal: 400, p: Infinity },
      { id: 5, name: "   ", kcal: 400, p: 30 },
      null,
      "not a meal",
      [{ name: "array", kcal: 1, p: 1 }],
    ] }],
    now: NOW,
  });
  assert.deepEqual(names(ranked), ["Good meal"]);
  assert.equal(ranked[0].lastAt, null);
  close(ranked[0].score, 1, "score with no usable addedAt is recency only");
});

test("limit and horizonDays bound the result", () => {
  const days = [
    { key: key(2026, 9, 6), meals: [{ id: 1, name: "Today meal", kcal: 300, p: 30 }] },
    { key: key(2026, 9, 5), meals: [{ id: 2, name: "Yesterday meal", kcal: 300, p: 25 }] },
    { key: key(2026, 9, 1), meals: [{ id: 3, name: "Five days ago", kcal: 300, p: 20 }] },
    { key: key(2026, 7, 20), meals: [{ id: 4, name: "Ancient meal", kcal: 300, p: 15 }] },
    { key: key(2026, 9, 9), meals: [{ id: 5, name: "Future meal", kcal: 300, p: 10 }] },
  ];
  assert.deepEqual(names(core.rankMeals({ days, now: NOW })),
    ["Today meal", "Yesterday meal", "Five days ago"]);
  assert.equal(core.rankMeals({ days, now: NOW, limit: 2 }).length, 2);
  assert.deepEqual(names(core.rankMeals({ days, now: NOW, limit: 1 })), ["Today meal"]);
  assert.deepEqual(names(core.rankMeals({ days, now: NOW, horizonDays: 3 })),
    ["Today meal", "Yesterday meal"]);
  assert.deepEqual(names(core.rankMeals({ days, now: NOW, horizonDays: 1 })), ["Today meal"]);
  assert.equal(core.rankMeals({ days: [], now: NOW }).length, 0);
});

test("rankMeals accepts an ISO string for now", () => {
  const iso = NOW.toISOString();
  const days = [{ key: key(2026, 9, 5), meals: [{ id: 1, name: "Lunch bowl", kcal: 600, p: 45, addedAt: at(2026, 9, 5, 13, 0) }] }];
  assert.deepEqual(plain(core.rankMeals({ days, now: iso })), plain(core.rankMeals({ days, now: NOW })));
});

test("periodKeys returns today first with the right count for every period", () => {
  const dateKey = offset => key(...(() => {
    const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - offset);
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  })());

  const today = core.periodKeys(NOW, "today");
  const week = core.periodKeys(NOW, "week");
  const month = core.periodKeys(NOW, "month");

  assert.deepEqual([...today], ["log:2026-09-06"]);
  assert.equal(week.length, 7);
  assert.equal(month.length, 30);
  assert.equal(week[0], "log:2026-09-06");
  assert.equal(month[0], "log:2026-09-06");
  assert.equal(week[6], "log:2026-08-31");
  assert.equal(month[29], "log:2026-08-08");
  for (let offset = 0; offset < 30; offset += 1) assert.equal(month[offset], dateKey(offset));
  assert.deepEqual([...week], [...month].slice(0, 7));
  assert.equal(new Set(month).size, 30);
  assert.equal(Object.isFrozen(month), true);
  // Month rollover from the first of a month.
  assert.deepEqual([...core.periodKeys(new Date(2026, 2, 1, 9, 0, 0), "week")],
    ["log:2026-03-01", "log:2026-02-28", "log:2026-02-27", "log:2026-02-26", "log:2026-02-25", "log:2026-02-24", "log:2026-02-23"]);
});

test("dayTotals sums macros and counts meals", () => {
  assert.deepEqual({ ...core.dayTotals([]) }, { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, count: 0 });
  assert.deepEqual({ ...core.dayTotals([
    { kcal: 400, p: 30, c: 40, f: 10, fiber: 6 },
    { kcal: 250, p: 20, c: 12, f: 8, fiber: 4 },
    { kcal: 100, p: 5 },
  ]) }, { kcal: 750, p: 55, c: 52, f: 18, fiber: 10, count: 3 });
});

test("isHitDay matches the history-sheet rule at its boundaries", () => {
  const base = { kcal: 1800, p: 140, c: 200, f: 60, fiber: 30 };
  assert.equal(core.isHitDay(base, TARGETS), true);
  // kcal at exactly the floor and at exactly target * 1.05 both pass.
  assert.equal(core.isHitDay({ ...base, kcal: 1500 }, TARGETS), true);
  assert.equal(core.isHitDay({ ...base, kcal: 2100 }, TARGETS), true);
  assert.equal(core.isHitDay({ ...base, kcal: 1499.9 }, TARGETS), false);
  assert.equal(core.isHitDay({ ...base, kcal: 2100.1 }, TARGETS), false);
  // Protein one gram below target fails; exactly at target passes.
  assert.equal(core.isHitDay({ ...base, p: 139 }, TARGETS), false);
  assert.equal(core.isHitDay({ ...base, p: 140 }, TARGETS), true);
  assert.equal(core.isHitDay({ ...base, f: 55 }, TARGETS), true);
  assert.equal(core.isHitDay({ ...base, f: 54.9 }, TARGETS), false);
  assert.equal(core.isHitDay({ ...base, c: 180 }, TARGETS), true);
  assert.equal(core.isHitDay({ ...base, c: 179 }, TARGETS), false);
  assert.equal(core.isHitDay({ ...base, fiber: 25 }, TARGETS), true);
  assert.equal(core.isHitDay({ ...base, fiber: 24.9 }, TARGETS), false);
  assert.equal(core.isHitDay(core.dayTotals([]), TARGETS), false);
});

test("FL-5 periodStats aggregates a fixture the same way the history sheet does", () => {
  const days = [
    { key: key(2026, 9, 6), meals: [
      { kcal: 900, p: 80, c: 100, f: 30, fiber: 15 },
      { kcal: 900, p: 65, c: 100, f: 30, fiber: 16 },
    ] },                                                     // 1800 kcal, 145 p -> hit
    { key: key(2026, 9, 5), meals: [{ kcal: 1200, p: 100, c: 150, f: 40, fiber: 30 }] }, // below floor -> miss
    { key: key(2026, 9, 4), meals: [] },                     // not logged
    { key: key(2026, 9, 3), meals: [{ kcal: 1600, p: 150, c: 200, f: 60, fiber: 28 }] }, // hit
  ];
  const stats = core.periodStats({ days, targets: TARGETS });

  assert.equal(stats.totalDays, 4);
  assert.equal(stats.loggedDays, 3);
  assert.equal(stats.proteinTotal, 395);
  assert.equal(stats.kcalTotal, 4600);
  assert.equal(stats.hitDays, 2);
  close(stats.avgProtein, 395 / 3, "avgProtein over logged days");
  close(stats.avgKcal, 4600 / 3, "avgKcal over logged days");
  close(stats.density, (395 / 4600) * 100, "density in g per 100 kcal");
  assert.deepEqual(stats.cells.map(cell => cell.key), days.map(day => day.key));
  assert.deepEqual(stats.cells.map(cell => cell.logged), [true, true, false, true]);
  assert.deepEqual(stats.cells.map(cell => cell.hit), [true, false, false, true]);
  assert.deepEqual(stats.cells.map(cell => cell.p), [145, 100, 0, 150]);
  assert.deepEqual(stats.cells.map(cell => cell.kcal), [1800, 1200, 0, 1600]);

  // Cross-check every cell against an independent implementation of the history rule.
  days.forEach((day, index) => {
    const totals = core.dayTotals(day.meals);
    const expected = day.meals.length > 0 && historyHit(totals, TARGETS);
    assert.equal(stats.cells[index].hit, expected, `cell ${index}`);
  });

  const empty = core.periodStats({ days: [{ key: key(2026, 9, 6), meals: [] }], targets: TARGETS });
  assert.deepEqual({ ...empty, cells: undefined }, {
    loggedDays: 0, totalDays: 1, proteinTotal: 0, kcalTotal: 0,
    avgProtein: 0, avgKcal: 0, density: 0, hitDays: 0, cells: undefined,
  });
  assert.equal(core.periodStats({ days: [], targets: TARGETS }).totalDays, 0);
});

test("formatProteinTotal switches to kilograms at one thousand grams", () => {
  assert.equal(core.formatProteinTotal(0), "0 g");
  assert.equal(core.formatProteinTotal(640), "640 g");
  assert.equal(core.formatProteinTotal(640.4), "640 g");
  assert.equal(core.formatProteinTotal(999), "999 g");
  assert.equal(core.formatProteinTotal(1000), "1.0 kg");
  assert.equal(core.formatProteinTotal(1900), "1.9 kg");
  assert.equal(core.formatProteinTotal(1949), "1.9 kg");
  assert.equal(core.formatProteinTotal(4200), "4.2 kg");
});

test("picksVisible follows each of the three conditions independently", () => {
  const base = { now: NOW, meals: [], proteinRemaining: 60, eatingWindow: WINDOW };
  assert.equal(core.picksVisible(base), true);

  // Protein remaining must be above zero.
  assert.equal(core.picksVisible({ ...base, proteinRemaining: 0 }), false);
  assert.equal(core.picksVisible({ ...base, proteinRemaining: -12 }), false);
  assert.equal(core.picksVisible({ ...base, proteinRemaining: 0.5 }), true);

  // The eating window is inclusive at both ends.
  assert.equal(core.picksVisible({ ...base, now: new Date(2026, 8, 6, 7, 0, 0) }), true);
  assert.equal(core.picksVisible({ ...base, now: new Date(2026, 8, 6, 22, 0, 0) }), true);
  assert.equal(core.picksVisible({ ...base, now: new Date(2026, 8, 6, 6, 59, 0) }), false);
  assert.equal(core.picksVisible({ ...base, now: new Date(2026, 8, 6, 22, 1, 0) }), false);

  // The gap since the most recent logged meal must exceed gapHours.
  const logged = minutesAgo => [{ name: "Snack", kcal: 200, p: 15, addedAt: new Date(NOW.getTime() - minutesAgo * 60000).toISOString() }];
  assert.equal(core.picksVisible({ ...base, meals: logged(180) }), true);
  assert.equal(core.picksVisible({ ...base, meals: logged(60) }), false);
  assert.equal(core.picksVisible({ ...base, meals: logged(150) }), false); // exactly 2.5 h is not "more than"
  assert.equal(core.picksVisible({ ...base, meals: logged(151) }), true);
  assert.equal(core.picksVisible({ ...base, meals: logged(60), gapHours: 0.5 }), true);
  assert.equal(core.picksVisible({ ...base, meals: logged(300), gapHours: 6 }), false);

  // The latest stamp decides, and meals without a usable addedAt carry no gap information.
  assert.equal(core.picksVisible({ ...base, meals: [...logged(300), ...logged(30)] }), false);
  assert.equal(core.picksVisible({ ...base, meals: [{ name: "Unstamped", kcal: 200, p: 15 }] }), true);
  assert.equal(core.picksVisible({ ...base, meals: [{ name: "Bad stamp", kcal: 200, p: 15, addedAt: "yesterday-ish" }] }), true);
  assert.equal(core.picksVisible({ ...base, meals: [{ name: "Unstamped", kcal: 200, p: 15 }, ...logged(30)] }), false);
});

test("every entry point throws TypeError on bad shapes", () => {
  const validDay = { key: key(2026, 9, 6), meals: [] };
  const bad = [
    () => core.rankMeals(),
    () => core.rankMeals(null),
    () => core.rankMeals({ days: "nope", now: NOW }),
    () => core.rankMeals({ days: [], now: 42 }),
    () => core.rankMeals({ days: [], now: "not-a-date" }),
    () => core.rankMeals({ days: [null], now: NOW }),
    () => core.rankMeals({ days: [{ key: "2026-09-06", meals: [] }], now: NOW }),
    () => core.rankMeals({ days: [{ key: key(2026, 9, 6) }], now: NOW }),
    () => core.rankMeals({ days: [validDay], now: NOW, limit: 0 }),
    () => core.rankMeals({ days: [validDay], now: NOW, limit: 2.5 }),
    () => core.rankMeals({ days: [validDay], now: NOW, slotHours: 0 }),
    () => core.rankMeals({ days: [validDay], now: NOW, horizonDays: -1 }),
    () => core.periodKeys(NOW, "year"),
    () => core.periodKeys(NOW),
    () => core.periodKeys("nope", "week"),
    () => core.dayTotals("nope"),
    () => core.dayTotals([1]),
    () => core.dayTotals([null]),
    () => core.isHitDay({ kcal: 1, p: 1, c: 1, f: 1 }, TARGETS),
    () => core.isHitDay({ kcal: NaN, p: 1, c: 1, f: 1, fiber: 1 }, TARGETS),
    () => core.isHitDay(core.dayTotals([]), { ...TARGETS, protein: "140" }),
    () => core.isHitDay(core.dayTotals([]), { ...TARGETS, fat: null }),
    () => core.periodStats({ days: [], targets: null }),
    () => core.periodStats({ days: "nope", targets: TARGETS }),
    () => core.periodStats({ days: [{ key: "log:2026-09-06", meals: "nope" }], targets: TARGETS }),
    () => core.formatProteinTotal("640"),
    () => core.formatProteinTotal(-1),
    () => core.formatProteinTotal(NaN),
    () => core.formatProteinTotal(),
    () => core.picksVisible(),
    () => core.picksVisible({ now: NOW, meals: [], proteinRemaining: 10 }),
    () => core.picksVisible({ now: NOW, meals: null, proteinRemaining: 10, eatingWindow: WINDOW }),
    () => core.picksVisible({ now: NOW, meals: [], proteinRemaining: "10", eatingWindow: WINDOW }),
    () => core.picksVisible({ now: NOW, meals: [], proteinRemaining: 10, eatingWindow: { startHour: 22, endHour: 7 } }),
    () => core.picksVisible({ now: NOW, meals: [], proteinRemaining: 10, eatingWindow: WINDOW, gapHours: 0 }),
    () => core.picksVisible({ now: NOW, meals: [{ id: 1 }, "nope"], proteinRemaining: 10, eatingWindow: WINDOW }),
  ];
  // The module runs in its own realm, so identity is checked by constructor name rather than instanceof.
  const isTypeError = error => error.constructor.name === "TypeError" && /must|required/.test(error.message);
  for (const [index, run] of bad.entries()) assert.throws(run, isTypeError, `case ${index}`);
  assert.ok(core.API_VERSION === 1 && bad.length >= 30);
});
