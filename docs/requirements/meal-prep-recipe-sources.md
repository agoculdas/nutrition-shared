# Meal-prep recipe content and source record

**Recorded:** 2026-09-05  
**Content file:** `meal-prep-recipes.js`  
**Qualification status:** All six entries are provisional candidates. No physical preparation check has occurred, so none is represented as a qualified recipe.

## Authorship and rights

The ingredient combinations, wording, equipment lists and instructions were written originally for this project. They were not copied or adapted from a third-party recipe. No external recipe photographs or other media are included. Government food-safety facts are paraphrased and linked below. This records provenance; it is not a legal opinion.

## Nutrition method and limitations

Every edible ingredient, including oil, sauce, wraps and yogurt, has a macro row. Each `macros` object is the estimated total for that ingredient's quantity in the base batch. The runtime may sum rows for a batch and divide by actual output yield.

The corrected recipes start with purchasable raw/dry ingredients or explicitly packaged foods. Rice, pasta and lentils are dry weights; chicken and vegetables are raw edible weights; canned pulses are drained and rinsed weights. Instructions cook those same inputs. `componentId` remains the application's exclusion/filter mapping; the recipe row's own state, macro total and source control nutrition when a component catalog entry uses a different cooked basis.

USDA FoodData Central Foundation or SR Legacy records supply the generic commodity values. The public search, API and downloadable datasets were reviewed on 2026-09-05. FDC identifiers are retained where the current Foundation search returned them. Values without a current Foundation match use the named SR Legacy description rather than an invented identifier.

