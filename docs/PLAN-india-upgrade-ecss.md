# India Edition Upgrade — ECSS-Tailored Development and Verification Plan

**Status:** Baselined; CP2B accepted for progression on 2026-09-05; all CP3A exit requirements have passing local evidence as of 2026-09-06 and await stakeholder checkpoint acceptance
**Date:** 2026-07-16
**Product:** `nutrition-shared` core and a separately deployed India edition
**Initial validation cohort:** South Bombay users; expansion target: affluent urban India

**Approved annex (2026-09-05):** [Meal-prep annex](PLAN-meal-prep-annex.md) adds `MP-001`–`MP-013` at `CPMP` for India-first batch recipes, rounded ingredient counts, scalable portions, coverage and opt-in preparation instructions. Local implementation is approved; existing checkpoint review statuses remain unchanged. CPMP is an additional acceptance gate before public release of an artifact containing the annex, including recipe qualification, relevant core interface verification and review. The VCD covers the 109 core requirements and these 13 annex requirements separately.

**Approved annex (2026-09-06, registered 2026-11-06):** [Fast-log annex](PLAN-fast-log.md) adds `FL-001`–`FL-008` at `CPFL` for one-tap re-logging, dashboard picks and the week/month view. It is India-only behind `features.fastLog`; existing checkpoint statuses are unchanged.

## 1. Purpose and tailoring

This plan applies ECSS requirements-engineering and verification principles to a consumer web application. It is an ECSS-tailored plan, not a claim of ECSS certification.

### Normative basis used for the tailoring

