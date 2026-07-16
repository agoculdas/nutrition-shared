# Shared-app baseline report

- Recorded: 2026-07-16
- Recorder: Codex, acting for the repository owner
- Baseline commit: `1a92635762d73c5c037910ba225805004b9cd78c`
- Branch: `main`
- Live production URL: `https://agoculdas.github.io/nutrition-shared/`
- Live response at capture: HTTP 200
- Live `index.html` SHA-256: `d2c33e01b6c40980c5d13bef322c40717625ffeea314098afe794cdad8fc67a5`
- Baseline-commit `index.html` SHA-256: `d2c33e01b6c40980c5d13bef322c40717625ffeea314098afe794cdad8fc67a5`
- Live file matched baseline commit: yes
- Baseline `icon.svg` SHA-256: `836c9da432e43898530d18368418fbda3ea122e827d49a63096f9169dd5325f3`
- Baseline `manifest.webmanifest` SHA-256: `e2b70a42ed55f094cf73b9d7274d38079d517fbd85448fcac96c40bb31e540c1`
- Component count: 167
- Preset count: 314

## Supported baseline flows

1. Open the daily dashboard and review nutrition totals against configured targets.
2. Log a preset meal directly.
3. Adjust a preset in the component builder before logging.
4. Build a meal from components or use totals-only entry.
5. Edit, delete, rebuild and save a logged meal.
6. Exclude and restore components from recommendations.
7. Change nutrition targets and theme.
8. Review 7-day or 30-day history and export it as CSV or print it.

## Baseline storage

Application state is stored under the `shared.` namespace. Baseline state classes are daily `log:YYYY-MM-DD` records, `meals:saved`, `targets:v1`, `theme:v1`, `excludes:v1`, and the namespaced builder-recent record.

The recorder attests that these values were captured before Phase 1 implementation changes and are reproducible from the named commit.
