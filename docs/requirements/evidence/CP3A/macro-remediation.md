# CP3A macro remediation — 2026-09-06

## Why

The CP3A qualification pass mapped all 167 catalog components to USDA FoodData Central
records and wrote `componentMeta[id].catalogOverride.macros` into `food-model-data.js`.
The India edition applies those overrides (`features.qualifiedFoodCatalog`), so they are
the numbers Indian users see for each component's default portion.

A triage comparing every override against the pre-CP3A catalog value flagged 73 of the
167 rows: energy or protein moved by more than 25 %, or the selected record was branded,
a restaurant item, a frozen entree, a school-lunch item, or a different dish. The causes
were (a) the wrong food, (b) the wrong portion basis — a USDA "slice", "piece", "cup" or
"tbsp" gram weight that does not match the application's default portion — or (c) the
wrong state (dry vs cooked, gluten flour vs seitan).

Each of the 73 flagged rows was reviewed against
`docs/requirements/evidence/CP3A/source-candidate-audit.json`, which retains the ranked
candidate list, per-100 g macros and USDA portion table for every component. Every
decision is recorded in `docs/requirements/food-source-policy.json` and re-applied by
`scripts/requalify-from-audit.mjs`, so the outcome is reproducible without the raw USDA
release dumps (which are not kept in the repository).

## Dispositions

| Disposition | Rows | Meaning |
| --- | --- | --- |
| KEEP | 38 | The record and the basis are correct; the delta is the correction, not the error. |
| RESELECT | 12 | A different candidate in the audit is the right generic food. |
| REBASE | 8 | Right food, wrong portion basis for the application's default unit. |
| REVERT | 15 | No USDA record represents this food in this state; the inherited catalog value is restored and the USDA claim is withdrawn. |

Counts are also written to `food-source-register.json` as `remediationCounts`, and every
register row now carries a `remediation` field (`keep` / `rebase` / `reselect` / `revert`).

## Row-by-row decisions

"Catalog baseline" is the pre-CP3A value in `BUILDER_COMPONENTS`; "CP3A override (old)"
is the value this remediation replaced; "Remediated (new)" is what the India edition now
shows. All values are for the component's default portion.

