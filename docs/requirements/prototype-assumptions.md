# Prototype assumptions register

These assumptions may guide implementation through CP4B. They are not validated market claims and cannot satisfy CP4R or CP5B evidence requirements.

| ID | Provisional assumption | Prototype consequence | Required validation |
|---|---|---|---|
| `PA-01` | Protein remainder is the most valuable daily summary for the initial cohort. | Make protein remaining the primary dashboard value. | `VAL-003`, `VAL-006`, `VAL-008` at CP5B. |
| `PA-02` | English is acceptable for the first South Bombay prototype. | Build and test the first onboarding and logging flow in English. | Cohort screening at CP4R and pilot completion at CP5B. |
| `PA-03` | The existing Indian and international catalog is sufficient to prototype search, adjustment and suggestions. | Use it provisionally without claiming target-cohort coverage. | `CAT-001`–`CAT-003`, `CAT-005`, `CAT-007` at CP4R. |
| `PA-04` | Household, restaurant, delivery, packaged and generic contexts cover the meaningful preparation differences. | Implement `CONTEXT-TAXONOMY-01` in the prototype data model. | `BAS-003`, `CAT-006`, `CAT-007` at CP4R. |
| `PA-05` | Seven protein-tiered suggestions are a workable choice set. | Implement `SUGGESTION-POLICY-01` and verify its deterministic behavior. | Comprehension and usefulness thresholds at CP5B. |

Any assumption rejected at CP4R or CP5B creates a change record and returns to the checkpoint owning the affected product behavior.
