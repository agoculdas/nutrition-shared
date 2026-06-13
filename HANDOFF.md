# Handoff — nutrition-shared

## Repo
- **`github.com/agoculdas/nutrition-shared`** (public) — live at **https://agoculdas.github.io/nutrition-shared/**
- Branch `main`. Pushing `main` redeploys the public Pages site — **ask the user before pushing.**
- ⚠️ This is the **shareable clone**. The user's *personal* app is a **separate, untouched repo** (`agoculdas/Nutrition`). Do not touch that one.

## What the app is
A single-file PWA — `index.html` (~190 KB), React + Babel loaded from the unpkg CDN, **no build step** (open the file or serve it; needs internet for the CDN). State lives in `localStorage`, all keys namespaced with a `shared.` prefix (`const NS`) so it never collides with the personal app on the shared `*.github.io` origin.

## Architecture (data layer — DONE)
Meals are **component compositions**:
- `BUILDER_COMPONENTS` — 96 ingredients across 5 groups (`protein/carb/veg/fat/dish`). The `dish` group holds scalable "prepared" composites (sushi, pad thai, falafel, soups…) for foods that don't decompose cleanly. Macros are per `defaultQty`; `unitFactor` converts alternate units to the default.
- `PRESET_DEFS` — the 76 presets, each `{ name, sub, tags, cuisine, _builder: [{ componentId, qty, unit }] }`.
- `resolveComposition(builder)` + `const PRESETS = PRESET_DEFS.map(...)` — macros **and** `cat` are *derived* from `_builder` at load. **Components are the single source of truth**; preset numbers can't drift from their parts.
- `cat` (anchor/balanced/filler) is computed from protein density via `categoryFromPp`; `isStaple` keys off the `staple` tag; `CUISINES` defines the 7 cuisine folders.
- Logged presets carry `_builder`, so the existing meal-row **Rebuild (↻)** button already re-opens them in the Builder.

Compositions were calibrated to the prior curated macros: avg drift ~3% kcal, ~9% protein. New/prepared component macros were web-verified (USDA / standard sources); known-stable staples used reference values.

## Direction — DEFERRED (all frontend)
The data layer is complete; the user explicitly deferred the UI because "show composition without over-cluttering" is the hard part.
1. **Surface each preset's components + sizes on the Preset cards** — the headline ask; must stay uncluttered.
2. **Pre-log "adjust" affordance** — tap a preset → open it pre-filled in the Builder to tweak quantities before logging (keep instant one-tap log as the default). Reuse the existing `editingBuilderMeal` path that `AddSheet`/`BuilderAdd` use for Rebuild.
3. **Merge add-sheet tabs** Preset / Custom / Builder → **Presets | Build**.
4. **Component-based Custom** ("I made this out of X, Y, Z") with a **totals-only fallback** for when only calories are known.

## Conventions / gotchas
- Commit email: **`a.b.goculdas@student.tudelft.nl`** (set per-repo).
- The LF→CRLF git warnings on Windows are benign.
- Verify changes by opening `index.html` in a browser — a white screen means a JS/JSX syntax error. Macro/data changes can be sanity-checked by parsing the arrays in Node.
- Key spots: `PRESET_DEFS`, `BUILDER_COMPONENTS`, `BUILDER_GROUPS`, `resolveComposition`, `categoryFromPp`, `AddSheet`, `QuickAdd`, `BuilderAdd`, `CustomAdd`.

## History
- `Initial commit: shareable nutrition tracker` — genericized food list, neutral targets, medication-agnostic copy, namespaced storage.
- `Expand component catalog for composition-based presets` — +32 components, new `dish` group.
- `Derive preset macros from component compositions` — `PRESET_DEFS` + `resolveComposition`, macros/cat derived.
