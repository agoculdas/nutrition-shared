# CP3A food-model provenance and assumptions

Accessed and authored: 2026-09-05

## Scope and schema

`food-model-data.js` is a sidecar for the stable-ID catalog in `index.html`. It publishes `NutritionFoodModelData` in the browser with these canonical fields:

- `componentMeta[componentId]`: `dietClass`, `containsOnionGarlic`, `context`, `provenanceRef`, `metadataProvenanceRef`, optional `householdUnits`, and an edition-gated `catalogOverride` containing a qualified name and macro basis.
- `presetContextByName[presetName]`: an explicit context keyed by the preset's stable name.
- `presetQualificationByName[presetName]`: a targeted overlay for ingredients described or conventionally implied by a preset but absent from `_builder`.
- `provenance[reference]`: `source`, `url`, `accessDate`, `portionBasis`, `licenseStatus`, and qualification notes.

The allowed dietary classes are `vegan`, `vegetarian`, `egg`, and `nonveg`. The allowed contexts are `home`, `restaurant`, `delivery`, `packaged`, and `generic`. The sidecar covers all 167 existing component IDs and all 314 existing preset names. It never changes a component ID, preset builder row, or preset default. Qualified names, macros, and conversion replacements are opt-in through the India edition's `qualifiedFoodCatalog` feature; Shared keeps every inherited catalog value.

## Classification basis

Single-ingredient components are classified from the ingredient represented by the catalog label. Dairy components are `vegetarian`; egg and egg-based components are `egg`; meat, poultry and seafood are `nonveg`; remaining plant ingredients are `vegan`. Explicit composite overrides cover dairy sauces, egg sauces, animal dishes, breads with represented dairy, and other cases where a group-level default would be misleading.

Onion and garlic handling fails closed for uncertain prepared food. Every prepared composite dish and uncertain prepared sauce, dressing, kimchi or mixed vegetable dish is marked `containsOnionGarlic: true` unless a qualified recipe or product label establishes its composition. This flag can exclude an item from the **No onion or garlic** preference. A false value only means onion or garlic is not represented in the current generic component definition. It does not claim laboratory or supplier verification and does not establish Jain suitability.

All existing presets receive the explicit context `generic`. More specific `home`, `restaurant`, `delivery`, or `packaged` variants require a documented recipe, menu, or product basis. The protein-bar component is marked `packaged`; other prepared composite components remain `generic` pending qualification.

The qualification overlay does not participate in macro calculation. `containsOnionGarlic: true` is used only where the stable preset name or description explicitly states garlic or onion that `_builder` omits. `containsOnionGarlic: null` records an unresolved marinade, sauce, seasoning, or aromatic paste; consumers must treat null as unknown and fail closed for the **No onion or garlic** preference. False is reserved for a qualified recipe or label establishing absence and is not currently asserted by this overlay. An optional `dietClass` may make builder-derived dietary classification stricter when an omitted ingredient supports it; no such override is asserted without evidence.

## Portion units

The sidecar contains a reviewed, source-backed production fixture so `katori`, `pc`, `tsp`, `tbsp`, `cup`, `glass`, `g`, and `ml` are represented. Each `householdUnits` entry states its base unit, base quantity, basis, and approved provenance reference. `portion-qualification.json` is the independent expected-value record:

- cooked white rice: 158 g per cup from FDC 168935;
- lassi: an application-controlled glass explicitly defined as 250 millilitres;
- egg: one USDA Grade A large whole egg per piece, FDC 748967;
- ghee: 14 g per FDC 2710168 tablespoon divided into three NIST metric-kitchen teaspoons;
- olive oil: tablespoon to millilitres;
- sambar: a controlled 124 g katori and two katori per 248 g cup from FDC 2707430;
- whole milk: millilitres;
- onion: grams.

No universal millilitre-to-gram conversion is used. Qualification corrects the cooked-rice cup from 200 g to 158 g and the sambar cup from 1.5 to two controlled katori only when the qualified India catalog is active; both changes are regression-tested. New component-specific conversions must cite an authoritative food record, package label, or measured recipe basis and must not overwrite an existing valid value silently.

## Provenance and release qualification

The pre-CP3A catalog contained nutrition values and comments without complete row-level provenance. CP3A now provides `food-source-register.json` for all 167 rows. Each released India entry is tied to an exact USDA FoodData Central description and FDC identifier, with a declared gram/portion basis and CC0/public-domain status. The USDA description is recorded as `sourceDescription` in the override and register only; the user-facing component name is always the application catalog label. Overrides never change display names (corrected 2026-09-06 after review found raw USDA descriptions such as branded and restaurant records appearing in the ingredient chips). Curated overrides replace false search matches; transparent substitutions are named where no exact generic/composite food exists. Creatine is handled separately as an explicitly non-food, energy-not-represented entry using an NIH public-domain reference. Strict release validation reported zero unapproved records at the time of writing, satisfying `CNT-008`. **Superseded 2026-09-06:** the macro remediation recorded in `evidence/CP3A/macro-remediation.md` withdrew the USDA claim for 15 components that no record represents in the application's state. Those rows now use the `inherited-catalog-nutrition` record (`licenseStatus: unapproved`), so strict release validation reports 15 `unapproved-provenance` errors and `CNT-008` is open for them. The other 152 rows remain approved, and no household-unit record changed.

Diet class, onion/garlic flags and context labels are original project metadata recorded separately as `authored-food-model-metadata`. Its approved status applies only to that authored metadata, not to inherited nutrition estimates or household conversion values.

The candidate meal-prep recipes in `meal-prep-recipes.js` have their own ingredient sources and preparation states. A raw candidate ingredient whose `componentId` matches an existing cooked catalog component may use the ID only for dietary filtering. It must not borrow that component's cooked macro basis, portion conversion, provenance approval, or preparation state. Recipe macro calculations must continue to use the recipe ingredient record and its cited raw, drained, dry, or cooked basis.

## Qualification boundary

CP3A nutrition and portion qualification is complete. Exact source-food labels are deliberate: they prevent a USDA reference from being presented as an unsupported branded or generic recipe. Context-specific variants should be introduced only when a documented recipe, menu, package label, or measured basis supports the distinction. Conservative onion/garlic exclusions remain metadata safety behavior rather than a laboratory claim.
