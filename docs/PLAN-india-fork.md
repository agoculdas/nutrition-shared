# Plan — India Edition fork

A fork of the nutrition tracker tuned for the affluent urban Indian market (metros: Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Pune). English-language UI stays. The pitch that's already landing — *"this actually helps me hit my calorie goal"* — is the same; the fork changes **what food the app knows and surfaces**, **how portions are described**, and adds the missing **first-run onboarding** so word-of-mouth arrivals understand the app without a human explaining it.

---

## 1. Who this is for, concretely

- English-speaking, smartphone-first, gym/fitness-aware. Protein deficiency is a mainstream conversation in this demographic; the app's protein-anchor model is a natural fit — lead with it.
- Meals are often **cooked by someone else** (household cook) or **ordered in** (Swiggy/Zomato). Users don't weigh food; they know *"2 rotis, 1 katori dal, some sabzi."* Portion language must be household measures, not grams.
- High vegetarian / egg-only share, and the veg–non-veg distinction is culturally load-bearing (green/brown dot convention). The app must respect it as a first-class filter, not a tag.
- Diet is naturally carb-forward and protein-light — exactly the population where the anchor/balanced/filler tiering (`categoryFromPp`, index.html:2771) is most useful. Don't soften it; explain it (onboarding step 4).
- They also eat a lot of non-Indian food — pan-Asian, Italian, Japanese, continental café food. This is **not** an "Indian food only" fork; it's an "Indian food first" fork.

## 2. Fork mechanics — one codebase, thin edition layer

A hard fork of a 317 KB single file will rot in weeks. Instead:

1. **Extract an `EDITION` config block** near the top of the script (beside `DEFAULT_TARGETS`, index.html:2085). Everything market-specific reads from it:
   - `DEFAULT_TARGETS` values
   - `CUISINES` array order + labels (index.html:2457)
   - suggestion-engine weights (see §5)
   - onboarding copy/steps
   - app name / manifest values / accent defaults
2. **Extra presets and components are additive, not forked.** New Indian components/presets go into the shared `BUILDER_COMPONENTS` / `PRESET_DEFS` in the base repo — they improve the base app too. The edition only controls *ordering and surfacing*.
3. **Ship the fork as a separate repo** (e.g. `nutrition-india`) so it gets its own name, icon, manifest, and GitHub Pages URL — word-of-mouth needs a clean shareable link. The repo is a copy of `index.html` where the one-line edition selector differs (`const EDITION = EDITIONS.india`), plus its own `manifest.webmanifest` and icon. Syncing = copy the file, keep the selector line. A 5-line sync script makes this mechanical.
4. **Namespace storage per edition** — change `NS` (index.html:2730) to `'in.'` in the fork so it never collides with the base app on a shared `*.github.io` origin (same trick already used vs. the personal app).

## 3. Content: what surfaces

### 3.1 Cuisine folders (edition-controlled `CUISINES`)

Replace the single `indian` bucket (34 presets today) with Indian sub-folders, then the international ones this audience actually eats:

| Folder | Examples |
|---|---|
| North Indian | dal makhani, chole, rajma, paneer dishes, roti/paratha meals, tandoori |
| South Indian | idli/dosa/uttapam, sambar, curd rice, appam-stew, Chettinad |
| Home / Ghar ka khana | dal–sabzi–roti–rice thali combos, khichdi, curd, poha, upma |
| Indo-Chinese | chilli paneer/chicken, fried rice, hakka noodles, manchurian |
| Street & snacks | chaat, vada pav, samosa, pakora, frankie — honest calorie numbers here build trust |
| Continental / Café | the existing american + mediterranean sets, salads, sandwiches, pastas |
| Pan-Asian | existing east-asian + japanese + SE-asian + korean sets |
| Generic / Staples | existing generic protein staples |

Existing non-Indian presets are re-bucketed by mapping their current `cuisine` key → edition folder; no preset data changes needed for that.

### 3.2 New components (target: ~40 additions)

