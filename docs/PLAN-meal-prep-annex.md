# Meal-prep annex — recipe batches, portions and coverage

**Status:** Approved for local implementation on 2026-09-05; acceptance and public release remain pending.
**Date:** 2026-09-05
**Relationship:** Approved annex to `PLAN-india-upgrade-ecss.md`; `MP-001`–`MP-013` are allocated to `CPMP`. Existing checkpoint statuses are unchanged.
**Delivery model:** The coordinating agent owns planning, delegation, integration review and reporting. GPT-5.6 Sol agents perform implementation after stakeholder approval.

## 1. Purpose

Give users a practical selection of meals they can prepare in batches, with scaled ingredient quantities, preparation instructions, nutrition per portion and a clear answer to: **how many meals does this make, and how many days will it cover?**

The core example is burritos: choose a recipe, make twelve, eat two per lunch, and see that the batch supplies six lunches. For two people eating the same amount, it supplies three days of lunches.

The annex complements existing meal logging. Its primary output is a usable batch recipe and coverage calculation. It does not generate daily menus or optimize a weekly diet.

## 2. Approved first-release scope

| Included | Boundary |
|---|---|
| Curated meal-prep collection | Six fully specified recipes, with vegetarian and non-vegetarian choices; recipes remain candidates until their instructions and ingredient bases are checked. |
| Recipe detail | Ingredients, preparation-time summary, base yield, portion definition, nutrition, coverage and concise storage guidance. Equipment and preparation/reheating steps are available through an explicit **View instructions** control, closed by default. |
| Batch scaling | Choose output units or portions; ingredient quantities and batch totals scale together. |
| Nutrition | Calories, protein, carbohydrate, fat and fibre per output unit, per chosen meal serving and per batch. Values remain estimates. |
| Coverage calculator | Output units per meal, people sharing, and planned meals per person per day; display complete shared meal occasions, days covered and leftovers. |
| Saved preparation setup | Save recipe, batch size and coverage settings locally; reopen to prepare the same batch again. |
| Serving logging | Explicitly log the amount actually eaten through the existing logging flow, with normal editing and undo. |
| Offline use and backup | Recipe content available in the installed offline app; saved setups included in backup/restore. |

Not included in this release: automatic weekly menus, combined shopping lists across recipes, pantry inventory, live remaining-stock tracking, expiry notifications, accounts/sync, custom recipe authoring, cost optimization, or automatic nutrition-target adjustment.

**Edition rollout:** enable the annex in the India edition first, using the shared application core. Keep it disabled in the shared edition initially. Enabling it there later is a separate product decision.

## 3. User flow

1. Open **Meal prep** from a secondary dashboard entry point.
2. Browse recipe cards showing the meal, diet suitability, preparation time, base yield and nutrition for a clearly named serving.
3. Open a recipe and choose **How much to make** using one batch/portion scaling flow. Countable ingredient amounts round to the nearest whole number; other quantities and meal portions continue to scale. There is no separate discrete-food mode.
4. Set **How you will use it**: units per person per meal, number of people, and meals per person per day supplied by this batch.
5. Read the scaled ingredient list, per-meal nutrition, coverage and concise storage guidance. Select **View instructions** only when preparation help is wanted; opening a recipe or changing its scale never automatically opens instructions. The instructions view reflects the current batch quantities and closes back to the same setup.
6. Optionally save this setup for reuse.
7. When eating, select **Log a serving**, confirm the actual amount and use the existing meal-log path.

Changing or saving a preparation setup never records food as eaten. Coverage remains a planning estimate; logging a serving does not turn the feature into stock tracking.

## 4. Yield and coverage model

Keep three concepts explicit:

- **Output unit:** one burrito or one equal portion of a pot/tray recipe.
- **Meal serving:** the number of output units one person intends to eat at one meal.
- **Coverage:** how many planned eating occasions the batch supplies for the stated household.

Let `Y` be batch output units, `U` units per person per meal, `P` people, and `M` meals per person per day supplied by this batch.

- Recipe scale factor = desired output / base output.
- Ingredient amount = base ingredient amount × scale factor, rounded to the nearest whole number for ingredients measured by count (half values round up). Weight and volume quantities retain their scaled values.
- Nutrition per output unit = derived batch nutrition / `Y`.
- Nutrition per meal serving = nutrition per output unit × `U`.
- Complete shared meal occasions = `floor(Y / (U × P))`.
- Complete days covered = `floor(Y / (U × P × M))`.
- Units left after complete days = `Y − complete days × U × P × M`.

The display must explain partial coverage rather than silently rounding up. This is a consumption schedule assumption, not a calendar or an expiry calculation.

| Inputs | Expected explanation |
|---|---|
| 12 burritos, 2 per meal, 1 person, 1 meal/day | 6 lunches; covers 6 days. |
| 12 burritos, 2 per meal, 2 people, 1 meal/day | 3 shared lunches; covers 3 days. |
| 10 burritos, 2 per meal, 2 people, 1 meal/day | 2 complete days, with 2 burritos left: one additional individual meal. |
| 12 portions, 1 per meal, 1 person, 2 meals/day | 12 individual meals; covers 6 days. |