- [ECSS-E-ST-10-06C — Technical requirements specification](https://ecss.nl/standard/ecss-e-st-10-06c-technical-requirements-specification/): requirement construction, attributes, self-containment and verifiability.
- [ECSS-E-ST-10-02C Rev.1 — Verification](https://ecss.nl/standard/ecss-e-st-10-02c-rev-1-verification-1-february-2018/): verification planning, methods, evidence, VCD and close-out.
- [ECSS-E-ST-40C Rev.1 — Software](https://ecss.nl/standard/ecss-e-st-40c-rev-1-software-30-april-2025/): current ECSS software lifecycle context, tailored to this non-space consumer application.
- [ECSS-M-ST-10-01C — Organization and conduct of reviews](https://ecss.nl/standard/ecss-m-st-10-01c-organization-and-conduct-of-reviews/): review data package, review item discrepancies and disposition process, applied to the Critical Design Review (`CDR`) and controlled in [requirements/CDR-framework.md](requirements/CDR-framework.md).

ECSS-E-ST-10-02C Rev.1 treats intended-use validation as achievable through verification when adequate intended-use requirements exist. This plan therefore expresses product-market assumptions as measurable pilot requirements rather than informal launch hopes.

By stakeholder tailoring decision dated 2026-07-16, participant discovery and survey execution are sequenced after the functioning prototype accepted at CP4B. The project may use documented provisional product and catalog assumptions through CP4B; those assumptions remain subject to CP4R validation and cannot be used to bypass CP5B or public-release gates.

The following rules are mandatory for this project:

1. Each requirement has a unique identifier and one parent objective.
2. Each requirement contains one mandatory `shall` statement.
3. Each requirement is self-contained, unambiguous, attainable and objectively verifiable.
4. Quantities include a value, unit, operating condition and tolerance where applicable.
5. Each requirement has a verification method and an objective pass criterion defined before implementation.
6. A checkpoint closes only when every allocated requirement is `Pass` or has an approved waiver.
7. Objective evidence is retained in a Verification Control Document (VCD).

### 1.1 Verification methods

| Code | ECSS method | Application in this project |
|---|---|---|
| `T` | Test, including demonstration | Automated tests, browser tests, device tests and user task demonstrations |
| `A` | Analysis, including similarity | Dataset coverage, performance results, pilot statistics and traceability analysis |
| `RoD` | Review of design | Approved architecture, source, design records or configuration showing compliance |
| `I` | Inspection | Direct inspection of the artifact, manifest, copy, report or evidence record |

Verification results tables shall retain the planned ECSS method and also state the closest executed verification approach in plain language:

| Executed approach | Meaning in results tables |
|---|---|
| `Inspection` | A person or deterministic checker examined a static artifact, configuration, manifest, source record or rendered output. |
| `Test` | An automated or manual procedure applied inputs or operating conditions and asserted an objective pass/fail result. |
| `Analysis` | A result was derived by calculation, comparison, coverage assessment or interpretation of collected evidence. |
| `Demonstration` | A workflow or controlled change was exercised and its observable outcome recorded, without exhaustive test coverage. |

Where multiple approaches contribute, the results table shall name all applicable approaches and identify the primary one first. This executed-approach label supplements the controlled ECSS method; it does not change the requirement's baselined verification method.

### 1.2 Controlled definitions and verification configurations

The identifiers below are part of the requirements baseline. Changing one after CP0 requires the change control defined by `GOV-004`.

#### COHORT-01 — South Bombay pilot cohort

A person is a member of `COHORT-01` only when the screening record confirms all of the following:

1. The person is 18 to 65 years old at enrolment.
2. The person lives, works or studies in Mumbai City district on at least four days in a typical week.
3. The person is comfortable completing an English-language mobile workflow.
4. The person owns a personal iOS or Android smartphone supported by the reference browser matrix.
5. The person self-identifies a goal of monitoring or increasing dietary protein.
6. The person consumes at least two commercially prepared restaurant, delivery, café or club meals in a typical week.
7. The person self-attests that they are not following a clinician-prescribed protein restriction or medically prescribed diet.

Prior nutrition-tracking experience is not an inclusion or exclusion criterion. The screening record classifies it as `none`, `less-than-3-months` or `3-months-or-more` so results can be stratified.

`COHORT-01` is the normative cohort for CP4R discovery and CP5B validation. “Affluent urban India” is an expansion hypothesis and is not used as an acceptance population in this plan.

#### CONTEXT-TAXONOMY-01 — meal preparation context

| Value | Definition |
|---|---|
| `home` | Prepared in a private home, including preparation by a household cook |
| `restaurant` | Prepared and consumed at a restaurant, café or club |
| `delivery` | Commercially prepared for delivery or takeaway |
| `packaged` | A manufacturer-defined packaged product or serving |
| `generic` | Context is unknown or the preset intentionally represents a context-neutral ingredient |

#### SUGGESTION-POLICY-01 — protein tiering and seven-item mix

Preset protein density is calculated as protein grams per 100 kcal. Presets are classified as `anchor` when density is greater than 10, `balanced` when density is from 6 through 10 inclusive, and `energy` when density is less than 6.

The required state is `energy` when no protein remains; `anchor` when protein remains and no calorie budget remains; otherwise it is derived from the remaining protein density using `anchor` at 10 or above, `balanced` from 6 inclusive to below 10, and `energy` below 6.

| Required state | Anchor presets | Balanced presets | Energy presets | Tier fallback order |
|---|---:|---:|---:|---|
| `anchor` | 3 | 3 | 1 | anchor → balanced → energy |
| `balanced` | 2 | 3 | 2 | balanced → anchor → energy |
| `energy` | 1 | 3 | 3 | energy → balanced → anchor |

The engine uses the exact mix when compatible inventory is sufficient. When a requested tier is short, it fills vacancies without duplicates in the stated fallback order until seven items are present or all compatible inventory is exhausted.

#### REFERENCE-DEVICE-01 — performance device

The performance reference is a physical Google Pixel 7a (2023) with 8 GB RAM. Tests use the production Android and Chrome versions recorded in the VCD, battery saver disabled, battery charge from 20% through 80%, no other foreground application, and Android thermal status `NONE` or `LIGHT`. One warm-up run is discarded; the following ten runs provide the verification sample. UI elapsed time is measured from the logging control's activation event to the DOM mutation that displays the new protein remainder using a monotonic clock.

#### REFERENCE-BROWSER-MATRIX-01 — acceptance clients

The acceptance matrix contains physical Google Pixel 7a Android Chrome, physical iPhone 13 iOS Safari, Windows 11 desktop Chrome and macOS desktop Safari. CP0 controls these hardware and operating-system families; CP5A records the exact installed operating-system and browser versions in the VCD before device execution, and that version record is configuration-controlled for the test campaign.

#### ACCESSIBILITY-CONFIG-01 — automated accessibility scope

Automated accessibility verification uses `axe-core` 4.12.1 with the WCAG 2.0 A/AA, WCAG 2.1 A/AA and WCAG 2.2 AA rule tags. The tested view set is: empty dashboard; dashboard after one log; every onboarding step; preset landing; cuisine folder; component builder; totals-only builder; settings; and history.

#### PILOT-EVENT-SCHEMA-01 — local pilot evidence

The versioned pilot export contains: pseudonymous participant code, consent-form version, application build hash and only the following event records:

- `first_log`: elapsed milliseconds from first launch to first confirmed log;
- `usual_meal_task`: task number 1–3, completion result, entry method and elapsed milliseconds;
- `confirmed_log`: local calendar date and entry method;
- `pilot_export`: local calendar date.

Allowed entry methods are `preset`, `adjusted-preset`, `components` and `totals-only`. Pilot events contain no meal name, ingredient, quantity, macro value, free text, contact detail, device identifier or precise location.

#### PILOT-DATA-PROCEDURE-01 — consent, transfer and retention

Pilot metrics remain in edition storage until a participant previews and explicitly exports the pilot file to the pilot lead. The app performs no automatic pilot-data transmission. Raw pilot records comprise the exported app events, coded usual-meal task results, coded comprehension result, five-point usefulness rating and pseudonymous incident record. Every raw record uses the participant code and contains no participant name or contact detail. The consent form states the fields, purpose, recipient, retention periods and withdrawal procedure. Participant contact information and the code mapping remain outside the repository with the pilot lead. The mapping is deleted within 30 calendar days after CP5B; raw pilot records are deleted within 90 calendar days after CP5B; anonymized aggregate results may be retained. A withdrawal request causes the participant's raw records and mapping entry to be deleted within seven calendar days.

### 1.3 Requirement status and evidence

The VCD shall record, for each requirement: identifier, parent objective, checkpoint, verification method, status, evidence path, result, verifier and verification date.

Allowed statuses are `Not run`, `Pass`, `Fail`, `Blocked` and `Waived`. A waiver is valid only when it records the nonconformity, impact, risk, owner, rationale and product-owner approval.

Recommended repository layout once Phase 0 starts:

```text
docs/requirements/
verification/vcd.csv
verification/evidence/CP0/
verification/evidence/CP1/
...
verification/evidence/CP6/
```

## 2. Mission objectives

| ID | Objective | Validation measure |
|---|---|---|
| `MO-01` | Enable a target user to remain aware of daily protein intake with less effort than manual macro tracking. | First-log time, logging frequency and reported usefulness |
| `MO-02` | Recognize the foods, portions and dietary preferences used by the initial Indian target cohort. | Discovery-corpus coverage and usual-meal task completion |
| `MO-03` | Recommend contextually suitable next meals from the user's remaining protein and calorie budget. | Suggestion-rule tests and user comprehension |
| `MO-04` | Protect user trust through reliable operation, transparent nutrition estimates and user-controlled data. | Offline, backup, provenance, privacy and data-loss verification |
| `MO-05` | Maintain one product core while deploying independently branded editions. | Architecture traceability and cross-edition regression results |

## 3. Checkpoint control

Every checkpoint uses the same close-out sequence:

1. Freeze the candidate commit and record its SHA.
2. Execute every verification procedure allocated to the checkpoint.
3. Store raw results, screenshots, reports and test logs under the checkpoint evidence directory.
4. Update the VCD with a result and evidence link for every requirement.
5. Record every nonconformity and re-run affected verification after correction.
6. Hold a go/no-go review; the product owner records acceptance or approved waivers.

| Checkpoint | Review | Blocking exit condition |
|---|---|---|
| `CP0` | Requirements Baseline Review | Scope, requirements, research schema and VCD structure are approved; no requirement contains `TBD` |
| `CP1A` | Build Verification Review | A reproducible, locally bundled release artifact passes automated validation |
| `CP1B` | Resilience Verification Review | Offline operation, migration and backup/restore pass |
| `CP2A` | Edition Architecture Review | Shared and India editions are generated from one core without state collision |
| `CP2B` | Shared Regression Review | The existing shared edition passes its baseline behaviours unchanged |
| `CP3A` | Food Model Review | Diet, context, portion and provenance models pass data validation |
| `CP3B` | Prototype Catalog Review | The provisional catalog meets product, context and licensing gates without participant evidence |
| `CP4A` | Protein Experience Review | Protein-first dashboard and suggestion rules pass functional verification |
| `CDR` | Critical Design Review | The prototype design description, compliance matrix, pilot-instrumentation trace and predecessor verification status are approved for acceptance verification |
| `CP4B` | Functioning Prototype Acceptance Review | Cold-start, target, preference, mobile and accessibility requirements pass in an end-to-end prototype |
| `CP4R` | Post-Prototype Discovery and Catalog Validation Review | Target-cohort discovery and corpus-based catalog qualification pass before pilot release |
| `CP5A` | Technical and Pilot-Evidence Acceptance Review | Release candidate passes device, recovery, consent and pilot-evidence procedures |
| `CP5B` | Pilot Validation Review | The 14-day target-cohort pilot meets the defined product thresholds |
| `CP6` | Release Readiness Review | Production artifact, rollback and all pre-release VCD items are accepted |
| `CP6D` | Pilot Data Disposal Review | Pilot code mappings and raw exports are deleted by their controlled deadlines |

---

## 4. Phase 0 — Baseline and requirements control

### Checkpoint CP0 — Requirements Baseline Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `GOV-001` | The project shall maintain one VCD entry for every mandatory requirement in this plan. | `MO-04` | `I` | Identifier sets in the plan and VCD are identical. |
| `GOV-002` | Each mandatory requirement shall use the required verbal form exactly once. | `MO-04` | `A` | Requirement lint report records exactly one `shall` occurrence per requirement. |
| `GOV-003` | Each mandatory requirement shall specify one parent mission objective, one verification method and one objective pass criterion. | `MO-04` | `I` | Requirements audit records zero missing attributes. |
| `GOV-004` | Each requirements change after CP0 shall have a change record containing the author, date, rationale, affected identifiers and approval. | `MO-04` | `I` | Full inspection reconciles every post-baseline plan revision with exactly one complete change record. |
| `BAS-001` | The project shall record the current `nutrition-shared` commit SHA, release-file hashes, catalog counts and supported baseline user flows before modifying the implementation. | `MO-05` | `I` | Signed baseline report contains all named fields. |

**CP0 deliverables**

- Approved requirements baseline and glossary.
- Baseline audit of the existing shared app.
- Approved discovery schema, post-prototype research procedure and prototype-assumptions register.
- Initial VCD and requirement-lint procedure.
- Risk register and change-control log.

**CP0 exit gate:** every CP0 requirement is `Pass`; the research schema is controlled, and participant collection is explicitly deferred to CP4R.

---

## 5. Phase 1 — Reproducible and resilient foundation

### Checkpoint CP1A — Build Verification Review

Define `DATA-RULESET-01` as: unique component IDs; unique preset names; resolvable component references; supported units; finite non-negative macro values; positive default quantities; positive preset quantities; and derived preset totals within the configured numeric tolerance.

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `FND-001` | A clean checkout shall produce the release artifact with one documented command. | `MO-05` | `T` | Build command exits `0` on a clean checkout and creates the documented artifact set. |
| `FND-002` | The release artifact shall load without requesting any resource from a third-party origin. | `MO-04` | `T` | Browser network log contains zero requests whose origin differs from the application origin. |
| `FND-003` | The catalog validator shall reject a catalog fixture containing any violation in `DATA-RULESET-01`. | `MO-04` | `T` | One negative fixture per rule fails with the expected diagnostic. |
| `FND-004` | The catalog validator shall accept the qualified production catalog with zero errors. | `MO-04` | `T` | Validator exits `0` and reports zero errors. |
| `FND-005` | The release artifact shall render at 390 × 844 pixels and 1440 × 900 pixels with zero uncaught console errors. | `MO-04` | `T` | Automated smoke report contains two successful viewports and zero uncaught errors. |
| `FND-006` | The build shall produce identical release-file hashes from two clean checkouts of the same source commit. | `MO-05` | `T` | Hash manifests from two builds are identical. |

**CP1A exit gate:** all automated foundation tests are repeatable on a clean checkout and `FND-001` through `FND-006` are `Pass`.

### Checkpoint CP1B — Resilience Verification Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `FND-007` | The installed application shall open its dashboard with network access disabled after one successful online load. | `MO-04` | `T` | Offline browser procedure reaches the interactive dashboard with no failed shell resource. |
| `FND-008` | The upgraded shared edition shall read a baseline `shared.*` storage fixture without changing any displayed daily total by more than 1 kcal or 0.1 g per macro. | `MO-04` | `T` | Before-and-after fixture report is within every stated tolerance. |
| `FND-009` | The backup function shall export all namespaced settings, saved meals, exclusions and daily logs into one versioned file. | `MO-04` | `T` | Export schema test finds every required state class and a schema version. |
| `FND-010` | Importing an exported backup into empty storage shall reproduce the canonical exported state exactly. | `MO-04` | `T` | Export-import-export comparison is byte-identical after canonical key ordering. |
| `FND-011` | The import function shall reject a backup with an unsupported schema version without modifying stored application data. | `MO-04` | `T` | Negative test reports rejection and identical pre/post storage hashes. |
| `FND-012` | Phase 1 shall not modify the production files served by the existing public `nutrition-shared` Pages site. | `MO-05` | `I` | Production URL and pre-phase artifact hash remain unchanged at checkpoint close. |

**CP1B exit gate:** the release candidate works offline, preserves existing state and passes the complete backup/restore test; `FND-007` through `FND-012` are `Pass`.

---

## 6. Phase 2 — One core, independently deployable editions

### Checkpoint CP2A — Edition Architecture Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `EDI-001` | The build shall generate the shared edition and India edition from the same core source commit. | `MO-05` | `RoD` | Build manifest names one core commit for both outputs. |
| `EDI-002` | Each edition shall declare its name, storage namespace, manifest values, theme values, eating window, cuisine order and suggestion policy in edition configuration. | `MO-05` | `I` | Configuration inspection finds every named field in both editions. |
| `EDI-003` | The India edition shall use a storage namespace that is unequal to `shared.`. | `MO-04` | `T` | Automated assertion passes and simultaneous edition test shows no shared keys. |
| `EDI-004` | The India edition shall have a manifest name, short name, icon and start URL distinct from the shared edition. | `MO-05` | `I` | Manifest comparison records four distinct values. |
| `EDI-005` | An edition-only copy or theme change shall require no modification to core application logic. | `MO-05` | `RoD` | Demonstration commit changes only edition configuration or edition assets. |
| `EDI-006` | The build shall place each edition in a separate documented output directory. | `MO-05` | `T` | Build test finds complete, non-overlapping output trees. |

**CP2A exit gate:** edition selection is configuration-driven and `EDI-001` through `EDI-006` are `Pass`.

### Checkpoint CP2B — Shared Regression Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `REG-001` | The generated shared edition shall preserve the CP0 catalog counts. | `MO-05` | `T` | Counts equal the approved baseline unless an approved change record states otherwise. |
| `REG-002` | The generated shared edition shall pass the CP0 baseline logging, adjustment, save, exclusion, target-edit and history flows. | `MO-05` | `T` | Regression suite reports all named flows as `Pass`. |
| `REG-003` | The generated shared edition shall preserve every CP0 default target and eating-window value. | `MO-05` | `T` | Configuration comparison is identical to the baseline. |
| `REG-004` | The shared and India editions shall run concurrently under one origin without reading or overwriting each other's namespaced state. | `MO-04` | `T` | Cross-edition isolation test records zero foreign reads and writes. |

**CP2B exit gate:** the existing edition remains behaviorally compatible and `REG-001` through `REG-004` are `Pass`.

---

## 7. Phase 3 — Indian dietary model and qualified catalog

### Checkpoint CP3A — Food Model Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `CNT-001` | Each component shall declare one dietary class from `vegan`, `vegetarian`, `egg` and `nonveg`. | `MO-02` | `T` | Schema validator reports zero missing or invalid dietary classes. |
| `CNT-002` | Each preset dietary class shall be derived from its component composition. | `MO-02` | `T` | Exhaustive derivation test matches the expected class for every preset. |
| `CNT-003` | Each component shall declare whether it contains onion or garlic. | `MO-02` | `T` | Schema validator reports zero missing boolean values. |
| `CNT-004` | Enabling the no-onion-or-garlic preference shall exclude every preset containing a component marked as containing onion or garlic. | `MO-02` | `T` | Exhaustive filter test finds zero incompatible results. |
| `CNT-005` | The India catalog shall support `katori`, `pc`, `tsp`, `tbsp`, `cup`, `glass`, `g` and `ml` where applicable to the component. | `MO-02` | `T` | Approved unit fixture converts every named unit to expected totals within 0.1%. |
| `CNT-006` | Each prepared-dish preset shall declare one context from `home`, `restaurant`, `delivery`, `packaged` and `generic`. | `MO-02` | `T` | Schema validator reports zero missing or invalid contexts. |
| `CNT-007` | Each newly added or changed component shall reference a provenance record containing source, access date, portion basis and license status. | `MO-04` | `I` | Provenance inspection finds a complete record for every changed component. |
| `CNT-008` | The release catalog shall contain no component whose provenance license status is `unapproved`. | `MO-04` | `I` | License-register report contains zero unapproved released components. |
| `CNT-009` | Preset macro totals shall equal the sum of their scaled components within 1 kcal and 0.1 g per macro. | `MO-04` | `T` | Exhaustive catalog test passes every preset. |

**CP3A exit gate:** the data model expresses dietary class, onion/garlic exclusion, household portions, meal context and provenance; `CNT-001` through `CNT-009` are `Pass`. Onion/garlic exclusion is a specifically named ingredient rule and does not claim to express every dietary practice.

### Checkpoint CP3B — Prototype Catalog Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `CAT-004` | Each prepared dish displayed to the user shall display its declared context. | `MO-04` | `T` | UI test finds the expected context on every prepared-dish card inspected. |
| `CAT-006` | The catalog shall distinguish home and restaurant variants when their approved calorie estimates differ by more than 20%. | `MO-04` | `A` | Variance analysis finds zero unseparated meal pairs above the threshold. |

**CP3B exit gate:** the provisional catalog displays context, separates materially different context variants and contains only licensed or approved nutrition data; every CP3B requirement is `Pass`. Corpus coverage is not a prototype exit condition.

---

## 8. Phase 4 — Protein-first product experience

### Checkpoint CP4A — Protein Experience Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `PRT-001` | The India-edition dashboard shall display grams of protein remaining within the initial 390 × 844 pixel viewport. | `MO-01` | `I` | Screenshot inspection shows the complete value without scrolling. |
| `PRT-002` | Logging a meal shall update the displayed protein remainder within 500 ms on `REFERENCE-DEVICE-01`. | `MO-01` | `T` | Each of the ten measured runs defined by `REFERENCE-DEVICE-01` has an elapsed time not exceeding 500 ms. |
| `PRT-003` | Each preset card shall display protein grams and kilocalories before the user logs the preset. | `MO-01` | `T` | Card-component test finds both values for every preset fixture. |
| `PRT-004` | The suggestion pool shall exclude presets incompatible with the stored dietary preference. | `MO-03` | `T` | Exhaustive preference test finds zero incompatible suggestions. |
| `PRT-005` | At least four items in a complete `SUGGESTION-POLICY-01` set shall match the current meal slot when at least four compatible slot-matched presets exist. | `MO-03` | `T` | Seeded tests for breakfast, lunch, snack and dinner contain at least four matching items. |
| `PRT-006` | A suggestion set with sufficient compatible tier inventory shall match the tier counts in `SUGGESTION-POLICY-01` exactly. | `MO-03` | `T` | Boundary fixtures for all three required states produce the exact 3/3/1, 2/3/2 and 1/3/3 mixes. |
| `PRT-007` | The user-facing India-edition interface shall contain no occurrence of the category label `filler`. | `MO-01` | `I` | Built-artifact text inspection returns zero occurrences. |
| `PRT-008` | The post-log interface shall display the updated grams of protein remaining. | `MO-01` | `T` | Logging-flow test finds the expected remainder after each fixture meal. |
| `PRT-009` | The suggestion set shall contain seven unique compatible presets whenever at least seven compatible presets exist. | `MO-03` | `T` | Inventory fixtures at 6, 7 and 20 compatible presets return 6, 7 and 7 unique items respectively. |
| `PRT-010` | A tier-short suggestion set shall fill vacancies in the fallback order defined by `SUGGESTION-POLICY-01`. | `MO-03` | `T` | One shortage fixture per required state returns the expected ordered tier substitutions. |

**CP4A exit gate:** the dashboard, meal cards, post-log feedback and suggestion rules make protein the primary interaction; every CP4A requirement is `Pass`.

### Checkpoint CDR — Critical Design Review

The CDR confirms, before acceptance effort is spent at CP4B, that the detailed prototype design is complete, compliant and privacy-correct, and that no unresolved predecessor verification debt is carried forward. Entry criteria, data package, board roles, RID handling and close-out are controlled in [requirements/CDR-framework.md](requirements/CDR-framework.md); evidence is stored under `docs/requirements/evidence/CDR/`.

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `CDR-001` | The CDR data package shall contain a design description mapping every CP4B-allocated requirement to at least one design element. | `MO-04` | `I` | Package inspection maps every CP4B requirement identifier to a design-description section. |
| `CDR-002` | The CDR compliance matrix shall assign each CP4B-allocated requirement one implementing design element and one planned verification procedure. | `MO-04` | `I` | Matrix inspection records zero unassigned CP4B requirements. |
| `CDR-003` | The CDR shall disposition every requirement allocated to CP0 through CP4A whose status is neither `Pass` nor `Waived` with a recovery action, owner and due date. | `MO-04` | `I` | VCD extract at CDR close-out records zero `Fail`, `Blocked` or `Not run` predecessor entries without a recorded disposition. |
| `CDR-004` | The pilot instrumentation design shall trace each `PILOT-EVENT-SCHEMA-01` event type to one generating user action and one namespaced storage key. | `MO-04` | `RoD` | Design trace table covers all four event types with zero untraced entries. |
| `CDR-005` | Each CDR review item discrepancy shall receive a disposition of `close`, `action` or `reject` and, for an `action` disposition, an owner and due date before CDR close-out. | `MO-04` | `I` | RID-log inspection records zero undispositioned items and zero actions without an owner or due date at close-out. |
| `CDR-006` | The risk register shall record a likelihood, impact and owner for every open risk at CDR close-out. | `MO-04` | `I` | Risk-register inspection records zero open risks missing any of the three fields. |

**CDR exit gate:** `CDR-001` through `CDR-006` are `Pass`; the review chair records an authorization to proceed. CP4B does not open before this authorization.

### Checkpoint CP4B — Functioning Prototype Acceptance Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `ONB-001` | A user with empty edition storage shall see onboarding before the first interactive dashboard session. | `MO-01` | `T` | Empty-storage test opens onboarding on first launch. |
| `ONB-002` | Each onboarding step shall provide a visible skip control. | `MO-01` | `I` | Screenshot set shows one visible skip control on every step. |
| `ONB-003` | Settings shall provide a control that reopens the completed onboarding flow. | `MO-01` | `T` | Settings-flow test reopens onboarding after completion. |
| `ONB-004` | Onboarding shall store one dietary preference selected by the user. | `MO-02` | `T` | Preference selection persists after reload. |
| `ONB-005` | The calorie estimator shall withhold an estimate until age, height, weight, sex and activity inputs are valid. | `MO-04` | `T` | One negative test per missing or invalid input produces no estimate. |
| `ONB-006` | Onboarding shall provide a path for entering existing calorie and protein targets without using the estimator. | `MO-04` | `T` | Manual-target task completes and persists both targets. |
| `ONB-007` | Every estimated target shall be labelled as an editable starting estimate. | `MO-04` | `I` | Copy inspection finds the label adjacent to every estimate output. |
| `ONB-008` | General-release onboarding shall explain that nutrition values are estimates and user data remains on the device unless the user exports it. | `MO-04` | `I` | Approved general-release copy is present before completion. |
| `ONB-009` | Pilot onboarding shall explain that opted-in pilot metrics remain local until participant-initiated export under `PILOT-DATA-PROCEDURE-01`. | `MO-04` | `I` | Approved pilot copy names opt-in, local storage, participant export and the pilot data procedure. |
| `ACC-001` | The India edition shall have no horizontal page overflow at viewport widths of 360, 390 and 430 pixels. | `MO-01` | `T` | Browser geometry test records document width less than or equal to viewport width at all three sizes. |
| `ACC-002` | Every interactive control in onboarding and meal logging shall be operable using keyboard input. | `MO-01` | `T` | Manual keyboard procedure completes both flows without pointer input. |
| `ACC-003` | Automated accessibility testing shall report zero `critical` or `serious` axe-core impacts under `ACCESSIBILITY-CONFIG-01`. | `MO-01` | `T` | axe-core 4.12.1 report records zero critical and zero serious impacts for every defined view and rule tag. |
| `ACC-004` | Every visible form control shall have a programmatically associated accessible name. | `MO-01` | `T` | Accessibility inspection reports zero unnamed form controls. |

**CP4B exit gate:** a new user can establish targets and preferences, understand the estimate/privacy boundary, complete an end-to-end meal log and see updated protein guidance on mobile; every CP4A and CP4B requirement is `Pass`. This is the functioning-prototype milestone and precedes participant research.

### Checkpoint CP4R — Post-Prototype Discovery and Catalog Validation Review

Participant recruitment, meal-corpus collection and corpus-based catalog validation begin only after CP4B accepts the functioning prototype.

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `BAS-000` | Each discovery participant shall satisfy `COHORT-01`. | `MO-02` | `I` | Full inspection of anonymized screening records finds zero inclusion-criteria exceptions. |
| `BAS-002` | The discovery study shall collect at least 100 meal instances from at least 10 members of the target cohort. | `MO-02` | `A` | An anonymized corpus contains at least 100 rows and 10 distinct participant codes. |
| `BAS-003` | Each discovery-corpus meal instance shall record meal name, portion language, meal slot, dietary class and one `CONTEXT-TAXONOMY-01` value. | `MO-02` | `I` | Corpus schema validation reports zero incomplete rows and zero invalid context values. |
| `BAS-004` | The discovery corpus committed to the repository shall contain no participant name, contact detail, address or free-text personal identifier. | `MO-04` | `I` | Privacy inspection records zero prohibited fields or values. |
| `CAT-001` | The qualified India catalog shall directly represent at least 80% of meal instances in the approved discovery corpus. | `MO-02` | `A` | Mapping report shows coverage greater than or equal to 80%. |
| `CAT-002` | The qualified India catalog shall directly represent at least 80% of discovery-corpus meal instances in each recorded dietary class containing at least 10 instances. | `MO-02` | `A` | Per-class mapping report meets the threshold for every eligible class. |
| `CAT-003` | Each represented discovery-corpus meal shall be discoverable by its recorded user term or an approved synonym. | `MO-02` | `T` | Search fixture returns the mapped preset in the first 10 results for every represented meal. |
| `CAT-005` | Each preset portion description shall use at least one unit present in the approved discovery corpus when such a unit exists for that meal. | `MO-02` | `A` | Portion-language mapping report records zero avoidable mismatches. |
| `CAT-007` | CP4R context analyses shall use `CONTEXT-TAXONOMY-01` values from the discovery corpus without recoding. | `MO-02` | `A` | Analysis input audit finds zero context transformations between corpus rows and catalog mappings. |

**CP4R exit gate:** every CP4R requirement is `Pass`; prototype assumptions have been checked against the target cohort and incorporated before pilot release.

---

## 9. Phase 5 — Technical acceptance and target-cohort validation

### Checkpoint CP5A — Technical and Pilot-Evidence Acceptance Review

#### Pilot evidence and privacy controls

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `PIL-001` | Pilot instrumentation shall remain disabled until the participant records explicit consent to the current pilot consent-form version. | `MO-04` | `T` | Fresh-storage tests show disabled instrumentation before consent and enabled instrumentation only after consent. |
| `PIL-002` | A non-consenting session shall create zero pilot event records. | `MO-04` | `T` | Full onboarding and logging procedure leaves no pilot schema key in storage. |
| `PIL-003` | The pilot consent screen shall disclose the collected fields, purpose, recipient, retention periods and withdrawal procedure in `PILOT-DATA-PROCEDURE-01`. | `MO-04` | `I` | Approved copy inspection finds every required disclosure before the consent action. |
| `PIL-004` | A consenting pilot session shall record only events permitted by `PILOT-EVENT-SCHEMA-01`. | `MO-04` | `T` | Schema validation of all generated pilot records reports zero unknown fields or event types. |
| `PIL-005` | A pilot export shall contain no field prohibited by `PILOT-EVENT-SCHEMA-01`. | `MO-04` | `T` | Export privacy test records zero meal, nutrition, free-text, contact, device or precise-location fields. |
| `PIL-006` | The application shall transmit no pilot event automatically. | `MO-04` | `T` | Consented 30-minute logging session produces zero network requests containing pilot records. |
| `PIL-007` | The pilot interface shall require the participant to preview and initiate each pilot export. | `MO-04` | `T` | Export procedure cannot create a transferable file until both preview and export actions occur. |
| `PIL-008` | Access to project-held raw pilot records and the participant-code mapping shall be restricted to the pilot lead. | `MO-04` | `I` | Permission inspection lists only the pilot lead as an authorized principal. |
| `PIL-009` | A pilot withdrawal shall delete the participant's raw records and mapping entry within seven calendar days. | `MO-04` | `T` | Timed dry-run with a synthetic participant records deletion within seven days and zero residual matches. |

#### Device and state-integrity controls

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `TAC-001` | The release candidate shall complete install, offline reopen, meal log, adjustment, backup and restore procedures on every `REFERENCE-BROWSER-MATRIX-01` client. | `MO-04` | `T` | Signed device matrix records every procedure as `Pass` on every defined client. |
| `TAC-002` | The release candidate shall complete 100 consecutive preset-log and undo cycles without a state mismatch. | `MO-04` | `T` | Automated stress test reports zero mismatches. |
| `TAC-003` | Reloading the application within one second after visible log confirmation shall preserve the confirmed meal exactly once. | `MO-04` | `T` | Ten runs preserve one schema-valid copy of the confirmed meal with no duplicate. |
| `TAC-004` | The release candidate shall contain zero unresolved severity-1 or severity-2 defects. | `MO-04` | `I` | Defect register contains zero open entries at either severity. |
| `TAC-005` | Forced termination at a deterministic storage-write injection point shall leave storage in either the complete pre-write state or the complete post-write state. | `MO-04` | `T` | Ten terminations at each test-hook injection point produce only schema-valid pre-state or post-state hashes, with zero partial records or duplicates. |

**Severity definition:** severity 1 means data loss, inability to open or a materially unsafe nutrition result; severity 2 means a primary logging, onboarding, preference or recovery flow cannot complete without a workaround.

**CP5A exit gate:** the candidate is technically and procedurally safe to place with pilot users; `PIL-001` through `PIL-009` and `TAC-001` through `TAC-005` are `Pass`.

### Checkpoint CP5B — Pilot Validation Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `VAL-001` | The validation pilot shall include at least 15 consenting participants for 14 consecutive days. | `MO-01` | `I` | Pilot register contains at least 15 consented participant codes and 14 days of observation. |
| `VAL-002` | The pilot shall include at least five vegetarian or Jain participants and at least five non-vegetarian participants. | `MO-02` | `I` | Anonymized cohort summary meets both thresholds. |
| `VAL-003` | The median elapsed time from first launch to first confirmed meal log shall not exceed 60 seconds. | `MO-01` | `A` | Analysis of consented `first_log` events from `PILOT-EVENT-SCHEMA-01` reports a median not exceeding 60,000 ms. |
| `VAL-004` | At least 80% of pilot participants shall locate or adjust each of their three most frequent meals without using totals-only entry. | `MO-02` | `A` | Consented `usual_meal_task` events show three completed tasks using `preset` or `adjusted-preset` for at least 80% of participants. |
| `VAL-005` | At least 80% of pilot participants shall correctly explain why a protein-dense meal is suggested after a protein-light day. | `MO-03` | `A` | Consented coded comprehension records under `PILOT-DATA-PROCEDURE-01` contain at least 80% correct responses. |
| `VAL-006` | At least 60% of pilot participants shall log food on at least four distinct days during the second pilot week. | `MO-01` | `A` | Distinct local dates from consented `confirmed_log` events meet the participant and day thresholds. |
| `VAL-007` | The pilot shall record zero incidents of confirmed application-caused data loss. | `MO-04` | `A` | Consented pseudonymous incident records under `PILOT-DATA-PROCEDURE-01` contain zero confirmed data-loss events. |
| `VAL-008` | At least 80% of pilot participants shall rate the statement `This app helps me stay on top of protein` at four or five on a five-point scale. | `MO-01` | `A` | Consented coded usefulness ratings under `PILOT-DATA-PROCEDURE-01` meet the threshold. |
| `VAL-009` | Each pilot participant shall satisfy `COHORT-01`. | `MO-02` | `I` | Full inspection of anonymized screening records finds zero inclusion-criteria exceptions. |
| `VAL-010` | The pilot shall include at least five participants with less than three months of tracking experience and at least five with three months or more. | `MO-02` | `I` | Anonymized cohort summary meets both experience thresholds. |

**CP5B exit gate:** every CP5B requirement is `Pass`. A failed product threshold returns the project to the checkpoint owning the causal requirement; it is not waived merely to meet a launch date.

---

## 10. Phase 6 — Release and controlled launch

### Checkpoint CP6 — Release Readiness Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `REL-001` | The India edition shall be deployed at a URL distinct from the existing shared-edition URL. | `MO-05` | `I` | Production inspection records two distinct URLs. |
| `REL-002` | The production India-edition artifact hashes shall equal the CP5B accepted artifact hashes. | `MO-04` | `T` | Downloaded production hash manifest is identical to the accepted manifest. |
| `REL-003` | The existing public shared edition shall remain available throughout the India-edition deployment. | `MO-05` | `T` | Availability test returns a successful interactive shared dashboard before, during and after deployment. |
| `REL-004` | The release procedure shall restore the preceding production artifact within 15 minutes. | `MO-04` | `T` | Timed rollback drill completes within 15 minutes and passes the smoke test. |
| `REL-005` | The public release shall display a privacy statement, nutrition-estimate statement and data-export instructions. | `MO-04` | `I` | Production inspection finds all three approved texts. |
| `REL-006` | Each mandatory requirement allocated to a checkpoint preceding CP6 shall have status `Pass` or an approved waiver before public release. | `MO-04` | `I` | Pre-release VCD contains zero other statuses for CP0, CP1A, CP1B, CP2A, CP2B, CP3A, CP3B, CP4A, CDR, CP4B, CP4R, CP5A and CP5B. |
| `REL-007` | The first 14 production days shall contain zero unresolved severity-1 or severity-2 defects. | `MO-04` | `I` | Day-14 defect review contains zero unresolved entries at either severity. |

**CP6 exit gate:** `REL-001` through `REL-006` are `Pass` before launch; `REL-007` closes the controlled-launch period.

### Checkpoint CP6D — Pilot Data Disposal Review

| ID | Requirement | Parent | Method | Pass criterion and evidence |
|---|---|---|---|---|
| `PIL-010` | The pilot lead shall delete the participant-code mapping within 30 calendar days after CP5B. | `MO-04` | `I` | Dated deletion record and full storage inspection show zero remaining mapping entries by the deadline. |
| `PIL-011` | The pilot lead shall delete all raw pilot records within 90 calendar days after CP5B. | `MO-04` | `I` | Dated deletion record and full raw-data inventory show zero remaining raw records by the deadline. |

**CP6D exit gate:** `PIL-010` and `PIL-011` are `Pass`; only anonymized aggregate pilot results remain.

## 11. Phase dependencies and return paths

```text
CP0
 └─ CP1A ─ CP1B
       └─ CP2A ─ CP2B
             └─ CP3A ─ CP3B
                   └─ CP4A ─ CDR ─ CP4B
                         └─ CP4R
                               └─ CP5A ─ CP5B
                                     └─ CP6 ─ CP6D
```

- A catalog failure returns to CP3A or CP3B.
- A discovery-coverage failure at CP4R returns to CP3A, CP3B, CP4A or CP4B according to whether the cause is data, catalog, search or interaction design.
- A comprehension or first-log failure returns to CP4A or CP4B.
- A data-loss, offline or recovery failure returns to CP1B regardless of discovery phase.
- A shared-edition regression returns to CP2B and blocks all later checkpoints.
- A pilot retention failure triggers product analysis before further feature development.

## 12. Review disposition record

| Review ID | Disposition | Controlled resolution |
|---|---|---|
| `RID-M1` | Accepted | `PILOT-EVENT-SCHEMA-01`, `PILOT-DATA-PROCEDURE-01`, `ONB-009`, `PIL-001`–`PIL-011` and the evidence sources in `VAL-003`–`VAL-008` define opt-in collection, participant-initiated export, data minimization, access, withdrawal and disposal. |
| `RID-M2` | Accepted | `COHORT-01` defines normative inclusion, exclusion and stratification criteria; `BAS-000`, `VAL-009` and `VAL-010` verify cohort membership and experience balance. |
| `RID-M3` | Accepted | `SUGGESTION-POLICY-01` fixes tier boundaries, state logic, seven-item mixes and shortage ordering; `PRT-005`, `PRT-006`, `PRT-009` and `PRT-010` verify them. |
| `RID-M4` | Accepted | `REFERENCE-DEVICE-01` defines the physical performance device and operating conditions globally; `REFERENCE-BROWSER-MATRIX-01` separately controls compatibility clients. |
| `RID-M5` | Accepted | `TAC-003` verifies post-confirmation reload persistence; `TAC-005` verifies deterministic interruption atomicity at storage-write injection points. |
| `RID-M6` | Accepted | `GOV-004` now requires full reconciliation of every post-baseline revision with the change log. |
| `RID-M7` | Accepted | `ACCESSIBILITY-CONFIG-01` fixes axe-core 4.12.1, WCAG rule tags and exact views; `ACC-003` applies the critical/serious acceptance threshold. |
| `RID-M8` | Accepted | `FND-002` and its pass criterion both require zero requests to every third-party origin, regardless of resource type. |
| `RID-M9` | Accepted | `CONTEXT-TAXONOMY-01` supplies the five-value model; `BAS-003` captures it and `CAT-007` prohibits recoding before CP4R analysis. |

---

## 13. Initial risk register

| Risk | Linked requirements | Preventive control |
|---|---|---|
| Divergent forks become unsynchronizable | `EDI-001`, `EDI-005`, `REG-002` | One core source and edition-generated builds |
| Indian nutrition data is used without product rights | `CNT-007`, `CNT-008` | Provenance and license register; obtain permission or use approved sources |
| Recipe variation creates false precision | `CNT-006`, `CAT-004`, `CAT-006` | Context-specific variants and visible context labels |
| Onboarding creates unsafe or misleading targets | `ONB-005`, `ONB-006`, `ONB-007` | Complete estimator inputs, manual path and editable-estimate copy |
| Local-only storage causes silent user loss | `FND-009`, `FND-010`, `TAC-003`, `TAC-005` | Versioned backup/restore and deterministic interruption tests |
| Pilot metrics conflict with the local-data promise | `ONB-009`, `PIL-001`–`PIL-011`, `VAL-003`, `VAL-004`, `VAL-006` | Explicit consent, local minimal events, participant export and controlled disposal |
| South Bombay assumptions overfit the broader market | `BAS-002`, `CAT-001`, `VAL-002` | Evidence-based corpus and represented pilot cohort |
| Growth is declared from anecdote alone | `VAL-003`–`VAL-008` | Blocking product-validation thresholds before public launch |

## 14. Definition of complete

The India edition upgrade is complete only when:

1. Every checkpoint listed in section 3, including CP4R, has an approved review record.
2. The final VCD closes every mandatory requirement with objective evidence.
3. The accepted production artifact is traceable to its source commit and build record.
4. The shared edition remains compatible and independently deployable.
5. The target-cohort pilot validates the intended protein-tracking use case.
6. The controlled-launch period closes with no unresolved severity-1 or severity-2 defect.
