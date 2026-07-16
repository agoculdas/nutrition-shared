# CP1A verification report

Recorded 2026-07-16 by Codex.

- `npm run build` exited 0 and produced `dist/index.html`, `app.js`, `service-worker.js`, `manifest.webmanifest`, `icon.svg`, two local React vendor files and `release-hashes.json`.
- The browser-observed release contained three scripts and one image, all at the application origin. No remote stylesheet, font, script, image or other resource was observed.
- The production catalog passed `DATA-RULESET-01` with zero errors: 167 components and 314 presets.
- Nine catalog tests passed: one production acceptance test and one rejecting fixture for each of the eight rules.
- Both 390 × 844 and 1440 × 900 viewport procedures rendered the interactive dashboard. The browser captured zero error-level console entries.
- Two clean checkouts of the same controlled temporary commit produced identical seven-file release hash manifests.

`FND-001` through `FND-006` are `Pass`. CP1A's requirement set is closed.
