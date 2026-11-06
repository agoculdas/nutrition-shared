# Fast log — one-tap logging, three picks, and the period view

**Date:** 2026-09-06
**Status:** Approved direction 2026-09-06; implemented and committed 2026-11-06. `FL-001`–`FL-008` are allocated to `CPFL`.
**Edition:** India only, behind `features.fastLog`. The shared edition keeps its current dashboard and two-button add flow unchanged.

## 1. The problem this solves

The app's thesis is protein efficiency. It already computes the density you still need and draws a tier-fitted suggestion set. But the daily action, logging what you ate, costs too much:

- **Add meal** opens a sheet with search auto-focused. The keyboard covers half the sheet.
- The only one-tap items are **Saved** meals, which exist only if the user manually starred something. Nobody stars.
- Suggestions live behind a second button, **See options**.
- The dashboard stacks eight blocks. Nothing you can tap to log is above the fold.

Retention in a tracker is decided in week two by how fast a repeat meal logs. Every day's log is already stored under `log:YYYY-MM-DD`, so the app knows what the user eats. It just doesn't use it.

## 2. What we build

### 2.1 Log strip (one tap from app open)

A horizontal row of chips on the dashboard, directly under the hero. Each chip is one of the user's own meals, ranked from the last 30 days of logs. Tap once: the meal is logged, the hero updates, an undo toast shows for a few seconds.

- Ranking is frequency weighted toward recency and toward the current hour of day. Yesterday's lunch ranks first at lunchtime.
- Derived automatically. No starring. Today's logs feed tomorrow's strip.
- Each chip shows name, protein grams, and kcal.
- Re-logging copies the most recent occurrence's macros and any composition snapshot (`_builder`, `_mealPrep`) so history stays stable. It does not recompute from the catalog.
- Meal-prep servings appear like any other meal, since batch eaters log the same thing six days running.
- Empty state on day one: a single quiet line, not a card.

### 2.2 Three picks (the doomscroll replacement)

When the user hasn't eaten recently and protein remains, the dashboard shows three cards drawn by the existing suggestion engine at the tier the remaining budget requires, with a **Shuffle** button.

- Show when: protein remaining is above zero, the time is inside the eating window, and either nothing is logged today or the last meal was logged more than 2.5 hours ago.
- Draw with the existing `drawSuggestions` at count 3 and the edition's `maxPerCuisine`. Shuffle bumps the existing `suggestSeed`.
- Cards reuse the existing `PresetCard` so tap-to-log, hold-to-adjust and hide keep working.
- Never renders the word "filler" (existing rule PRT-007).

### 2.3 Period view (Today / Week / Month)

A segmented control on the hero switches the dashboard between three views.

- **Today** is the current dashboard plus the strip and picks.
- **Week** shows total protein over the last 7 days (in kilograms with one decimal when at least 1000 g, otherwise grams), average density in g/100kcal, days hit out of days logged, and a 7-cell strip of daily protein against target with hit days coloured.
- **Month** is the same over 30 days with a 30-cell strip.
- "Hit" uses exactly the existing rule in the history sheet: protein at or above target, kcal between floor and target × 1.05, and fat, carbs and fibre at or above their minimums.
- The choice is component state only. The app opens on Today.

### 2.4 One add button

The floating pair becomes a single **Add meal** button. The sheet opens on Presets with search reachable but not auto-focused. Its top section is **Recent**, fed by the same ranking as the strip, followed by Suggestions, Staples and cuisines. The manual **Saved** section stays for anything starred.

### 2.5 Dashboard order in Today view

1. Topbar
2. Hero with period control
3. Log strip
4. Three picks (conditional)
5. Implied ratio line
6. Protein density chart
7. Warnings
8. Meal list
9. Meal-prep entry
10. A collapsed **Details** section holding the pace strip, budget table and day summary

Items 3 and 4 must sit inside the initial 390 × 844 viewport. If they do not, the density chart demotes into Details too.

## 3. Module contract: `fast-log-core.js`

Browser global `window.NutritionFastLog`, same IIFE pattern as `meal-prep-core.js`, no DOM, no storage, pure functions on plain data. Tested in Node with `vm.runInNewContext` like the other core modules.

```js
// Day record as the app stores it: { key: 'log:YYYY-MM-DD', meals: Meal[] }
// Meal: { id, name, sub?, kcal, p, c, f, fiber, addedAt?: ISO string, _builder?, _mealPrep? }

rankMeals({ days, now, limit = 8, slotHours = 2.5, horizonDays = 30 })
  // -> Array<{ key, name, sub, count, lastAt, score, meal }>
  // key: normalized identity = lowercased trimmed name + '|' + lowercased trimmed sub
  // meal: a deep copy of the most recent occurrence with id and addedAt removed
  // score: sum over occurrences of recencyWeight(daysAgo) * slotWeight(hourDistance)
  //   recencyWeight = 0.5 ** (daysAgo / 7)            (half-life one week)
  //   slotWeight   = 1 + 1.5 * max(0, 1 - hourDistance / slotHours)
  //   hourDistance = circular distance in hours between meal hour and now hour;
  //                  meals without addedAt use slotWeight 1
  // Deterministic. Ties break by lastAt desc, then name asc. Invalid meals (non-finite kcal or p) are skipped.

periodKeys(now, period)          // period: 'today' | 'week' | 'month' -> ['log:YYYY-MM-DD', ...] newest first; week = 7 days, month = 30, both including today
dayTotals(meals)                 // -> { kcal, p, c, f, fiber, count }
isHitDay(totals, targets)        // exactly the history-sheet rule
periodStats({ days, targets })   // -> { loggedDays, totalDays, proteinTotal, kcalTotal, avgProtein, avgKcal, density, hitDays, cells: [{ key, p, kcal, hit, logged }] }
formatProteinTotal(grams)        // -> '1.9 kg' | '640 g'
picksVisible({ now, meals, proteinRemaining, eatingWindow, gapHours = 2.5 })  // -> boolean per 2.2
```

