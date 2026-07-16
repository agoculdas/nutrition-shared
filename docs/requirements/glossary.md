# Controlled glossary

The definitions in section 1.2 of `PLAN-india-upgrade-ecss.md` are normative. This glossary adds implementation terms used through CP1.

| Term | Controlled meaning |
|---|---|
| Release artifact | The complete contents of `dist/` produced by `npm run build`. |
| Application origin | The scheme, host and port from which the release artifact is served. |
| Qualified production catalog | `PRESET_DEFS` and `BUILDER_COMPONENTS` extracted from the controlled source `index.html`. |
| `DATA-RULESET-01` | The eight catalog rules enumerated in CP1A, using a derived-total tolerance of 0.05 macro units. |
| Baseline storage fixture | A set of string values under the `shared.` namespace representing the pre-Phase-1 storage schema. |
| Canonical backup | UTF-8 JSON with recursively sorted object keys, two-space indentation and one terminal newline. |
| Existing production site | The artifact returned by `https://agoculdas.github.io/nutrition-shared/` before any branch publication. |
