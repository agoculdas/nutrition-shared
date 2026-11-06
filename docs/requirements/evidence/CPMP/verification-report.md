# Meal-prep annex — local implementation review

**Date:** 2026-09-05
**State:** Local implementation available for stakeholder review. CPMP is not closed and public deployment is not authorized.
**Implementation:** GPT-5.6 Sol agents, coordinated and reviewed by the root agent.

## Delivered behavior

The India edition exposes six provisional batch recipes. Users scale a batch, see nearest-whole countable ingredient quantities and recalculated nutrition, specify serving size and household usage, and see complete days plus leftovers. Saved setups retain their recipe version and composition. Explicit serving confirmation adds food to the existing daily log; saving or browsing does not. Equipment, cooking, cooling, storage and reheating instructions are opened deliberately through View instructions.

The shared edition keeps the annex disabled. The release includes its local runtime/data files in hashes and the offline asset list. Service-worker activation now removes only stale caches belonging to the same edition, preserving other editions and unrelated applications on the same origin.

## Automated evidence

- `npm-test.txt` records a successful full `npm test` run: 47 tests passed across catalog (9), backup (3), meal-prep core (14), meal-prep integration (6), edition architecture (6) and shared regression (9), followed by the successful clean edition-change verification.
- Requirement lint reconciles 122 unique entries: 109 core and 13 annex requirements.
- The first final run exposed missing meal-prep files in clean-checkout verifier inputs. Both clean-build scripts were corrected; the repeated full run passed.
- `../CP1A/reproducible-build.json` records the Sol agent's successful two-clean-checkout reproducibility check. This is build evidence, not a new approval of CP1A or CPMP.
- Tests exercise rounded composition, minimum batches, invalid inputs, overflow, canonical setup validation, historical snapshots, all six recipe contracts, backup round trips, earlier backup compatibility, edition isolation, asset bundling and edition-specific cache cleanup.
- After the full run, a final display-only change added the stored refrigerator/freezer conditions to the collapsed instructions. The production build and six integration tests passed again. Final `index.html` source SHA-256: `e6878cee196b21703dc61ee48a7940df6528a6476093a283419bee62dc1f6cb6`; final recipe data SHA-256: `8f94d277dd6a19703e35d93b7b30a4bb0628191ba7fe7353b4b527e0a0644c61`. The local build records `sourceDirty: true`; it is not represented as a committed release.

## Browser demonstration

Performed using the Codex in-app browser against local India builds on ports 4175 and 4176. These are desktop-browser viewport tests, not physical-phone acceptance tests.

| Check | Observed result |
|---|---|
| Collection and current content | Six recipes rendered; final source uses raw/dry or clearly packaged quantities and matching preparation steps. Cards identify calories/protein per named unit and provisional cooking status. |
| Coverage | 10 burritos, 2 per person per meal, 2 people, 1 meal/day displayed 2 complete days and 2 burritos left. |
| Count rounding | A requested batch of 2.6 displayed 3 actual burritos and 3 tortillas, with other quantities continuing to scale and per-unit nutrition recalculated. |
| Save versus log | Saving a ten-burrito setup left daily totals at zero. The setup survived reload and retained the household settings. |
| Serving confirmation | Confirming 1.5 servings added exactly one meal and the matching totals. The meal survived reload, accepted a manual calorie edit, and could be removed through the existing delete control. This demonstration used an earlier provisional recipe composition; calculation and logging code were unchanged in the final content revision. |
| Instructions | Opening a recipe and reopening a saved setup kept instructions closed. Explicit opening displayed preparation details; later recipe navigation reset the disclosure. |
| Diet filtering | Vegetarian selection removed meat recipes and the saved chicken setup. |
| Geometry | Document width matched viewport width at 360, 390, 430 and 1440 pixels; the recipe dialog stayed within the viewport. |
| Labels and focus | Zero unnamed recipe inputs in the inspected detail view. Recipe opening focused its heading; reverse-tab navigation wrapped inside the dialog; background scrolling was locked; closing restored the opener. |
| Runtime errors | No warning/error console entries in the restored final preview during collection inspection. |

An origin-unavailable reload was attempted after stopping the local server. The browser returned its unreachable-page state, and subsequent inspection of that state was blocked by its URL policy. This did not verify offline application behavior and is not classified as a pass. The server was restarted and the normal preview restored. Asset and cache tests pass, but an installed-client offline demonstration is still required.

## Requirement disposition

| Requirement | Status | Planned method | Executed approach and limits |
|---|---|---|---|
| MP-001 | Blocked | T | Inspection: six candidates exist; physical preparation checks and representative product-label reconciliation remain outstanding. |
| MP-002 | Pass | T | Test + Demonstration: rounded quantities, derived nutrition, supported units, minimums and invalid-input fixtures pass; browser rounding example agrees. |
| MP-003 | Pass | I | Inspection: output unit, planned meal quantity and per-unit/per-meal/whole-batch macro values are explicit. |
| MP-004 | Pass | T | Test + Demonstration: all plan examples and invalid-input fixtures pass; browser displays complete days and leftovers. |
| MP-005 | Not run | I | Partial inspection: source-indexed guidance and separate storage/coverage UI exist. Final recipe qualification and content review remain open. |
| MP-006 | Pass | T | Test + Demonstration: save/reload preserves setup settings without food logging; canonical embedded-recipe validation prevents silent version reinterpretation. |
| MP-007 | Pass | T | Test + Demonstration: explicit adjusted serving confirmation, reload, manual totals edit and removal pass; detached composition snapshots protect history from recipe changes. |
| MP-008 | Pass | T | Test: actual backup facade preserves valid setups, accepts older backups without them and leaves the other namespace untouched. |
| MP-009 | Blocked | T | Asset/cache tests pass, but the browser-origin outage attempt was inconclusive; installed reference-client offline procedures remain outstanding. |
| MP-010 | Not run | T | Partial demonstration: current vegetarian/meat filtering and saved-setup filtering work. Exhaustive compatibility verification against the forthcoming CP3A dietary model remains outstanding. |
| MP-011 | Not run | T | Partial demonstration/inspection: responsive widths, labels and keyboard focus checked. The full prescribed axe-core campaign and acceptance-client matrix have not been executed. |
| MP-012 | Pass | T | Test: shared regression, counts/defaults, feature flag, namespace isolation and clean edition-change checks pass. |
| MP-013 | Pass | T | Demonstration + Inspection: instruction disclosure requires explicit action and resets on recipe/saved-setup opening. |

## Remaining acceptance work

The user can review the local feature now. Release acceptance still requires cooking and product-label checks, the applicable CP3A dietary-interface verification, physical/reference-client and full accessibility/offline evidence, the five-user formative exercise, and stakeholder review. No existing checkpoint has been implicitly closed or waived, and no public deployment or source-repository commit was performed for this annex.
