# CP2B shared regression verification report

- Date: 2026-07-16
- Checkpoint: CP2B — Shared Regression Review
- Verification state: all allocated requirements pass; stakeholder review decision pending
- Baseline source commit: `1a92635762d73c5c037910ba225805004b9cd78c`
- Automated suite: `tests/shared-regression.test.mjs`
- Browser evidence: `browser-report.json`

## Results

| Requirement | Status | Planned ECSS method | Verified by | Objective evidence |
|---|---|---|---|---|
| `REG-001` | Pass | `T` | **Test + Inspection** | Automated comparison found exactly 167 components and 314 presets, matching the inspected CP0 baseline fixture. |
| `REG-002` | Pass | `T` | **Demonstration + Test** | The generated shared app completed logging, quantity adjustment, quick-save, exclusion, target-edit and history workflows in the browser. Nine automated regression tests additionally exercised the corresponding storage and calculation contracts. |
| `REG-003` | Pass | `T` | **Test + Demonstration** | Deep configuration comparison matched every CP0 default target and the 08:00–21:00 eating window; the clean browser session displayed the 140 g and 2,000 kcal defaults and the same window. |
| `REG-004` | Pass | `T` | **Demonstration + Test** | Under one origin, shared retained two meals and a 150 g target while India opened empty at 140 g; after India saved 160 g, shared still showed its original state. Instrumentation of the actual storage facade recorded zero foreign reads or writes. |

## Automated verification

`npm run test:shared-regression` passed nine tests:

1. CP0 catalog counts.
2. CP0 target and eating-window defaults.
3. Daily meal logging persistence.
4. Adjusted preset macro recalculation.
5. Quick-add save persistence.
6. Exclusion persistence.
7. Target-edit persistence.
8. Multi-day history reads and aggregation.
9. Same-origin storage-facade isolation.

The complete `npm test` run also passed requirement lint, catalog validation, backup/restore, dual-edition architecture, shared regression and the clean config-only change demonstration.

## Evidence-strength note

`REG-002` is primarily verified by demonstration because the strongest direct evidence is successful completion of the rendered user workflows. Its automated tests cover the underlying data and calculation contracts but are not exhaustive browser automation. `REG-004` combines direct same-origin demonstration with automated instrumentation of the application's actual namespace facade.

## Review disposition

The technical exit condition is satisfied because `REG-001` through `REG-004` are `Pass`. CP2B remains open until the repository stakeholder records the Shared Regression Review decision.
