# CPFL fast-log annex verification

Date: 2026-11-06. Verifier: Claude coordinator. Implementation by two Opus agents on 2026-09-06, integration-reviewed the same day; requirements registered and re-verified on 2026-11-06.

## Automated

- `tests/fast-log.test.mjs`: 15 tests pass. Covers ranking of a meal logged yesterday, snapshot copying without id or timestamp, the hand-derived ranking order, deduplication, tie-breaking, horizon and limit, period keys, hit-rule boundaries, period statistics, protein-total formatting and every `picksVisible` condition.
- Full `npm test` passes, including shared regression (9), edition architecture (6) and `verify:editions`.
- `verify:requirements` reconciles 130 requirements: 109 core, 13 meal-prep and 8 fast-log.

## Browser, built editions at 390 × 844 (2026-11-06, local 16:00)

| Requirement | Observation |
|---|---|
| `FL-001` | A meal seeded into yesterday's log appeared in the India log strip as "Toast and butter 7p 360". One tap logged it; the hero moved from 0/140 protein to 7/140 and the toast read "Logged Toast and butter · 7g protein". |
| `FL-003` | Undo from that toast removed the meal: meal count 0 and hero back to 0/140, 0/2000. |
| `FL-006` | With an empty day, the strip ended at y = 267 px and the three picks at y = 580 px; the add button begins at y = 779 px. Both are inside the 844 px viewport without scrolling. |
| `FL-007` | `dist/india/service-worker.js` lists `./fast-log-core.js`; `dist/india/release-hashes.json` includes it. |
| `FL-008` | Shared build: zero `fl-*` elements, no period tabs, the original "See options" and "Add meal" buttons, title "Daily nutrition", and its baseline "FILLER" meal tag. |
| `PRT-007` (spot check only) | India build: the logged low-density meal is tagged "LIGHT"; no rendered text contained "filler" in Today, Week or Month views or in the add sheet. This is not the formal built-artifact inspection `PRT-007` requires. |

## Carried from 2026-09-06

- `FL-005`: the WP B agent seeded six logged days; the week view showed 700 g, 6.9 g/100kcal and "hit 4 of 6 logged days", and the history sheet's 7-day panel for the same data showed 6/7 days logged, 4 of 6 all-target days and 6.9 average. Not re-run on 2026-11-06.

## Not verified

- `FL-004`: visibility conditions pass their fixtures. The dietary-preference and exclusion half has no exhaustive fixture over the pick pool; the picks reuse the suggestion engine whose equivalent guarantee, `PRT-004`, is itself not run.