All inputs must be finite and positive. People and output counts are whole numbers; meal frequencies are whole numbers in v1. Half-unit servings may be supported when meaningful for the recipe. Invalid inputs produce an inline explanation and no misleading result.

Count rounding changes the recipe quantities used in calculations, not just their display. For example, 2.4 wraps becomes 2 wraps and 2.6 becomes 3; calculate batch nutrition from those rounded amounts and then divide by the resulting output yield. When an ingredient defines the output count (for example, one wrap per burrito), use its rounded count as the actual yield. Other ingredients remain scaled, so the size and nutrition of each resulting portion can change slightly. The recipe defines this yield relationship explicitly; it is not inferred from ingredient names. For dishes divided into equal portions, use the selected portion count. Meal-serving amounts remain adjustable, including half portions where applicable.

If scaling would round an essential countable ingredient or the output yield to zero, apply the recipe's minimum supported batch size and show that minimum beside the control. Pure proportional scaling without count rounding preserves per-unit nutrition; cases with count rounding must instead verify nutrition against the actual rounded composition. Ordinary display rounding of weights, volumes and nutrition must not alter their internal values.

## 5. Initial recipe selection and qualification

Proposed candidates:

1. Chicken and bean burritos.
2. Bean and paneer burritos.
3. Chicken rice bowls.
4. Chickpea and vegetable curry with rice.
5. Lentil bolognese pasta portions.
6. Paneer and vegetable tray-bake portions.

These are a reviewable starting selection, not a claim that the audience prefers them. Choose recipes for repeatability, practical ingredients, clear portioning and manageable preparation. Reuse existing components where their ingredient state and portion basis match.

Each recipe needs:

- Explicit raw/cooked/drained ingredient states and supported measurement units.
- A base yield and instruction for dividing the finished batch; avoid implying cooking preserves ingredient weight.
- All edible ingredients represented in the macro calculation, including oils, sauces and wraps.
- Dietary classification derived from components and applicable preference/exclusion handling.
- Complete instructions, equipment and realistic preparation-time estimates.
- Provenance for nutrition data and permission to use any adapted recipe material.
- A practical preparation check recording actual yield, portioning and any instruction changes before calling the recipe qualified. Agent-generated recipes alone do not satisfy this check.

Do not add recipes simply to hit six entries. A recipe awaiting practical validation remains explicitly provisional and blocks the six-recipe acceptance gate.

## 6. Coverage versus storage life

Show **quantity coverage** and **storage guidance** as different fields. “Six days of lunches” must never imply “safe to refrigerate for six days.”

During implementation, research recipe-appropriate cooling, refrigeration, freezing, thawing and reheating guidance using authoritative food-safety sources. Retain source URLs, access dates and relevant conditions. Do not invent universal durations or derive storage life from the coverage formula.

Where the planned coverage exceeds the sourced refrigerated guidance, visibly explain the need to follow the recipe's freezing/storage instructions. Support recipes for which freezing is unsuitable without presenting it as a universal solution. No automatic expiry countdown or safety guarantee is part of v1.

## 7. Integration design

- Keep recipe definitions distinct from ordinary quick-add presets. The existing preset catalog and shared-edition baseline counts remain stable unless an explicit baseline change is approved.
- Reuse the existing composition calculation model and reference existing component IDs where ingredient bases match. Store recipe-specific ingredient components separately when a different raw/cooked basis is needed, preserving the shared catalog baseline. Validate references, quantities and units; never invent a raw/cooked conversion. Recipe-specific compositions are retained as snapshots for nutrition and history; they do not enter the existing Builder unless every row resolves to its catalog.
- Use the current build pipeline to bundle recipe data and instructions with the release. New runtime resources must be included in offline caching and release hashes.
- Add a versioned, edition-namespaced saved-setup record containing recipe ID/version and configuration. Recipe-version changes must not silently reinterpret an existing saved setup; retain its relevant composition or explicitly migrate it.
- Snapshot the actual per-serving composition and totals when logging, so later recipe edits cannot change historical intake. Reuse adjustment, save and undo conventions where compatible.
- Extend backup validation/restore as needed and preserve old backups. Test cross-edition isolation with the new state.
- Use a secondary screen/sheet consistent with the current interface. Make controls keyboard accessible, named and usable at existing mobile verification widths.
- Coordinate the annex with existing overlays: only one primary sheet open at a time, background scrolling locked while open, focus returned to the opener on close, and a working keyboard dismissal path.

## 8. Acceptance requirements

### Checkpoint CPMP — Meal-prep Annex Acceptance