Already present: `paneer`, `toor-dal`, `chickpeas`, `rajma`, `roti`, `hp-roti`, `naan`, `ghee`, `tadka`, `salt-lassi`, plus dish composites behind masala dosa / idli / biryani presets. Gaps to fill:

- **Breakfast bases:** poha, upma, paratha (plain/aloo/paneer), besan chilla, moong chilla, sprouts, dalia, dosa/idli as scalable components (not just presets).
- **Dairy:** dahi/curd (full-fat — different from Greek yogurt), buttermilk/chaas, milk variants (A2/full/toned — toned milk is the urban default), paneer bhurji base.
- **Dals & sabzis as components:** dal tadka, dal makhani, palak, bhindi, aloo, gobi, mixed sabzi (dry vs. gravy variants — gravy carries the ghee/oil).
- **Breads & rice:** paratha, bhatura, jeera rice, brown rice, millets (ragi/jowar/bajra roti — status foods in this demographic).
- **Snack/treat composites:** samosa, chai (with sugar/without), biscuit, Indian sweets (gulab jamun, barfi, kaju katli) — sweets are where silent calories live; being able to log them honestly in one tap matters.
- **Restaurant/delivery composites** (`dish` group): butter chicken, dal makhani (restaurant-style — 2× the ghee of home), biryani by type, kebab platters, pizza slice, burger. Sub-label them "restaurant portion" — home vs. restaurant is the single biggest macro swing in this market.
- Macros from **IFCT 2017** (Indian Food Composition Tables) where available, USDA fallback — same verification discipline as the existing audit-flag workflow.

### 3.3 Household units

The `unitFactor` mechanism (index.html:2472) already does the work. Add:

- `katori` (standard ~150 ml bowl) for dals, sabzis, curd, rice — this is the unit people think in
- `pc` for roti/idli/dosa/paratha (mostly present)
- `tsp`/`tbsp` for ghee/oil
- `cup` for chai/coffee, `glass` for lassi/chaas (exists)

Preset `sub` text should speak this language: "2 roti + 1 katori dal", never "180 g".

### 3.4 Veg / non-veg as first-class

- Add `diet: 'veg' | 'egg' | 'nonveg'` to components; derive it per preset from `_builder` (same derivation pattern as `cat`).
- Show the conventional green/brown dot on preset cards — tiny, instantly understood, zero clutter.
- Global preference set at onboarding (Veg / Veg + egg / Everything), stored like `excludes:v1`, applied as a pool filter in `drawSuggestions` (index.html:2834). The existing per-component exclude system stays for individual dislikes.

## 4. Defaults & targets (edition config)

- `protein: 100` (still ambitious for this population; onboarding personalizes it — see §6), `caloriesTarget: 2000`, `caloriesFloor: 1500` kept.
- `dayPaceFraction` window (index.html:2853): shift to **8:00–22:00** — dinner is late in urban India.
- Fiber floor matters more in a refined-carb diet; keep 25–35 g and let the existing warnings do the nudging.

## 5. Suggestion engine changes

All in `drawSuggestions` / `drawCuisine` (index.html:2834), parameterized by edition:

1. **Cuisine weighting, not just capping.** Today `maxPerCuisine = 2` treats all 10 cuisines equally — in the India edition that starves Indian food to ~2 of 7 slots. Add edition weights, e.g. `{ northIndian: 3, southIndian: 2, home: 3, indoChinese: 1, …}` used as per-folder caps, so a suggestion draw reads like an Indian day with room for the café lunch.
2. **Meal-slot awareness.** Indian meal structure is strongly slotted (breakfast foods are not dinner foods). Use the existing `tags` (`breakfast`/`lunch`/`dinner`/`snack`) + time of day to pre-filter the pool: before 11:00 favor `breakfast`, 16:00–19:00 favor `snack` (chai time), etc. Cheap, high perceived intelligence, and generic enough to backport to the base app.
3. **Tier logic unchanged.** `requiredTier` is the app's soul and works especially well here — a carb-heavy day drives the tier to `anchor` and the app starts surfacing tandoori/paneer/dal-forward options. That behavior *is* the onboarding story.

