# CP1B verification report

Recorded 2026-07-16 by Codex.

- The release registers a versioned service worker that pre-caches every shell resource and removes prior cache versions at activation.
- The baseline `shared.*` fixture loaded into the built release and displayed the same daily totals and rounding as the baseline application.
- Three backup tests passed: required state-class coverage, canonical byte-identical round trip, and unsupported-version rejection without state mutation.
- The Settings interface exposes `Export backup` and `Import backup`, identifies schema version 1 and describes its state coverage.
- The live public site returned HTTP 200 at close and retained its pre-phase `index.html` SHA-256, `d2c33e01b6c40980c5d13bef322c40717625ffeea314098afe794cdad8fc67a5`.

The final installed-app offline reload was attempted by stopping the local server after a successful online load. The testing browser then blocked navigation to the unavailable local URL under its safety policy before page execution. No workaround was used. `FND-007` remains `Blocked` on verification environment policy; `FND-008` through `FND-012` are `Pass`.

CP1B therefore remains open only on `FND-007` evidence.