Direct item pages reviewed for the indexed records: [raw boneless skinless chicken breast, FDC 2646170](https://fdc.nal.usda.gov/food-details/2646170/nutrients), [canned drained black beans, FDC 2644285](https://fdc.nal.usda.gov/food-details/2644285/nutrients), [canned drained chickpeas, FDC 2644288](https://fdc.nal.usda.gov/food-details/2644288/nutrients), [raw brown rice, FDC 2512380](https://fdc.nal.usda.gov/food-details/2512380/nutrients), [raw onion, FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients), [raw red bell pepper, FDC 2258590](https://fdc.nal.usda.gov/food-details/2258590/nutrients), and [raw white mushrooms, FDC 169251](https://fdc.nal.usda.gov/food-details/169251/nutrients). The API response was also inspected for each selected Foundation ID. The records confirmed the food description and the listed protein, carbohydrate and fat basis; energy was normalized to kcal where the API returned kJ as the first energy field. Fibre entries explicitly described as “representative generic” remain estimates and are not presented as measured values from that Foundation record.

| Basis used | Reference basis per 100 g unless stated | Recipe calculation |
|---|---|---|
| Chicken breast, boneless, skinless, raw — FDC 2646170 | 120 kcal; protein 22.5 g; carbohydrate 0 g; fat 1.93 g | quantity × basis / 100 |
| Black beans, canned, drained and rinsed — FDC 2644285 | 114 kcal; protein 6.91 g; carbohydrate 19.8 g; fat 1.27 g; fibre 6.5 g representative generic | quantity × basis / 100 |
| Chickpeas, canned, drained and rinsed — FDC 2644288 | 138 kcal; protein 7.02 g; carbohydrate 20.3 g; fat 3.1 g; fibre 6.3 g representative generic | quantity × basis / 100 |
| Long-grain white rice, dry — USDA SR Legacy | 365 kcal; protein 7.1 g; carbohydrate 80 g; fat 0.66 g; fibre 1.3 g | dry quantity × basis / 100 |
| Long-grain brown rice, raw — FDC 2512380 | 367 kcal; protein 7.25 g; carbohydrate 76.7 g; fat 3.31 g; fibre 3.02 g | dry quantity × basis / 100 |
| Onion, raw — FDC 170000 | 40 kcal; protein 1.1 g; carbohydrate 9.34 g; fat 0.1 g; fibre 1.7 g | raw quantity × basis / 100 |
| Red bell pepper, raw — FDC 2258590 | 31 kcal; protein 0.896 g; carbohydrate 6.65 g; fat 0.126 g; fibre 1.16 g | raw quantity × basis / 100 |
| White mushrooms, raw — FDC 169251 | 22 kcal; protein 3.09 g; carbohydrate 3.26 g; fat 0.34 g; fibre 1 g | raw quantity × basis / 100 |
| Broccoli, raw — USDA generic | 34 kcal; protein 2.82 g; carbohydrate 6.64 g; fat 0.37 g; fibre 2.6 g | raw quantity × basis / 100 |
| Sweet potato, raw — USDA SR Legacy | 86 kcal; protein 1.57 g; carbohydrate 20.1 g; fat 0.05 g; fibre 3 g | raw quantity × basis / 100 |
| Brown lentils, dry — USDA Foundation generic | 352 kcal; protein 24.6 g; carbohydrate 63.4 g; fat 1.06 g; fibre 10.7 g | dry quantity × basis / 100 |
| Enriched durum-wheat pasta, dry — USDA SR Legacy | 371 kcal; protein 13 g; carbohydrate 74.7 g; fat 1.5 g; fibre 3.2 g | dry quantity × basis / 100 |
| Olive oil — USDA SR Legacy | 119 kcal and 13.5 g fat per tablespoon | tablespoons × basis |

The previous inherited onion figure was rejected: it encoded 40 kcal for a 50 g default quantity, double USDA's 40 kcal per 100 g basis. Recipe rows now calculate directly from the cited basis rather than copying that component value.

Brand-dependent tortillas, salsa, sauces, paneer, coconut milk and yogurt can vary materially. Users should treat all nutrition as an estimate. Before release qualification, a reviewer should select representative products, retain labels or FoodData Central identifiers, reconcile each row, and version any changes.

## Food-safety evidence

Sources were opened and reviewed on 2026-09-05:

- [USDA FSIS: Leftovers and Food Safety](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety): refrigerate perishable leftovers within two hours (one hour above 90°F/32°C); divide large quantities into shallow containers; hot food may go directly into the refrigerator; refrigerate leftovers for 3–4 days or freeze for 3–4 months; safe thawing methods include refrigerator, cold water and microwave; reheat leftovers to 165°F/74°C. This is the primary common guidance used in every record.
- [FoodSafety.gov: Cold Food Storage Chart](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts): refrigerator at 40°F/4°C or below and freezer at 0°F/−18°C or below; soups and stews list 3–4 refrigerated days and 2–3 frozen months; cooked meat/poultry leftovers list 3–4 refrigerated days and 2–6 frozen months. Freezer periods on the chart are quality guidance because continuously frozen foods remain safe indefinitely.
- [FoodSafety.gov: Safe Minimum Internal Temperature Chart](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures): leftovers and poultry are listed at 165°F/74°C. Chicken instructions and all reheating text use that measurable endpoint.
- [USDA FoodData Central](https://fdc.nal.usda.gov/): authoritative nutrient-data service used for the generic nutrient bases above. Its API guide documents direct item retrieval by FDC ID, and its site states that the data are public domain under CC0.

The recipes use the same conservative common-leftover rule because each is a cooked mixed dish. The curry uses the chart's shorter 2–3 month soup/stew freezer quality window. Burrito and tray-bake freezer wording is recipe-specific packaging/quality advice combined with USDA's general storage limits; it is not a claim that physical freeze/thaw quality has been tested.

## Preparation checks still required

Each candidate needs a real preparation check that records product choices, starting and finished weights where useful, number and size of portions, actual active/total time, cooling and container observations, refrigerated and frozen reheating results, and any instruction revisions. Burritos must confirm their reduced filling quantity and wrapping; bowls and pot/tray dishes must confirm practical equal division. Packaged tortillas, salsa, paneer, teriyaki glaze, marinara, coconut milk, canned tomatoes and yogurt remain representative estimates until the purchased labels are recorded. Until those checks are accepted, the six-recipe qualification gate remains open.