## 6. Onboarding — the key feature

Today there is no onboarding at all; the only guidance is the `ArchitectureGuidance` empty-state card (index.html:5357). Word-of-mouth users land cold. Spec:

**Mechanics.** Full-screen sheet (reuse the existing sheet/overlay pattern) shown when `storage.get('onboarded:v1')` is empty. Skippable at every step. On finish, write `onboarded:v1` and the choices made. Re-openable forever from Settings → "How this app works" (also new — reuses the same component). Build it edition-agnostic with copy from the edition config, so the base app gets onboarding too.

**Steps (5, one screen each, ~20 s total):**

1. **What this is.** "One goal: hit your calories with enough protein. Log meals in two taps; the app tells you what kind of food fits the rest of your day." One screen, one idea, no feature tour.
2. **Your targets.** Gender + weight (kg) + goal (lose / maintain / gain) → compute `caloriesTarget`, `caloriesFloor`, `protein` (protein ≈ 1.2–1.6 g/kg by goal; simple Mifflin-St Jeor with a fixed moderate activity factor for calories — 3 inputs, not 8). "Use defaults" escape hatch. Writes `targets:v1` via existing `mergeTargets`.
3. **Your diet.** Veg / Veg + egg / Everything (sets the §3.4 filter). One tap.
4. **How to log & how suggestions work.** Show a real preset card annotated: tap = logged; long-press/adjust = tweak quantities in Builder ("2 rotis instead of 3"); the anchor/balanced/filler dots explained in one line each — "green = protein-dense; the app suggests more of these when your remaining budget is protein-poor." This is the step that converts the confused word-of-mouth user.
5. **Keep it on your phone.** Add-to-Home-Screen instructions (iOS Safari share-sheet vs. Android install prompt, detected via UA) + "your data stays on this device" privacy line — which this audience will ask about.

**Acceptance:** a new user who received only the link can, without help: set sensible targets, log "2 roti + dal" in under a minute, and explain what the green dot means.

## 7. Copy & polish

- Naming: distinct name + icon (working options: "Thali", "Dabba", "KhanaLog" — decide before repo creation since it sets the URL).
- Numbers: kcal stays (universally understood in this demographic); `toLocaleString('en-IN')` for grouping.
- Keep the app's current restrained tone; no Hinglish forced in, but food names use the Indian term first ("Dahi (curd)").

## 8. Phasing

| Phase | Scope | Outcome |
|---|---|---|
| **1 — Edition scaffold** | `EDITION` config, `NS` change, cuisine re-bucketing, edition-weighted suggestions | Fork exists, surfaces Indian-first |
| **2 — Content** | ~40 components + ~60 presets (breakfasts, thali combos, Indo-Chinese, street, restaurant-style), katori units, IFCT-checked macros | Food catalog feels native |
| **3 — Onboarding** | 5-step flow, targets calculator, veg/non-veg filter, Settings re-entry | Word-of-mouth users self-serve |
| **4 — Launch** | Repo + Pages deploy, name/icon/manifest, share link test on iOS + Android | Shareable |

Phases 1–3 are each independently verifiable by opening `index.html` in a browser (white screen = syntax error, per HANDOFF.md); macro additions sanity-checked by parsing the arrays in Node, as done previously.

## 9. Risks

- **Divergence rot** — mitigated by the edition layer (§2); revisit if the fork ever needs edition-specific *components*, which is the signal to build a real generation step.
- **Macro credibility** — Indian home cooking varies wildly with oil/ghee. Mitigate with home vs. restaurant variants and honest `sub` labels ("moderate ghee — varies"), which the catalog already does for biryani.
- **CDN dependency** — the fork inherits the unpkg dependency; an Indian-market launch on flaky mobile connections makes the roadmap's vendoring/service-worker item (ROADMAP §1) a near-prerequisite for launch.
