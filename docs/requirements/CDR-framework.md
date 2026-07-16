# Critical Design Review (CDR) — Framework

**Checkpoint ID:** `CDR`
**Position:** between `CP4A` (Protein Experience Review) and `CP4B` (Functioning Prototype Acceptance Review)
**Controlled by:** [PLAN-india-upgrade-ecss.md](../PLAN-india-upgrade-ecss.md) §8; change record dated 2026-07-16 in [change-log.md](change-log.md)
**Evidence directory:** `docs/requirements/evidence/CDR/`

## 1. Purpose

The CDR is the point of maximum leverage before the project commits to acceptance verification. CP4A has proven the protein experience; CP4B will *accept* the functioning prototype and thereby authorize participant research (CP4R). The CDR confirms — before that acceptance effort is spent — that:

1. the detailed design of everything CP4B will verify (onboarding, estimator, dietary preference, pilot consent copy, accessibility structure) actually exists and satisfies its requirements on paper;
2. the pilot instrumentation design is privacy-correct *by construction*, not just by later test (each event traced to its generating action and storage key);
3. no waived, reopened or newly discovered predecessor verification debt is being silently carried into acceptance;
4. the risk register reflects reality at the design-freeze point.

## 2. Normative basis and tailoring

Tailored from [ECSS-M-ST-10-01C — Organization and conduct of reviews](https://ecss.nl/standard/ecss-m-st-10-01c-organization-and-conduct-of-reviews/): review data package, review item discrepancy (RID) handling, disposition categories and close-out. Tailoring for this single-owner consumer project: the review board is reduced to the roles in §5, the review may be conducted asynchronously over the repository, and the data package is a set of controlled repository documents rather than a formal document delivery.

## 3. Entry criteria

The CDR does not convene until all of the following hold:

1. Every owning checkpoint from `CP0` through `CP4A` is closed in dependency order, with each allocated requirement `Pass` or carrying an approved waiver.
2. The data package (§4) is complete and its commit SHA is frozen and recorded.
3. Every predecessor requirement (CP0–CP4A) has a current VCD status — no empty status fields.
4. Every approved waiver or predecessor requirement reopened after its owning checkpoint closed has a review note and proposed disposition prepared for board decision. A requirement that still blocks its owning checkpoint — including `FND-007` at CP1B — cannot be carried forward to the CDR.
5. The package has been available to all reviewers for at least 3 calendar days.

## 4. Review data package

| # | Item | Location | Feeds requirement |
|---|---|---|---|
| 1 | Prototype design description — onboarding flow, calorie estimator, dietary-preference storage, pilot consent copy (`ONB-009` draft), accessibility structure | `evidence/CDR/design-description.md` | `CDR-001` |
| 2 | Compliance matrix — each CP4B requirement → implementing design element → planned verification procedure | `evidence/CDR/compliance-matrix.md` | `CDR-002` |
| 3 | Predecessor VCD extract — status of every CP0–CP4A requirement at the frozen SHA | `evidence/CDR/predecessor-status.md` | `CDR-003` |
| 4 | Pilot instrumentation trace — each `PILOT-EVENT-SCHEMA-01` event type → generating user action → namespaced storage key | `evidence/CDR/pilot-instrumentation-trace.md` | `CDR-004` |
| 5 | RID log | `evidence/CDR/rid-log.md` | `CDR-005` |
| 6 | Updated risk register with likelihood, impact and owner per open risk | plan §13 (amended) or `evidence/CDR/risk-register.md` | `CDR-006` |
| 7 | Frozen-commit record (SHA, date, builder) | `evidence/CDR/frozen-commit.md` | close-out sequence step 1 |

## 5. Review board and roles

| Role | Held by | Responsibility |
|---|---|---|
| Review chair / product owner | Repository stakeholder | Convenes the review, dispositions RIDs, signs authorization to proceed |
| Design author | Implementing agent or developer | Presents the data package, answers RIDs, executes `action` dispositions |
| Independent reviewer | Any agent or person who did not author the reviewed design | Raises RIDs against the package; verifies `CDR-001`–`CDR-006` |
| Pilot lead | Repository stakeholder (until delegated) | Reviews items 1 and 4 for consistency with `PILOT-DATA-PROCEDURE-01` |

One person may hold multiple roles, except that the independent reviewer must not be the design author of the item under review.

## 6. Conduct

1. Freeze the candidate commit; record its SHA in the data package (item 7).
2. Distribute the package (entry criterion 5 starts).
3. Reviewers raise findings as RIDs in `evidence/CDR/rid-log.md` — one row per discrete finding, referencing a package item and, where applicable, a requirement ID.
4. The board dispositions every RID as one of:
   - `close` — resolved during review; resolution recorded in the RID row;
   - `action` — accepted; owner and due date recorded; the action must complete before CP4B opens unless the board explicitly records it as CP4B-compatible;
   - `reject` — not accepted; rationale recorded.
5. Verify `CDR-001` through `CDR-006`; update the VCD with results and evidence links.
6. The chair records the outcome: **authorize CP4B**, **authorize CP4B with actions**, or **return to design** (naming the return checkpoint per plan §11).

## 7. RID log format

`evidence/CDR/rid-log.md` uses:

| RID | Package item | Related req | Finding | Disposition | Owner | Due | Status |
|---|---|---|---|---|---|---|---|

RID identifiers are `CDR-RID-001` onward. A RID is `Open` until its disposition is executed and confirmed, then `Closed`.

## 8. Exit criteria

The CDR closes only when:

1. `CDR-001` through `CDR-006` are `Pass` in the VCD (or carry an approved waiver per plan §1.3).
2. Every RID is dispositioned; every `action` RID has an owner and due date.
3. The chair's authorization record is stored in `evidence/CDR/`.

CP4B may not open before the CDR closes with an authorization.

## 9. Allocated requirements

Normative text lives in the plan (§8, Checkpoint CDR); this table is a non-normative index.

| ID | Verifies | Method |
|---|---|---|
| `CDR-001` | Design description covers every CP4B-allocated requirement | `I` |
| `CDR-002` | Compliance matrix assigns each CP4B requirement a design element and a planned verification procedure | `I` |
| `CDR-003` | Every non-`Pass`, non-`Waived` predecessor requirement (CP0–CP4A) is dispositioned with recovery action, owner and due date | `I` |
| `CDR-004` | Each `PILOT-EVENT-SCHEMA-01` event type traces to one generating user action and one namespaced storage key | `RoD` |
| `CDR-005` | Every RID is dispositioned `close`, `action` or `reject`; every action has an owner and due date before close-out | `I` |
| `CDR-006` | Risk register records likelihood, impact and owner for every open risk | `I` |
