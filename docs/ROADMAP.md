# Roadmap — systemic improvement

Where to take the app next, given what it is today and what's working. Ordered by leverage: each theme states the problem, the fix, and why it's sequenced where it is.

## Where the app stands

**Working, keep intact:** the composition data layer (components as single source of truth, derived preset macros), the tiered suggestion engine (`requiredTier` → anchor/balanced/filler mix), two-tap logging with Builder adjust, and the calm single-purpose UI. Feedback confirms the core loop — *helps people hit caloric goals* — is the product. Everything below either protects that loop, reduces friction in it, or closes it.

**Structural facts that shape the roadmap:**
- Single 317 KB `index.html`, React + Babel from unpkg CDN, no build step, no service worker → **the app does not work offline and breaks if unpkg hiccups**, despite being installed "as an app."
- All state in `localStorage` under one origin → one cleared browser cache silently destroys months of history; no way to move devices.
- Hardcoded defaults (140 g protein / 2000 kcal) with manual Settings editing → every new user starts with someone else's targets.
- No onboarding → word-of-mouth growth (the stated opportunity) hands new users a wall of unexplained UI.

## 1. Foundation: don't lose the user's data or trust *(do first)*

Growth multiplies whatever reliability you have. Ship before pushing the share link harder:

1. **Vendor React/ReactDOM/Babel into the repo** (or better: pre-compile the JSX once and drop Babel-standalone entirely — it's ~2 MB of runtime dependency and a slow first paint). Removes the unpkg single point of failure.
2. **Add a service worker** (cache-first for the shell). The manifest already exists; this makes "installed PWA" actually true — opens instantly, works on the metro, no spinner on bad hotel wifi.
3. **Export / import.** One Settings button producing a single JSON file of all `shared.*` keys, and an import that merges by date key. This is the cheapest possible insurance against localStorage loss and doubles as the device-migration story until real sync exists. Trivial to build; disproportionate trust payoff.
4. **Day-key data audit:** history is stored per date key with no index — add a lightweight `days:index` so History/Trends don't have to guess keys, and so export knows what to collect.

## 2. Personalized targets + onboarding *(shared with the India fork)*

The defaults problem and the cold-start problem have one fix. Build the 5-step onboarding specced in `PLAN-india-fork.md` §6 **edition-agnostic in the base app**: what-this-is → compute targets from weight/goal → diet preference → how logging & tiers work → install prompt. Re-openable from Settings. This is the single highest-leverage feature for word-of-mouth conversion in *any* market: the app's tier model is genuinely clever and currently completely unexplained.

## 3. Cut logging friction *(the retention lever)*

Every tracker lives or dies on cost-per-log. Current cost is already low; make it lower in order of effort:

1. **"Usuals" / meal templates.** People eat the same breakfast 5×/week. Let a set of meals be saved as a named template ("weekday breakfast") logged in one tap; auto-detect candidates ("you've logged this trio 4 mornings — save as a usual?"). The `savedMeals` mechanism is 80% of this already.
2. **Copy yesterday / copy meal from History.** One button in the History sheet. Near-zero effort, high daily value.
3. **Smarter recents ranking.** Rank QuickAdd by frequency × recency × time-of-day match instead of insertion order (`RECENT_KEY`, index.html:4137).
4. **Meal-slot aware suggestions** (time-of-day pre-filter on `tags` — specced in the fork plan §5.2, backport here).
5. **Free-text quick log** *(later, needs judgment)*: a text box — "2 eggs and toast" — parsed against `BUILDER_COMPONENTS` by fuzzy match, opening the Builder pre-filled. Pure client-side string matching gets surprisingly far given the catalog is only 167 components; no LLM/backend needed for v1.

## 4. Close the feedback loop: insights *(makes the app feel alive)*

The app currently answers "how am I doing *today*?" — History answers "what happened?" Nothing answers "is this working?":

1. **Weight tracking.** One number, optional, logged from the dashboard. Calorie targets without an outcome measure is an open loop; weight closes it. Also the prerequisite for auto-adjusting targets later ("you're losing faster than 0.5 kg/wk — eat a bit more").
2. **Weekly review card.** Every Monday, one card: days on target, avg protein, best/worst day, one observation ("weekends run ~400 kcal over"). Generated from existing per-day data; no backend.
3. **Trend lines in History:** 7-day rolling kcal & protein over the summary bars already rendered there.
4. **Pattern nudges, sparingly.** The nudge component exists (index.html:3107); add 2–3 weekly-pattern rules max — the app's restraint is a feature, don't turn it into a nag.

## 5. Growth mechanics *(amplify the word-of-mouth that's already happening)*

1. **Editions architecture** (fork plan §2) — India first; the same layer makes any future market or "audience" edition (e.g. vegetarian-first, gym-bulk) a config block, not a fork.
2. **Share a day.** Generate a clean image/card of today's summary (canvas render, Web Share API) — the natural "look what I've been doing" artifact for exactly the conversations that are driving adoption now.
3. **Zero-setup demo state:** the link-recipient's first 10 seconds currently show an empty dashboard. After onboarding, seed nothing — but make the empty state's `ArchitectureGuidance` card tappable (each row opens matching suggestions), turning guidance into the first log.

## 6. Longer-term bets *(only after 1–4; each needs a backend or heavy dependency)*

- **Sync / accounts.** The real fix for data durability and multi-device. Smallest viable version: end-to-end-encrypted blob sync of the exported JSON against any dumb storage endpoint. Decide only when there's evidence of multi-device demand — export/import may carry surprisingly long.
- **Barcode scanning** (OpenFoodFacts) for packaged foods — high value for snacks/supplements, moderate effort, works client-side.

**Non-goal — photo / AI meal detection.** Ruled out deliberately, not parked: it's very expensive to run (per-photo inference costs against a free static app), accuracy on mixed home-cooked dishes is poor, and the composition model already makes honest logging a two-tap operation — there's no friction gap for it to close. Nothing elsewhere on this roadmap should assume an AI/backend inference layer exists.

## 7. Code health *(keep velocity as the file grows)*

- The single-file constraint is a real feature (deploy = push, share = link) — keep it for the shipped artifact, but **introduce a dev-time split + build concat** once the file passes ~400 KB or a second contributor appears. Precompiling JSX (item 1.1) is the natural moment to add this.
- **Data-layer tests in CI:** a Node script that parses `BUILDER_COMPONENTS`/`PRESET_DEFS`, validates every `_builder` reference resolves, unitFactors are sane, and macros are within plausibility bounds (kcal ≈ 4p+4c+9f ± tolerance). The macro-audit workflow that already happened ad hoc becomes a guardrail. Cheap; catches the most likely regression class (data typos) before they reach the public site.
- **A smoke test:** headless-browser load of `index.html`, assert the root renders (catches the white-screen syntax-error failure mode mentioned in HANDOFF.md automatically).

## Suggested sequence

| Order | Item | Why now |
|---|---|---|
| 1 | Foundation: vendor deps, service worker, export/import (§1) | Prerequisite for growth push and India launch |
| 2 | Onboarding + computed targets (§2) | Converts word-of-mouth arrivals; shared with fork |
| 3 | India edition phases 1–4 (fork plan) | The identified market opportunity |
| 4 | Usuals, copy-yesterday, recents ranking (§3.1–3.3) | Retention for the newly grown user base |
| 5 | Weight + weekly review (§4.1–4.2) | Closes the loop, drives long-term retention |
| 6 | Share-a-day (§5.2), data-layer CI (§7) | Amplify + protect |
| 7+ | Sync, barcode (§6) | Evidence-driven, not speculative |