| # | Component id | App label | Default portion | Disposition | Catalog baseline | CP3A override (old) | Remediated (new) | Basis used | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `chicken-mince` | Chicken mince (cooked) | 100 g | KEEP | 110 kcal / 19 p / 4 f / 0 c / 0 fib | 189 kcal / 23.3 p / 10.9 f / 0 c / 0 fib | 189 kcal / 23.3 p / 10.9 f / 0 c / 0 fib | 100 g | Kept: USDA pan-browned ground chicken is the same food in the same cooked state at the app's 100 g basis; the prior 110 kcal understated cooked ground chicken. |
| 2 | `lamb-mince` | Lamb mince (cooked) | 100 g | KEEP | 175 kcal / 18 p / 11 f / 0 c / 0 fib | 192 kcal / 22.6 p / 11.3 f / 0 c / 0 fib | 192 kcal / 22.6 p / 11.3 f / 0 c / 0 fib | 100 g | Kept: USDA imported ground lamb, cooked braised, is the leanest generic cooked ground-lamb record; the broiled ground-lamb alternative (283 kcal/100 g) is further from the label. |
| 3 | `mutton-bone-in` | Mutton (bone-in) | 100 g | KEEP | 200 kcal / 20 p / 13 f / 0 c / 0 fib | 234 kcal / 33.4 p / 11.1 f / 0.1 c / 0 fib | 234 kcal / 33.4 p / 11.1 f / 0.1 c / 0 fib | 100 g | Kept: cooked roasted mutton is the only mutton record in the selected releases. Its 33.4 g protein is a meat-only cooked value and does not represent bone-in purchase weight. |
| 4 | `calamari` | Calamari / squid | 100 g | KEEP | 105 kcal / 18 p / 3 f / 1 c / 0 fib | 155 kcal / 19.4 p / 6.3 f / 3.8 c / 0 fib | 155 kcal / 19.4 p / 6.3 f / 3.8 c / 0 fib | 100 g | Kept: FNDDS cooked calamari is the same food in the same state at the app's 100 g basis. |
| 5 | `chickpeas` | Chickpeas / chole (cooked) | 100 g | KEEP | 120 kcal / 6 p / 2 f / 20 c / 5 fib | 164 kcal / 8.9 p / 2.6 f / 27.4 c / 7.6 fib | 164 kcal / 8.9 p / 2.6 f / 27.4 c / 7.6 fib | 100 g | Kept: boiled mature chickpeas at 164 kcal/100 g is the correct cooked-and-drained value; the prior 120 kcal assumed a wetter preparation. |
| 6 | `rajma` | Rajma / kidney beans (cooked) | 100 g | KEEP | 115 kcal / 6 p / 0.5 f / 20 c / 4 fib | 127 kcal / 8.7 p / 0.5 f / 22.8 c / 6.4 fib | 127 kcal / 8.7 p / 0.5 f / 22.8 c / 6.4 fib | 100 g | Kept: boiled kidney beans without salt is the same food in the same state. |
| 7 | `whey` | Whey protein | 1 scoop | RESELECT | 120 kcal / 25 p / 2 f / 3 c / 0 fib | 150.2 kcal / 26 p / 2 f / 7 c / 0 fib | 105.6 kcal / 23.4 p / 0.5 f / 1.9 c / 0.9 fib | 1 scoop modeled as 30 g; application-controlled scoop convention (the generic USDA record reports only a 32 g cup portion) | Reselected from the branded ABBOTT/EAS powder to the generic USDA "Beverages, Protein powder whey based" record, scaled to the application's 30 g scoop. |
| 8 | `turkey-deli` | Deli turkey | 100 g | KEEP | 105 kcal / 17 p / 2 f / 4 c / 0 fib | 109 kcal / 21.8 p / 0.8 f / 3.5 c / 0.5 fib | 109 kcal / 21.8 p / 0.8 f / 3.5 c / 0.5 fib | 100 g | Kept: prepackaged/deli turkey breast is the same food; the higher protein is the USDA value. |
| 9 | `mozzarella` | Fresh mozzarella | 50 g | RESELECT | 125 kcal / 9 p / 9 f / 1 c / 0 fib | 127 kcal / 12.2 p / 8 f / 1.4 c / 0 fib | 149.5 kcal / 11.1 p / 11.1 f / 1.2 c / 0 fib | 50 g | Reselected from part-skim to whole-milk mozzarella: the app label is fresh mozzarella, and the selected releases carry no high-moisture fresh record. Whole-milk mozzarella is the closest generic on fat and protein. |
| 10 | `hp-flour` | High-protein flour | 100 g | REVERT | 387 kcal / 46 p / 2.3 f / 45.5 c / 9 fib | 370 kcal / 75.2 p / 1.9 f / 13.8 c / 0.6 fib | 387 kcal / 46 p / 2.3 f / 45.5 c / 9 fib | 100 g; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | Vital wheat gluten is a 75 g/100 g protein isolate, not a blended high-protein flour. No high-protein flour record exists in the selected USDA releases. |
| 11 | `roti` | Roti (plain, 6") | 1 pc | RESELECT | 80 kcal / 2.5 p / 0.8 f / 16 c / 1 fib | 202 kcal / 7.6 p / 5.1 f / 31.6 c / 3.3 fib | 80.7 kcal / 2.1 p / 2.5 f / 12.4 c / 2.6 fib | 1 × USDA portion “1 small chappatti or roti (6 in)” (27 g each) | Reselected to the FNDDS generic chapati/roti record, which carries an explicit 6-inch 27 g portion matching the app label. The prior 68 g "piece" was a commercially prepared chapati, roughly two home rotis. |
| 12 | `hp-roti` | High-protein roti (6") | 1 pc | REVERT | 97 kcal / 11.5 p / 0.6 f / 11.4 c / 2.3 fib | 202 kcal / 7.6 p / 5.1 f / 31.6 c / 3.3 fib | 97 kcal / 11.5 p / 0.6 f / 11.4 c / 2.3 fib | 1 pc; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | A high-protein roti is a formulated product; the commercial plain chapati record halves its protein and doubles its energy. |
| 13 | `puri` | Puri | 1 pc | KEEP | 100 kcal / 2 p / 5 f / 12 c / 0.5 fib | 147.2 kcal / 2.5 p / 9 f / 14.1 c / 1.3 fib | 147.2 kcal / 2.5 p / 9 f / 14.1 c / 1.3 fib | 1 × USDA portion “1 puri (approx 4-4/5" dia)” (36 g each) | Kept: the FNDDS puri record carries an explicit 36 g "approx 4-4/5 in dia" puri portion, which is a realistic single fried puri. |
| 14 | `hp-tortilla` | High-protein tortilla | 1 pc | REVERT | 100 kcal / 12 p / 3 f / 10 c / 5 fib | 104 kcal / 2.8 p / 2.3 f / 17.8 c / 1.1 fib | 100 kcal / 12 p / 3 f / 10 c / 5 fib | 1 pc; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | A high-protein tortilla is a formulated product; the plain flour tortilla record reports 2.8 g protein against the label's 12 g. |
| 15 | `flour-tortilla` | Regular flour tortilla | 1 pc | KEEP | 100 kcal / 2 p / 3 f / 16 c / 1 fib | 104 kcal / 2.8 p / 2.3 f / 17.8 c / 1.1 fib | 104 kcal / 2.8 p / 2.3 f / 17.8 c / 1.1 fib | 1 × USDA portion “tortilla, medium (approx 6" dia)” (32 g each) | Kept: the SR Legacy flour tortilla carries an explicit 32 g medium (approx 6 in) portion matching the app's single regular tortilla. |
| 16 | `lentil-pasta` | Lentil pasta (dry) | 100 g | REVERT | 350 kcal / 25 p / 2 f / 50 c / 8 fib | 164 kcal / 8.9 p / 0.2 f / 30.9 c / 2 fib | 350 kcal / 25 p / 2 f / 50 c / 8 fib | 100 g; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | The app component is dry lentil pasta; the selected record was cooked protein-fortified wheat spaghetti, wrong in both ingredient and state. No dry legume pasta record exists in the selected releases. |
| 17 | `mashed-potato` | Mashed potato | 100 g | RESELECT | 85 kcal / 2 p / 2 f / 15 c / 1 fib | 77 kcal / 2.1 p / 1.9 f / 13.2 c / 1 fib | 114 kcal / 2.2 p / 4.1 f / 17.6 c / 1.2 fib | 100 g | Reselected from the school-lunch record to the generic FNDDS "Potato, mashed, NFS". |
| 18 | `banana` | Banana | 1 pc | KEEP | 105 kcal / 1 p / 0 f / 27 c / 3 fib | 105 kcal / 1.3 p / 0.4 f / 26.9 c / 3.1 fib | 105 kcal / 1.3 p / 0.4 f / 26.9 c / 3.1 fib | Policy-defined 118 g basis for 1 pc | Kept: 118 g is the USDA medium-banana edible weight and reproduces the catalog value. |
| 19 | `mango` | Mango | 1 pc | REBASE | 150 kcal / 1 p / 0 f / 35 c / 3 fib | 201.6 kcal / 2.8 p / 1.3 f / 50.4 c / 5.4 fib | 120 kcal / 1.7 p / 0.8 f / 30 c / 3.2 fib | 1 pc modeled as 200 g edible flesh; application-controlled medium-mango convention | Rebased from the 336 g USDA whole-fruit basis, which is a large fruit, to a 200 g medium-mango edible-flesh convention. |
| 20 | `apple` | Apple | 1 pc | KEEP | 95 kcal / 0.5 p / 0 f / 25 c / 4 fib | 94.6 kcal / 0.5 p / 0.3 f / 25.1 c / 4.4 fib | 94.6 kcal / 0.5 p / 0.3 f / 25.1 c / 4.4 fib | Policy-defined 182 g basis for 1 pc | Kept: 182 g is the USDA medium-apple edible weight and reproduces the catalog value. |
| 21 | `teriyaki-glaze` | Teriyaki glaze | 1 tbsp | KEEP | 25 kcal / 0.5 p / 0 f / 6 c / 0 fib | 14.2 kcal / 0.9 p / 0 f / 2.5 c / 0 fib | 14.2 kcal / 0.9 p / 0 f / 2.5 c / 0 fib | 1 × USDA portion “1 tablespoon” (16 g each) | Kept: USDA ready-to-serve teriyaki sauce with its own 16 g tablespoon portion. No thicker teriyaki glaze record exists in the selected releases, so the value is conservative for a sweetened glaze. |
| 22 | `steamed-veg` | Steamed veg | 100 g | RESELECT | 35 kcal / 2.5 p / 0 f / 6 c / 3 fib | 37 kcal / 1.4 p / 0.2 f / 7.3 c / 3.1 fib | 46 kcal / 2.1 p / 0.7 f / 8.8 c / 2.6 fib | 100 g | Reselected to "Classic mixed vegetables, canned, cooked, no added fat": the prior record was an uncooked canned pack, and the cooked no-added-fat record matches the steamed label. |
| 23 | `stir-fry-veg` | Stir fry veg | 100 g | KEEP | 30 kcal / 2 p / 0 f / 5 c / 2 fib | 50 kcal / 2.1 p / 0.3 f / 9.9 c / 2.9 fib | 50 kcal / 2.1 p / 0.3 f / 9.9 c / 2.9 fib | 100 g | Kept: the record is explicitly cooked with no added fat, which matches the app label; the oil-added variant was not selected. |
| 24 | `jackfruit-sabzi` | Jackfruit sabzi | 1 katori | REVERT | 275 kcal / 3 p / 14.5 f / 35 c / 3 fib | 163.8 kcal / 0.6 p / 0.2 f / 42.5 c / 1.6 fib | 275 kcal / 3 p / 14.5 f / 35 c / 3 fib | 1 katori; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | Canned jackfruit in syrup is a sweetened fruit pack, not a cooked spiced sabzi. |
| 25 | `bhaji-mash` | Bhaji mash | 100 g | RESELECT | 60 kcal / 2 p / 0 f / 12 c / 2 fib | 77 kcal / 2.1 p / 1.9 f / 13.2 c / 1 fib | 53 kcal / 1.8 p / 0.2 f / 11.7 c / 2.2 fib | 100 g | Reselected to the FNDDS "Vegetables as ingredient in curry" record. Bhaji mash is a spiced mashed vegetable mixture, not the school-lunch mashed potato previously standardized to. |
| 26 | `side-salad` | Side salad | 100 g | RESELECT | 20 kcal / 1 p / 0 f / 4 c / 1.5 fib | 20 kcal / 1 p / 0.2 f / 4.3 c / 1.6 fib | 24 kcal / 1.1 p / 0.2 f / 4.6 c / 1.5 fib | 100 g | Reselected from the branded McDonald's side salad to the generic FNDDS "Lettuce, salad with assorted vegetables including tomatoes and/or carrots, no dressing". |
| 27 | `onion` | Onion | 50 g | KEEP | 40 kcal / 1 p / 0 f / 10 c / 1 fib | 20 kcal / 0.6 p / 0.1 f / 4.7 c / 0.9 fib | 20 kcal / 0.6 p / 0.1 f / 4.7 c / 0.9 fib | 50 g | Kept: raw onion at 40 kcal/100 g yields 20 kcal for the app's 50 g portion; the prior catalog figure applied a per-100 g number to a 50 g portion. |
| 28 | `gravy-base` | Onion-tomato gravy | 1 katori | KEEP | 30 kcal / 1 p / 0 f / 6 c / 1 fib | 36 kcal / 1.8 p / 0.2 f / 8.4 c / 2.2 fib | 36 kcal / 1.8 p / 0.2 f / 8.4 c / 2.2 fib | 1 katori; application-controlled 124 g unit convention | Standardized to USDA ready-to-serve salsa; the prior generic onion-tomato gravy had no defined recipe. Kept at the 124 g katori convention. |
| 29 | `coconut-milk` | Coconut milk (full fat) | 100 ml | KEEP | 150 kcal / 1.5 p / 15 f / 3 c / 0 fib | 230 kcal / 2.3 p / 23.8 f / 5.5 c / 2.2 fib | 230 kcal / 2.3 p / 23.8 f / 5.5 c / 2.2 fib | 100 ml modeled as 100 g; declared application density convention | Kept: raw coconut milk at 230 kcal/100 g is the full-fat cooking milk the label names; the prior 150 kcal matched a diluted carton beverage. |
| 30 | `guacamole` | Guacamole | 50 g | KEEP | 80 kcal / 1 p / 7 f / 4 c / 2 fib | 77.5 kcal / 1 p / 7.1 f / 4.2 c / 3.3 fib | 77.5 kcal / 1 p / 7.1 f / 4.2 c / 3.3 fib | 50 g | Kept: FNDDS guacamole (NFS) at the app's 50 g portion. |
| 31 | `hummus` | Hummus | 30 g | KEEP | 80 kcal / 3 p / 5 f / 6 c / 1 fib | 72.9 kcal / 2.2 p / 5.1 f / 4.5 c / 1.6 fib | 72.9 kcal / 2.2 p / 5.1 f / 4.5 c / 1.6 fib | 30 g | Kept: FNDDS plain hummus at the app's 30 g portion; the lower protein is the USDA value. |
| 32 | `peanut-butter` | Peanut butter | 1 tbsp | REBASE | 95 kcal / 4 p / 8 f / 3 c / 1 fib | 188.2 kcal / 7 p / 15.8 f / 7.7 c / 1.8 fib | 94.1 kcal / 3.5 p / 7.9 f / 3.9 c / 0.9 fib | 1 tbsp modeled as 16 g; the USDA record's 32 g "tbsp" entry is a 2-tablespoon reference amount | Rebased: one tablespoon of peanut butter is 16 g, so the prior 32 g basis doubled every macro. |
| 33 | `pesto` | Pesto | 1 tbsp | RESELECT | 80 kcal / 1 p / 8 f / 1 c / 0 fib | 74.4 kcal / 1 p / 7.5 f / 0.8 c / 0.2 fib | 92.8 kcal / 1.4 p / 9.5 f / 0.9 c / 0.2 fib | 1 × USDA portion “1 tablespoon” (16 g each) | Reselected from the branded MEZZETTA pesto to the generic FNDDS "Pesto sauce", which also supplies an explicit 16 g tablespoon portion. |
| 34 | `tzatziki` | Tzatziki | 100 g | KEEP | 90 kcal / 3 p / 7 f / 3 c / 0 fib | 91 kcal / 5.2 p / 6 f / 4.1 c / 0.2 fib | 91 kcal / 5.2 p / 6 f / 4.1 c / 0.2 fib | 100 g | Kept: FNDDS tzatziki dip is the same food at the app's 100 g basis; the higher protein is the USDA value. |
| 35 | `salad-dressing` | Creamy dressing | 1 tbsp | REVERT | 75 kcal / 0.5 p / 8 f / 1 c / 0 fib | 24 kcal / 0.2 p / 2.1 f / 1.1 c / 0 fib | 75 kcal / 0.5 p / 8 f / 1 c / 0 fib | 1 tbsp; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | Every creamy dressing candidate in the audit is a reduced-calorie or flavored variant; no regular creamy dressing record is available, and the reduced-calorie record understates energy by two thirds. |
| 36 | `protein-bar` | Protein bar | 1 pc | KEEP | 220 kcal / 20 p / 8 f / 22 c / 3 fib | 218.4 kcal / 16.1 p / 8.1 f / 20.4 c / 3.9 fib | 218.4 kcal / 16.1 p / 8.1 f / 20.4 c / 3.9 fib | 1 × USDA portion “bar” (53 g each) | Kept for want of a generic record: every protein-bar candidate in the audit is a named brand. The macros are retained from the named South Beach bar and must not be read as a generic protein-bar composition. |
| 37 | `protein-pancakes` | Protein pancakes | 3 pc | REVERT | 380 kcal / 30 p / 10 f / 45 c / 3 fib | 309.6 kcal / 4.8 p / 6.6 f / 58 c / 2.2 fib | 380 kcal / 30 p / 10 f / 45 c / 3 fib | 3 pc; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | The only pancake candidates are ordinary or gluten-free pancakes at 4.8 g protein against the label's 30 g. No protein-pancake record exists in the selected releases. |
| 38 | `pad-thai` | Pad thai | 100 g | KEEP | 155 kcal / 8 p / 7 f / 16 c / 1.5 fib | 154 kcal / 8.1 p / 7.5 f / 14.4 c / 1.2 fib | 154 kcal / 8.1 p / 7.5 f / 14.4 c / 1.2 fib | 100 g | Kept: FNDDS Pad Thai (NFS) at the app's 100 g basis. |
| 39 | `sushi-roll` | Sushi (maki) | 8 pc | KEEP | 350 kcal / 14 p / 5.5 f / 60 c / 2 fib | 225.6 kcal / 7 p / 1.6 f / 44.2 c / 2.4 fib | 225.6 kcal / 7 p / 1.6 f / 44.2 c / 2.4 fib | 8 × USDA portion “1 piece” (30 g each) | Kept: 8 × the USDA 30 g maki piece is a realistic roll. The lower total is the USDA composition, not a portion error. |
| 40 | `dumplings` | Dumplings | 6 pc | RESELECT | 300 kcal / 15 p / 12 f / 36 c / 2 fib | 187.5 kcal / 5.2 p / 5.1 f / 30.8 c / 1.1 fib | 169.5 kcal / 10.4 p / 6.9 f / 16.7 c / 1.8 fib | 6 × USDA portion “1 item, any size” (25 g each) | Reselected to "Wonton, dumpling or pot sticker, steamed", which is the filled Asian dumpling the app label names; the prior "Dumpling, no meat" record is a plain boiled flour dumpling. The 25 g item weight is USDA's own. |
| 41 | `miso-soup` | Miso soup | 1 bowl | KEEP | 50 kcal / 3 p / 1.5 f / 6 c / 1 fib | 58.8 kcal / 5.4 p / 2.1 f / 5.6 c / 1.5 fib | 58.8 kcal / 5.4 p / 2.1 f / 5.6 c / 1.5 fib | 1 × USDA portion “Quantity not specified” (245 g each) | Kept at one 245 g USDA cup: miso is served as a small side bowl, so the two-cup main-dish bowl convention used for ramen, pho, lentil and wonton soup does not apply. |
| 42 | `falafel` | Falafel | 1 pc | REBASE | 110 kcal / 4 p / 6 f / 9 c / 2 fib | 56.6 kcal / 2.3 p / 3 f / 5.4 c / 0 fib | 99.9 kcal / 4 p / 5.3 f / 9.5 c / 0 fib | 1 pc modeled as 30 g; application-controlled falafel-ball convention | Rebased: the USDA 17 g "patty (approx 2-1/4 in dia)" is a mini falafel; a standard ball is about 30 g. |
| 43 | `lentil-soup` | Lentil soup | 1 bowl | REBASE | 250 kcal / 14 p / 5 f / 34 c / 8 fib | 153 kcal / 9.7 p / 1.8 f / 26 c / 9.4 fib | 306 kcal / 19.5 p / 3.5 f / 52 c / 18.9 fib | 1 bowl modeled as 2 × USDA portion “1 cup” (255 g each) | Rebased from one cup to a two-cup bowl, matching the app's bowl unit. |
| 44 | `minestrone` | Minestrone | 1 bowl | RESELECT | 220 kcal / 9 p / 6 f / 32 c / 6 fib | 83.6 kcal / 4.3 p / 2.5 f / 11.3 c / 1 fib | 196 kcal / 8.4 p / 2.5 f / 35.8 c / 7.4 fib | 1 bowl modeled as 2 × USDA portion “1 cup” (245 g each) | Reselected from the condensed canned record (which is undiluted) to the FNDDS prepared minestrone, at a two-cup bowl. |
| 45 | `rice-noodles` | Rice noodles (cooked) | 100 g | KEEP | 110 kcal / 1 p / 0 f / 25 c / 1 fib | 108 kcal / 1.8 p / 0.2 f / 24 c / 1 fib | 108 kcal / 1.8 p / 0.2 f / 24 c / 1 fib | 100 g | Kept: cooked rice noodles, same food and state, at the app's 100 g basis. |
| 46 | `kimchi` | Kimchi | 50 g | KEEP | 11 kcal / 0.5 p / 0.2 f / 2 c / 1 fib | 7.5 kcal / 0.6 p / 0.3 f / 1.2 c / 0.8 fib | 7.5 kcal / 0.6 p / 0.3 f / 1.2 c / 0.8 fib | 50 g | Kept: cabbage kimchi at 15 kcal/100 g yields 7.5 kcal for the app's 50 g portion. |
| 47 | `seaweed-salad` | Seaweed salad | 100 g | KEEP | 70 kcal / 1 p / 4 f / 8 c / 1 fib | 63 kcal / 3.4 p / 3.1 f / 7.7 c / 0.7 fib | 63 kcal / 3.4 p / 3.1 f / 7.7 c / 0.7 fib | 100 g | Kept: cooked seaweed with fat added is the closest match to a dressed seaweed salad; the higher protein is the USDA value. |
| 48 | `ramen-bowl` | Ramen (bowl) | 1 bowl | REBASE | 500 kcal / 26 p / 18 f / 60 c / 3 fib | 311.2 kcal / 17.5 p / 11.2 f / 34.3 c / 2.2 fib | 622.3 kcal / 34.9 p / 22.4 f / 68.6 c / 4.4 fib | 1 bowl modeled as 2 × USDA portion “1 cup” (245 g each) | Rebased from one cup to a two-cup bowl; a served ramen bowl is not a single cup. |
| 49 | `pho-bowl` | Pho (bowl) | 1 bowl | REBASE | 350 kcal / 25 p / 5 f / 50 c / 2 fib | 188.7 kcal / 14.2 p / 8.2 f / 13.7 c / 1 fib | 377.3 kcal / 28.5 p / 16.3 f / 27.4 c / 2 fib | 1 bowl modeled as 2 × USDA portion “1 cup” (245 g each) | Rebased from one cup to a two-cup bowl, matching the app's bowl unit. |
| 50 | `spring-rolls` | Fried spring rolls | 2 pc | REBASE | 100 kcal / 2 p / 5 f / 12 c / 1 fib | 291 kcal / 8.1 p / 9.5 f / 43.2 c / 3.3 fib | 128.4 kcal / 3.6 p / 4.2 f / 19.1 c / 1.5 fib | 2 pc modeled as 2 × 30 g; application-controlled fried spring-roll convention | Rebased: the USDA 68 g portion is a full egg roll, not a spring roll. Two 30 g fried spring rolls are the app's item. |
| 51 | `summer-rolls` | Summer rolls (fresh) | 2 pc | KEEP | 115 kcal / 5 p / 1.5 f / 20 c / 1.5 fib | 159 kcal / 8 p / 3.8 f / 24.4 c / 2.7 fib | 159 kcal / 8 p / 3.8 f / 24.4 c / 2.7 fib | 2 × USDA portion “1 roll (4-1/4" x 1-1/2" dia)” (71 g each) | Kept: the USDA 71 g rice-paper roll is a realistic fresh summer roll, so 2 pc = 142 g stands. |
| 52 | `dosa` | Dosa | 1 pc | KEEP | 130 kcal / 3 p / 4 f / 20 c / 1 fib | 168 kcal / 4.6 p / 3.2 f / 29.6 c / 1.4 fib | 168 kcal / 4.6 p / 3.2 f / 29.6 c / 1.4 fib | 1 × USDA portion “Quantity not specified” (80 g each) | Kept: the FNDDS dosa record's 80 g medium portion is a realistic plain dosa. |
| 53 | `idli` | Idli | 2 pc | KEEP | 78 kcal / 3 p / 0.3 f / 16 c / 1 fib | 97.3 kcal / 4.8 p / 0.3 f / 19 c / 4.4 fib | 97.3 kcal / 4.8 p / 0.3 f / 19 c / 4.4 fib | 2 × USDA portion “1 item” (38 g each) | Kept: 2 × the USDA 38 g idli is a realistic pair. |
| 54 | `pork-belly` | Pork belly (cooked) | 100 g | KEEP | 290 kcal / 19 p / 24 f / 0 c / 0 fib | 404 kcal / 26.6 p / 32.2 f / 0 c / 0 fib | 404 kcal / 26.6 p / 32.2 f / 0 c / 0 fib | 100 g | Kept: cooked pork belly is genuinely around 400 kcal/100 g; the prior 290 kcal understated it. |
| 55 | `sausage` | Sausage (link) | 1 pc | RESELECT | 90 kcal / 5 p / 7.5 f / 1 c / 0 fib | 278.2 kcal / 15.5 p / 22.6 f / 2.1 c / 0 fib | 92 kcal / 3.2 p / 8.8 f / 0.1 c / 0 fib | 1 × USDA portion “link” (21 g each) | Reselected to a cooked pork sausage link with an explicit 21 g link portion. The prior record was chorizo at an 80.4 g "medium" reference amount, which is not a breakfast link. |
| 56 | `chorizo` | Chorizo | 50 g | KEEP | 230 kcal / 12 p / 19 f / 1 c / 0 fib | 170.5 kcal / 9.7 p / 14.1 f / 1.3 c / 0 fib | 170.5 kcal / 9.7 p / 14.1 f / 1.3 c / 0 fib | 50 g | Kept: FNDDS chorizo at 341 kcal/100 g is the cooked-sausage generic. The prior 230 kcal per 50 g matched dry-cured Spanish chorizo, which the selected releases do not carry. |
| 57 | `seitan` | Seitan | 100 g | REVERT | 120 kcal / 21 p / 2 f / 4 c / 1 fib | 370 kcal / 75.2 p / 1.9 f / 13.8 c / 0.6 fib | 120 kcal / 21 p / 2 f / 4 c / 1 fib | 100 g; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | Cooked seitan is hydrated gluten; vital wheat gluten is the dry flour and triples the energy per 100 g. |
| 58 | `brown-rice` | Rice (brown, cooked) | 100 g | KEEP | 123 kcal / 2.7 p / 1 f / 26 c / 1.8 fib | 123 kcal / 2.7 p / 1 f / 25.6 c / 1.6 fib | 123 kcal / 2.7 p / 1 f / 25.6 c / 1.6 fib | 100 g | Kept: cooked long-grain brown rice. The "Food Distribution Program" suffix is a USDA sampling label, not a branded product. |
| 59 | `udon` | Udon noodles (cooked) | 100 g | KEEP | 125 kcal / 3 p / 0.4 f / 26 c / 1.5 fib | 131 kcal / 4 p / 0.2 f / 27.5 c / 0 fib | 131 kcal / 4 p / 0.2 f / 27.5 c / 0 fib | 100 g | Kept: the selected USDA releases carry no udon record; cooked Japanese somen is the closest wheat-noodle generic and is declared as such rather than presented as udon. |
| 60 | `sourdough` | Sourdough (slice) | 1 pc | REBASE | 120 kcal / 4 p / 0.6 f / 23 c / 1 fib | 378.1 kcal / 15 p / 3.4 f / 72.1 c / 3.1 fib | 136 kcal / 5.4 p / 1.2 f / 26 c / 1.1 fib | 1 pc modeled as a 50 g slice; application-controlled sourdough-slice convention | Rebased: the USDA 139 g "slice" for french/vienna bread is a loaf section, not a sandwich slice. |
| 61 | `gnocchi` | Gnocchi (cooked) | 100 g | KEEP | 130 kcal / 3 p / 0.5 f / 27 c / 1.5 fib | 124 kcal / 4.4 p / 1 f / 25.1 c / 0 fib | 124 kcal / 4.4 p / 1 f / 25.1 c / 0 fib | 100 g | Standardized to USDA cooked homemade egg-free pasta; no gnocchi record exists in the selected USDA releases. Kept at the app's 100 g basis. |
| 62 | `polenta` | Polenta (cooked) | 100 g | KEEP | 85 kcal / 2 p / 0.5 f / 18 c / 1 fib | 58 kcal / 1.1 p / 0.3 f / 12.5 c / 0.6 fib | 58 kcal / 1.1 p / 0.3 f / 12.5 c / 0.6 fib | 100 g | Kept: cornmeal mush with no added fat is the only cooked-cornmeal porridge in the selected releases. It is a thinner preparation than firm polenta, so 58 kcal/100 g is conservative. |
| 63 | `alfredo-sauce` | Alfredo sauce | 100 ml | KEEP | 195 kcal / 4 p / 18 f / 5 c / 0 fib | 150 kcal / 2.1 p / 15 f / 1.8 c / 0 fib | 150 kcal / 2.1 p / 15 f / 1.8 c / 0 fib | 100 ml modeled as 100 g; declared application density convention | Kept: FNDDS alfredo sauce at the declared 100 ml = 100 g application convention. |
| 64 | `cheese-sauce` | Cheese sauce (queso) | 50 ml | KEEP | 90 kcal / 3 p / 7 f / 3 c / 0 fib | 81.5 kcal / 1.6 p / 6.7 f / 3.9 c / 0.2 fib | 81.5 kcal / 1.6 p / 6.7 f / 3.9 c / 0.2 fib | 50 ml modeled as 50 g; declared application density convention | Kept: FNDDS cheese sauce at the declared 50 ml = 50 g application convention. |
| 65 | `poke-bowl` | Poke bowl | 1 bowl | REVERT | 500 kcal / 30 p / 15 f / 55 c / 4 fib | 428.4 kcal / 19.2 p / 5.3 f / 76.5 c / 2.4 fib | 500 kcal / 30 p / 15 f / 55 c / 4 fib | 1 bowl; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | A frozen chicken rice-bowl entree is a different dish; no poke or raw-fish rice-bowl record exists in the selected releases. |
| 66 | `katsu-curry` | Katsu curry | 1 bowl | REVERT | 700 kcal / 30 p / 25 f / 85 c / 5 fib | 232 kcal / 9.9 p / 8 f / 30.2 c / 2 fib | 700 kcal / 30 p / 25 f / 85 c / 5 fib | 1 bowl; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | Chicken curry with rice omits the breaded fried cutlet that defines katsu curry; no rebase of that record reaches a plausible katsu-curry energy value. |
| 67 | `gyudon` | Gyudon (beef bowl) | 1 bowl | REVERT | 550 kcal / 26 p / 15 f / 72 c / 3 fib | 434.3 kcal / 33.2 p / 25.1 f / 19.4 c / 1.2 fib | 550 kcal / 26 p / 15 f / 72 c / 3 fib | 1 bowl; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | The "Beef and rice with soy-based sauce" record carries only 8 g carbohydrate per 100 g, which cannot represent a rice bowl; its macro shape is wrong regardless of the portion chosen. |
| 68 | `onigiri` | Onigiri (rice ball) | 1 pc | REVERT | 170 kcal / 4 p / 1.5 f / 34 c / 1 fib | 130 kcal / 2.4 p / 0.2 f / 28.7 c / 0 fib | 170 kcal / 4 p / 1.5 f / 34 c / 1 fib | 1 pc; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | Plain cooked short-grain rice omits the filling and nori that define onigiri. |
| 69 | `tonkatsu` | Tonkatsu (pork cutlet) | 100 g | REVERT | 260 kcal / 15 p / 16 f / 15 c / 1 fib | 270 kcal / 8.9 p / 15.7 f / 23.3 c / 1 fib | 260 kcal / 15 p / 16 f / 15 c / 1 fib | 100 g; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | Restaurant sweet-and-sour pork is a different dish with a different batter and sauce; no breaded pork cutlet record exists in the selected releases. |
| 70 | `japchae` | Japchae (glass noodles) | 100 g | REVERT | 150 kcal / 4 p / 5 f / 24 c / 1 fib | 351 kcal / 0.2 p / 0.1 f / 86.1 c / 0.5 fib | 150 kcal / 4 p / 5 f / 24 c / 1 fib | 100 g; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | The selected record is dehydrated cellophane noodles, not the cooked dressed dish; it reports 351 kcal and 0.2 g protein per 100 g. |
| 71 | `tteokbokki` | Tteokbokki (rice cakes) | 100 g | KEEP | 165 kcal / 3 p / 2 f / 34 c / 1 fib | 131 kcal / 4.1 p / 4.1 f / 19.6 c / 0.8 fib | 131 kcal / 4.1 p / 4.1 f / 19.6 c / 0.8 fib | 100 g | Kept: the FNDDS dukboki/tteokbokki record is the dish itself at the app's 100 g basis. |
| 72 | `kimbap` | Kimbap | 8 pc | REVERT | 350 kcal / 10 p / 8 f / 58 c / 3 fib | 163.7 kcal / 3.2 p / 2.6 f / 31 c / 2.5 fib | 350 kcal / 10 p / 8 f / 58 c / 3 fib | 8 pc; Existing macros and default portions are inherited unchanged; row-level upstream sources were not available for qualification. | A vegetable sushi roll at a 22 g piece understates kimbap, which is a larger filled roll; no kimbap record exists in the selected releases. |
| 73 | `wonton-soup` | Wonton soup | 1 bowl | RESELECT | 200 kcal / 12 p / 7 f / 22 c / 2 fib | 71.4 kcal / 4.6 p / 0.6 f / 11.7 c / 0.4 fib | 161.7 kcal / 11.7 p / 6.4 f / 14.5 c / 1.5 fib | 1 bowl modeled as 2 × USDA portion “1 cup” (245 g each) | Reselected to the FNDDS generic wonton soup at a two-cup bowl; the prior record was a single restaurant cup. |

## Conventions introduced by this remediation

- **Bowl.** For main-dish soups and noodle bowls (`lentil-soup`, `minestrone`,
  `ramen-bowl`, `pho-bowl`, `wonton-soup`) the application's `bowl` unit is modelled as
  two of the selected record's own USDA one-cup portions, roughly 490–510 g. `miso-soup`
  is deliberately excluded: miso is served as a single-cup side bowl, and that is stated
  in its `selectionNote`.
- **Piece weights.** Where a USDA portion is a different item from the application's
  (`sourdough` 139 g loaf section, `spring-rolls` 68 g egg roll, `falafel` 17 g mini
  patty, `peanut-butter` 32 g two-tablespoon reference amount), a stated application
  convention replaces it and the reason is recorded in the policy `selectionNote` and in
  the register `portionBasis`.
- **No display-name change.** Overrides carry `sourceDescription` only. The user-facing
  component name always comes from the application catalog, as corrected on 2026-09-06.

## Release status: the "zero unapproved records" claim no longer holds

15 components now point at the provenance record `inherited-catalog-nutrition`, whose
`licenseStatus` is `unapproved`:

`hp-flour`, `hp-roti`, `hp-tortilla`, `lentil-pasta`, `jackfruit-sabzi`,
`salad-dressing`, `protein-pancakes`, `seitan`, `poke-bowl`, `katsu-curry`, `gyudon`,
`onigiri`, `tonkatsu`, `japchae`, `kimbap`.

For each of these the selected USDA record was a different food or a different state,
and the audit contains no acceptable substitute. Restoring the inherited pre-CP3A value
and declaring it unsourced is more honest than shipping a USDA number for a food the
record does not describe.

The consequence is explicit:

- `npm run validate:food-model` (prototype mode) still passes: `valid: true`, with 15
  `unapproved-provenance` **warnings** and `summary.unapproved: 15`.
- `npm run validate:food-model:release` (strict mode) now **fails** with 15
  `unapproved-provenance` **errors** and `valid: false`.

The earlier CP3A statements that "strict release validation passes with 167 qualified
nutrition records and zero unapproved nutrition or unit records"
(`verification-report.md`, `docs/requirements/food-model-provenance.md`,
`final-verification.json`) are therefore superseded as of 2026-09-06 and do not hold
until these 15 rows obtain a qualified source. `CNT-008` returns to open for those rows.
The remaining 152 rows keep approved CC0/public-domain USDA or NIH provenance, and no
household-unit (portion) record changed, so `unapproved-unit-provenance` remains zero.

Closing these 15 rows requires either a USDA release that carries the food (a filled
rice ball, a breaded pork cutlet, hydrated seitan, dry legume pasta, a regular creamy
dressing, formulated high-protein flour/roti/tortilla/pancakes, a poke or gyudon rice
bowl, japchae, kimbap, katsu curry, a cooked jackfruit sabzi) or a qualified recipe
build-up from already-qualified components.

## Reproducing this state

```
node scripts/requalify-from-audit.mjs
```

reads `docs/requirements/food-source-policy.json`,
`docs/requirements/evidence/CP3A/source-candidate-audit.json` and the existing register,
and rewrites `food-model-data.js` and `food-source-register.json`. With an empty policy
delta it is a byte-identical no-op on `food-model-data.js`; that was verified before any
decision in this document was applied.

`scripts/qualify-food-catalog.mjs` (the original generator, which needs the USDA release
dumps) implements the same `revertToCatalog`, `portionBasis` and `remediation` policy
fields, so a full re-run from the dumps produces the same result.