`API_VERSION = 1`. Every function validates its inputs and throws `TypeError` on bad shapes, matching the other core modules.

## 4. Work packages and ownership

| WP | Owner | Files owned | Depends on |
|---|---|---|---|
| A. Core module and wiring | Opus agent A | `fast-log-core.js`, `tests/fast-log.test.mjs`, `package.json` (add `test:fast-log` and put it in `test`), `scripts/build.mjs` (asset list, script-tag strip and inject, service-worker precache, release hash), the `controlled` source lists in `scripts/verify-edition-architecture.mjs` and `scripts/verify-reproducible-build.mjs`, `editions/india.json` and `editions/shared.json` (`features.fastLog`) | Contract in section 3 |
| B. Dashboard and sheet | Opus agent B | `index.html` only, including the new `<script src="fast-log-core.js">` tag | Contract in section 3; must not touch WP A files |
| C. Integration review | Coordinator | none | A and B complete |

Rules for both agents:

- No commits. No `git add`. Leave the working tree as edited files.
- Do not change anything the shared edition renders when `features.fastLog` is false. `npm run test:shared-regression` and `npm run verify:editions` must still pass.
- Do not change catalog data, presets, targets, storage keys, or the backup format. No new persisted keys.
- Mobile first at 390 px wide. Every new control has an accessible name and is keyboard reachable.
- Match the existing visual language: `card`, `eyebrow`, `mono`, `food-grid`, `saved-chip`, the theme tokens. No new fonts or libraries.

## 5. Acceptance

These requirements are controlled under GOV-004 and tracked in `docs/requirements/vcd.json`. They were registered on 2026-11-06 from the informal checks used during implementation. The former check "full `npm test` passes" is evidence rather than a requirement, and the former check "no occurrence of filler in India UI text" duplicates `PRT-007`; neither is repeated here.

### Checkpoint CPFL — Fast-log Annex Acceptance

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `FL-001` | The India-edition dashboard shall offer each distinct meal logged in the preceding 30 days as a one-tap re-log control ranked by `rankMeals`. | `MO-01` | `T` | Unit fixtures show a meal logged yesterday ranks and is copied with macros and composition snapshot but without id or timestamp; browser demonstration logs it with one tap. |
| `FL-002` | Meal ranking shall apply the one-week recency half-life and current-hour proximity weighting defined in section 3. | `MO-01` | `T` | A hand-derived fixture ordering is reproduced exactly, including tie-breaking. |
| `FL-003` | Undoing a one-tap log shall remove exactly the meal created by that tap. | `MO-04` | `T` | Browser demonstration returns meal count and hero totals to their values before the tap. |
| `FL-004` | The dashboard pick set shall appear only under the section 2.2 conditions and contain only presets compatible with the stored dietary preference and component exclusions. | `MO-03` | `T` | `picksVisible` fixtures cover each condition; exhaustive preference and exclusion fixtures over the pick pool find zero incompatible presets. |
| `FL-005` | The week and month views shall report protein total, average density and hit days equal to the history sheet for the same range. | `MO-01` | `T` | Hit-rule boundary fixtures match the history rule; browser cross-check on a seeded week matches the history sheet. |
| `FL-006` | The India-edition log strip and pick set shall render within the initial 390 × 844 pixel viewport. | `MO-01` | `I` | Screenshot inspection at 390 × 844 shows both without scrolling. |
| `FL-007` | The India release artifact shall include `fast-log-core.js` in its service-worker precache list and release hashes. | `MO-04` | `I` | Built `service-worker.js` and `release-hashes.json` inspection. |
| `FL-008` | The shared edition shall render its baseline dashboard and two-button add control while `features.fastLog` is false. | `MO-05` | `T` | Built shared edition shows zero fast-log elements and the original add controls; shared regression and edition verification pass. |

## 6. Implementation notes (2026-09-06)

- Three full preset cards overflowed the fold, so the picks use the unmodified `PresetCard` with a CSS-only compaction scoped to `.fl-picks` (ingredient chips hidden, tighter padding). Handlers for tap, hold and the adjust menu are unchanged. No density chip on picks, since adding one would change the shared card markup.
- `addMeal` now returns the new meal id so the undo toast can remove exactly that meal. No existing caller used the return value.
- The two verification scripts that copy controlled sources into an isolated checkout needed `fast-log-core.js` added to their lists; without it `verify:editions` fails on copy.
- Integration review found PRT-007 breaches visible in the India build: the density chart caption "Room for fillers." and the "FILLER" tag on logged meals. On 2026-11-06 both became edition copy (`copy.densityHeadroomNote`, `copy.lightTierTag`); India shows "Room for lighter meals." and "LIGHT", and the shared edition keeps its baseline wording. An unused category list containing the label "Fillers" was removed.