The approved annex adds 13 controlled requirements to the 109 core-plan requirements. Technical implementation can proceed locally under scope approval; closing CPMP still requires evidence, recipe qualification and review. CPMP acceptance depends on CP2B shared regression and applicable CP3A dietary-model interfaces, and it precedes public release of the annex. Neither this approval nor local implementation closes those earlier gates.

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `MP-001` | The enabled edition shall provide a meal-prep collection containing six qualified recipes. | `MO-02` | `T` | Recipe records and practical preparation checks cover every field in section 5, including vegetarian and non-vegetarian choices. |
| `MP-002` | Each recipe shall scale ingredients and derived nutrition consistently with the selected batch size and count-rounded actual yield. | `MO-04` | `T` | Fixtures cover base/smaller/larger batches, nearest-whole counts including half values, minimum batches, yield-defining ingredients, adjustable meal portions and nutrition derived from rounded composition. |
| `MP-003` | Each recipe shall show an explicit output-unit definition and meal-serving quantity beside its nutrition values. | `MO-01` | `I` | Mobile inspection distinguishes per-unit, per-meal and per-batch values without interpretation. |
| `MP-004` | The coverage calculator shall return complete days and remaining output units for valid user inputs. | `MO-01` | `T` | All section 4 examples pass; boundary fixtures cover insufficient quantities, fractions and invalid inputs. |
| `MP-005` | Each recipe shall display sourced storage and reheating guidance separately from quantity coverage. | `MO-04` | `I` | Content review checks source support, conditions and coverage exceeding refrigerated guidance. |
| `MP-006` | Saving a preparation setup shall preserve its recipe version and user inputs without creating a meal log. | `MO-01` | `T` | Save, reload and reopen reproduce the setup; daily totals remain unchanged. |
| `MP-007` | Confirming a meal-prep serving shall record the actual selected amount through the existing meal-log flow. | `MO-01` | `T` | Base and adjusted serving demonstrations verify totals, persistence, edit, undo and historical stability after recipe changes. |
| `MP-008` | Backup and restore shall preserve saved preparation setups within their edition namespace. | `MO-04` | `T` | Round-trip, older-backup and concurrent-edition tests pass. |
| `MP-009` | The installed annex shall support browsing, scaling, saved-setup access and serving logging offline after initial online loading. | `MO-04` | `T` | Offline workflow demonstration on the existing acceptance clients. |
| `MP-010` | The annex shall respect dietary preferences and ingredient exclusions supported by the enabled edition. | `MO-02` | `T` | Exhaustive recipe compatibility fixtures plus a filtered browsing demonstration. |
| `MP-011` | The annex shall meet the existing mobile and accessibility acceptance scope for its new views and controls. | `MO-01` | `T` | Geometry, keyboard, accessible-name and automated accessibility evidence for collection, detail and saved setup. |
| `MP-012` | Adding the annex shall preserve the approved shared-edition flows and state. | `MO-05` | `T` | Existing regression suite and edition-isolation checks pass. |
| `MP-013` | Preparation instructions shall open only after the user activates the dedicated instructions control. | `MO-01` | `T` | Recipe opening, scaling and saved-setup reopening keep instructions closed; explicit opening shows current batch quantities and closing preserves the setup. |

**Usefulness check:** After technical verification, five target users independently choose a recipe, configure a batch for their household, identify a meal serving, explain coverage versus storage life, and log an adjusted serving. At least four complete all tasks without facilitator correction. Record whether each would actually prepare the recipe and why; correct repeated barriers before release. This is a formative check, not evidence of long-term dietary benefit.

## 9. Work packages and approval gates

| Gate / package | Owner and output | Dependency |
|---|---|---|
| Review A — scope approval | User reviews this document, including candidate recipes and India-first rollout. | No implementation before approval. |
| A — baseline integration | Coordinator records approval, reconciles annex requirements with the main plan/VCD/FFBD and identifies impact on current checkpoints. | Review A. Do not implicitly close CP2B or bypass existing gates. |
| B — recipe data and calculations | Sol agent implements recipe schema, batch/coverage functions, initial recipe records and focused tests. | A; confirm component and dietary-model dependencies against CP3A. |
| C — annex interface | Sol agent implements collection, recipe detail, calculator and saved-setup interactions against the agreed data contract. | Contract agreed with B; separate files where practical. |
| D — persistence and logging | Sol agent implements integration with logging, backup, offline build and edition configuration. | B and C integration points agreed. |
| E — verification and content qualification | Sol agent exercises requirements and regression; coordinator reviews evidence and source quality; human preparation checks qualify recipes. | Integrated B–D. |
| Review B — implementation review | Coordinator presents the working annex, verification results, unresolved issues and recipe qualification status to the user. | E; any incomplete evidence explicitly reported. |
| Release | Follow the existing release approval and checkpoint process. | Review B and applicable existing gates. |

Sol agents may work in parallel only on independent tasks with explicit file ownership. Since the app currently concentrates UI and state in `index.html`, one agent owns edits to that file at a time. The coordinator resolves task boundaries and reviews results; implementation and corrective coding remain delegated to Sol agents.

## 10. Review decision

Approval of this plan authorizes local implementation of the scope above and its requirement integration. It does not authorize public deployment or declare existing checkpoints passed.

The stakeholder approved this plan with “looks good to me” on 2026-09-05, following the requested nearest-whole ingredient rounding and opt-in instructions revisions. Approval covers a six-recipe meal-prep annex, adjustable batch yield and household coverage, saved setups with explicit serving logging, India-first availability, and Sol-agent implementation coordinated by the root agent. Practical recipe checks, acceptance-device evidence, formative user tasks and public-release review remain separate outstanding work until actually performed.
