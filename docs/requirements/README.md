# Requirements evidence

This directory holds the controlled evidence for the ECSS-tailored plan.

- `vcd.json` is the verification control document. It contains exactly one entry for every mandatory core-plan and approved meal-prep annex requirement (109 core, 13 meal-prep annex and 8 fast-log annex requirements, 130 in total).
- `../PLAN-meal-prep-annex.md` controls the approved batch-recipe annex under checkpoint `CPMP`. Its approval authorizes local implementation; qualification and acceptance remain evidence-dependent.
- `baseline-report.md` records the pre-change shared-app baseline.
- `glossary.md` fixes the Phase 0 vocabulary.
- `change-log.md` records requirements-baseline changes made after CP0 approval.
- `CDR-framework.md` controls the Critical Design Review held between CP4A and CP4B (`CDR-001`–`CDR-006`).
- `discovery-corpus.schema.json` defines the anonymized discovery data contract.
- `discovery-corpus.csv` is the controlled corpus. It intentionally contains only its header until participant research is completed.
- `prototype-assumptions.md` records the provisional assumptions permitted through CP4B and their later validation routes.
- `evidence/` contains checkpoint results and machine-generated reports.

Run `npm run verify:requirements` after changing the plan or VCD.
