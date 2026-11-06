(function () {
  'use strict';

  const accessed = '2026-09-05';
  const safetySource = {
    id: 'usda-leftovers',
    title: 'Leftovers and Food Safety',
    publisher: 'USDA Food Safety and Inspection Service',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
    accessed
  };
  const coldStorageSource = {
    id: 'foodsafety-cold-storage',
    title: 'Cold Food Storage Chart',
    publisher: 'FoodSafety.gov',
    url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
    accessed
  };
  const temperatureSource = {
    id: 'foodsafety-temperatures',
    title: 'Safe Minimum Internal Temperature Chart',
    publisher: 'FoodSafety.gov',
    url: 'https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures',
    accessed
  };
  const nutritionSource = {
    id: 'existing-component-catalog',
    title: 'Nutrition Sol existing component catalog',
    publisher: 'Nutrition Sol',
    url: null,
    accessed,
    verification: 'inherited-unverified',
    note: 'Values are reused only where the component state and unit basis match. The existing catalog does not provide row-level source identifiers, so these estimates are not externally verified by this annex.'
  };
  const foodDataCentral = {
    id: 'usda-fdc',
    title: 'FoodData Central',
    publisher: 'USDA Agricultural Research Service',
    url: 'https://fdc.nal.usda.gov/',
    accessed,
    verification: 'source-indexed-estimate',
    note: 'Ingredient rows identify the USDA description and FDC identifier or SR search basis reviewed. Recipe totals remain estimates rather than qualified laboratory values.'
  };

  const packagedEstimate = {
    id: 'representative-package-estimate',
    title: 'Representative packaged-food nutrition estimate',
    publisher: 'Nutrition Sol',
    url: 'https://fdc.nal.usda.gov/food-search/',
    accessed,
    verification: 'provisional-representative',
    note: 'Used for products whose composition varies by brand. Replace with the purchased product label during the preparation check.'
  };

  const m = (calories, protein, carbs, fat, fibre) => ({ calories, protein, carbs, fat, fibre });
  const ingredient = (id, componentId, label, amount, unit, state, macros, extra) => ({
    id, componentId, label, name: label, amount, unit, state, macros,
    sourceRef: 'usda-fdc',
    ...extra
  });
  const storage = (freezer) => ({
    brief: 'Cool promptly, refrigerate for 3–4 days, or freeze portions needed later.',
    caution: 'Coverage is a quantity estimate, not a storage-life promise. Refrigerate or freeze within 2 hours (1 hour above 32°C/90°F).',
    cooling: 'Divide into meal-size portions in shallow containers and refrigerate or freeze promptly; hot food may go directly into the refrigerator.',
    refrigerator: 'Keep at 4°C/40°F or below and use within 3–4 days.', refrigeratorDays: 4,
    freezer: freezer || 'Freeze airtight at −18°C/0°F or below. The cited 3–4 month general-leftover period is a quality guideline; safety is maintained while continuously frozen.',
    thawing: 'Thaw in the refrigerator, in cold water in leak-proof packaging, or in the microwave. Food thawed by cold water or microwave should be reheated before refreezing.',
    reheating: 'Reheat leftovers throughout to 74°C/165°F, measured with a food thermometer. Cover and rotate or stir microwave-heated food for even heating.',
    sourceRefs: ['usda-leftovers', 'foodsafety-cold-storage', 'foodsafety-temperatures'],
    sourceUrl: safetySource.url,
    sourceTitle: safetySource.title,
    accessed
  });
  const provisional = {
    status: 'provisional',
    preparationCheck: {
      status: 'pending',
      note: 'Candidate recipe only. No physical preparation check has recorded actual yield, portioning, texture after storage, or instruction changes.'
    },
    nutritionStatus: 'estimated-from-sourced-generic-and-representative-values',
    nutritionNote: 'Ingredient macros are totals for the listed base-batch quantities. USDA generic rows are source-indexed; packaged-product rows remain representative estimates pending selection of products in the preparation check.'
  };
  const sources = [nutritionSource, foodDataCentral, packagedEstimate, safetySource, coldStorageSource, temperatureSource];

  window.NutritionMealPrepRecipes = [
    {
      ...provisional, id: 'chicken-bean-burritos', version: 1, name: 'Chicken and bean burritos',
      diet: ['non-vegetarian'], vegetarian: false, tags: ['lunch', 'mexican-inspired', 'freezer-friendly'],
      baseYield: 12, minimumYield: 2,
      output: { label: 'burrito', singular: 'burrito', plural: 'burritos', ingredientId: 'tortillas', servingIncrement: 1, defaultUnitsPerMeal: 2 },
      estimatedMinutes: { prep: 25, cook: 25, total: 50, status: 'estimated' },
      equipment: ['large frying pan', 'rice pan', 'mixing spoon', 'enough foil or freezer-safe wrap for the selected batch'],
      ingredients: [
        ingredient('tortillas', 'flour-tortilla', 'Medium flour tortillas', 12, 'pc', 'packaged, about 40 g each', m(1440,36,240,36,12), { countable: true, yieldDefining: true, essential: true, sourceRef:'representative-package-estimate' }),
        ingredient('chicken', 'chicken-breast', 'Boneless skinless chicken breast', 480, 'g', 'raw edible weight, diced', m(576,108,0,9.3,0), {sourceDetail:'USDA FDC 2646170; per 100 g: 120 kcal, 22.5 g protein, 0 g carbohydrate, 1.93 g fat'}),
        ingredient('beans', 'black-beans', 'Canned black beans', 360, 'g', 'drained and rinsed weight', m(410,24.9,71.3,4.6,23.4), {sourceDetail:'USDA FDC 2644285; per 100 g: 114 kcal, 6.91 g protein, 19.8 g carbohydrate, 1.27 g fat; fibre 6.5 g representative'}),
        ingredient('rice', 'rice-white', 'Long-grain white rice', 240, 'g', 'dry weight before cooking', m(876,17,192,1.6,3.1), {sourceDetail:'USDA SR Legacy dry long-grain white rice; per 100 g: 365 kcal, 7.1 g protein, 80 g carbohydrate, 0.66 g fat, 1.3 g fibre'}),
        ingredient('pepper', 'bell-pepper', 'Red bell pepper', 180, 'g', 'raw edible weight, diced', m(56,1.6,12,0.2,2.1), {sourceDetail:'USDA FDC 2258590; per 100 g: 31 kcal, 0.90 g protein, 6.65 g carbohydrate, 0.13 g fat, 1.16 g fibre'}),
        ingredient('onion', 'onion', 'Onion', 90, 'g', 'raw edible weight, diced', m(36,1,8.4,0.1,1.5), {sourceDetail:'USDA FDC 170000; per 100 g: 40 kcal, 1.1 g protein, 9.34 g carbohydrate, 0.1 g fat, 1.7 g fibre'}),
        ingredient('salsa', 'salsa', 'Jarred tomato salsa', 180, 'g', 'as sold', m(54,1.8,10.8,0,1.8), {sourceRef:'representative-package-estimate'}),
        ingredient('seasoning', null, 'Ground cumin and smoked paprika', 2, 'tbsp', 'dry spice blend', m(38,2,7,1.8,4), {sourceRef:'representative-package-estimate'}),
        ingredient('oil', 'olive-oil', 'Olive oil', 1, 'tbsp', 'measured before cooking', m(119,0,0,13.5,0), {sourceDetail:'USDA SR Legacy olive oil; one tablespoon'})
      ],
      instructions: ['Cook the dry rice according to its package directions.', 'Cook the diced onion and pepper in the oil until softened. Add the raw diced chicken and seasoning; cook, stirring, until every piece reaches 74°C/165°F.', 'Add the drained beans and salsa; stir until steaming and excess liquid has reduced.', 'Spread out the scaled number of tortillas and divide the cooked rice and filling evenly between them.', 'Fold the sides inward, roll tightly, and leave unwrapped only long enough for steam to subside before following the cooling guidance.', 'Wrap and label each cooled burrito.'],
      portioning: 'Divide the filling across the selected number of tortillas; one tortilla defines one output unit. Actual fill weight awaits a preparation check.',
      storage: storage('Wrap burritos individually and freeze airtight. USDA’s general leftover guidance lists 3–4 months for best quality.'), sources
    },
    {
      ...provisional, id: 'bean-paneer-burritos', version: 1, name: 'Bean and paneer burritos',
      diet: ['vegetarian'], vegetarian: true, tags: ['lunch', 'vegetarian', 'mexican-inspired', 'freezer-friendly'],
      baseYield: 12, minimumYield: 2,
      output: { label: 'burrito', singular: 'burrito', plural: 'burritos', ingredientId: 'tortillas', servingIncrement: 1, defaultUnitsPerMeal: 2 },
      estimatedMinutes: { prep: 25, cook: 25, total: 50, status: 'estimated' }, equipment: ['large frying pan', 'rice pan', 'mixing spoon', 'enough foil or freezer-safe wrap for the selected batch'],
      ingredients: [
        ingredient('tortillas','flour-tortilla','Medium flour tortillas',12,'pc','packaged, about 40 g each',m(1440,36,240,36,12),{countable:true,yieldDefining:true,essential:true,sourceRef:'representative-package-estimate'}),
        ingredient('paneer','paneer','Paneer',360,'g','packaged weight, cubed',m(954,64.8,10.8,72,0),{sourceRef:'representative-package-estimate'}),
        ingredient('beans','black-beans','Canned black beans',360,'g','drained and rinsed weight',m(410,24.9,71.3,4.6,23.4),{sourceDetail:'USDA FDC 2644285; per 100 g basis'}),
        ingredient('rice','rice-white','Long-grain white rice',240,'g','dry weight before cooking',m(876,17,192,1.6,3.1),{sourceDetail:'USDA SR Legacy dry long-grain white rice; per 100 g basis'}),
        ingredient('pepper','bell-pepper','Red bell pepper',180,'g','raw edible weight, diced',m(56,1.6,12,0.2,2.1),{sourceDetail:'USDA FDC 2258590; per 100 g basis'}),
        ingredient('salsa','salsa','Jarred tomato salsa',180,'g','as sold',m(54,1.8,10.8,0,1.8),{sourceRef:'representative-package-estimate'}),
        ingredient('seasoning',null,'Ground cumin and smoked paprika',2,'tbsp','dry spice blend',m(38,2,7,1.8,4),{sourceRef:'representative-package-estimate'}),
        ingredient('oil','olive-oil','Olive oil',1,'tbsp','measured before cooking',m(119,0,0,13.5,0),{sourceDetail:'USDA SR Legacy olive oil; one tablespoon'})
      ],
      instructions: ['Cook the dry rice according to its package directions.', 'Brown the paneer cubes with half the oil and half the seasoning, then set aside.', 'Cook the pepper in the remaining oil and seasoning, then stir in the drained beans and salsa.', 'Fold the paneer into the filling and heat until steaming throughout.', 'Divide the cooked rice and filling evenly between the scaled number of tortillas, fold the sides and roll tightly.', 'Let steam subside briefly, then follow the cooling guidance and wrap each burrito.'],
      portioning: 'Divide the filling across the selected number of tortillas; one tortilla defines one output unit. Actual fill weight awaits a preparation check.', storage: storage(), sources
    },
    {
      ...provisional, id: 'chicken-rice-bowls', version: 1, name: 'Chicken rice bowls',
      diet: ['non-vegetarian'], vegetarian: false, tags: ['lunch', 'high-protein'], baseYield: 6, minimumYield: 1,
      output: { label: 'equal bowl portion', singular: 'bowl portion', plural: 'bowl portions', servingIncrement: 0.5, defaultUnitsPerMeal: 1 },
      estimatedMinutes: { prep: 15, cook: 35, total: 50, status: 'estimated' }, equipment: ['frying pan', 'rice pan', 'enough shallow meal containers for the selected batch'],
      ingredients: [
        ingredient('chicken','chicken-breast','Boneless skinless chicken breast',900,'g','raw edible weight, sliced',m(1080,202.5,0,17.4,0),{sourceDetail:'USDA FDC 2646170; per 100 g basis'}),
        ingredient('rice','brown-rice','Long-grain brown rice',450,'g','dry weight before cooking',m(1652,32.6,345.2,14.9,13.6),{sourceDetail:'USDA FDC 2512380; per 100 g: 367 kcal, 7.25 g protein, 76.7 g carbohydrate, 3.31 g fat, 3.02 g fibre'}),
        ingredient('broccoli','broccoli','Broccoli',300,'g','raw edible weight, florets',m(102,8.5,19.9,1.1,7.8),{sourceDetail:'USDA raw broccoli, per 100 g: 34 kcal, 2.82 g protein, 6.64 g carbohydrate, 0.37 g fat, 2.6 g fibre'}),
        ingredient('pepper','bell-pepper','Red bell pepper',300,'g','raw edible weight, sliced',m(93,2.7,20,0.4,3.5),{sourceDetail:'USDA FDC 2258590; per 100 g basis'}),
        ingredient('oil','olive-oil','Olive oil',2,'tbsp','measured before cooking',m(238,0,0,27,0),{sourceDetail:'USDA SR Legacy olive oil; two tablespoons'}),
        ingredient('glaze','teriyaki-glaze','Teriyaki glaze',6,'tbsp','as sold',m(150,3,36,0,0),{sourceRef:'representative-package-estimate'})
      ],
      instructions: ['Cook the dry rice according to its package directions.', 'Cook the broccoli and pepper in half the oil until tender-crisp.', 'Cook the raw chicken in the remaining oil, then add the glaze and continue until the thickest pieces reach 74°C/165°F.', 'Divide the cooked rice, vegetables and chicken evenly among the selected number of shallow containers.', 'Follow the cooling guidance before sealing.'],
      portioning: 'Divide by weight or sight into the selected number of equal containers; raw ingredient weights do not predict final container weight.', storage: storage(), sources
    },
    {
      ...provisional, id: 'chickpea-vegetable-curry-rice', version: 1, name: 'Chickpea and vegetable curry with rice',
      diet: ['vegan', 'vegetarian'], vegetarian: true, vegan: true, tags: ['dinner', 'vegan', 'indian-inspired'], baseYield: 6, minimumYield: 1,
      output: { label: 'equal curry-and-rice portion', singular: 'portion', plural: 'portions', servingIncrement: 0.5, defaultUnitsPerMeal: 1 },
      estimatedMinutes: { prep: 15, cook: 35, total: 50, status: 'estimated' }, equipment: ['large saucepan', 'rice pan', 'enough shallow meal containers for the selected batch'],
      ingredients: [
        ingredient('chickpeas','chickpeas','Canned chickpeas',900,'g','drained and rinsed weight',m(1242,63.2,182.7,27.9,56.7),{sourceDetail:'USDA FDC 2644288; per 100 g: 138 kcal, 7.02 g protein, 20.3 g carbohydrate, 3.1 g fat; fibre 6.3 g representative'}),
        ingredient('rice','rice-white','Long-grain white rice',450,'g','dry weight before cooking',m(1643,32,360,3,5.9),{sourceDetail:'USDA SR Legacy dry long-grain white rice; per 100 g basis'}),
        ingredient('sweet-potato','sweet-potato','Sweet potato',300,'g','raw edible weight, diced',m(258,4.7,60.3,0.2,9),{sourceDetail:'USDA SR Legacy sweet potato, raw; per 100 g: 86 kcal, 1.57 g protein, 20.1 g carbohydrate, 0.05 g fat, 3 g fibre'}),
        ingredient('pepper','bell-pepper','Red bell pepper',300,'g','raw edible weight, diced',m(93,2.7,20,0.4,3.5),{sourceDetail:'USDA FDC 2258590; per 100 g basis'}),
        ingredient('onion','onion','Onion',200,'g','raw edible weight, diced',m(80,2.2,18.7,0.2,3.4),{sourceDetail:'USDA FDC 170000; per 100 g basis'}),
        ingredient('tomato','tomato','Canned crushed tomatoes',600,'g','as sold',m(192,9.6,43.2,1.8,11.4),{sourceRef:'representative-package-estimate'}),
        ingredient('coconut','coconut-milk','Canned full-fat coconut milk',300,'ml','as sold',m(450,4.5,9,45,0),{sourceRef:'representative-package-estimate'}),
        ingredient('seasoning',null,'Curry powder or garam masala',2,'tbsp','dry spice blend',m(40,2,8,2,4),{sourceRef:'representative-package-estimate'}),
        ingredient('oil','olive-oil','Olive oil',1,'tbsp','measured before cooking',m(119,0,0,13.5,0),{sourceDetail:'USDA SR Legacy olive oil; one tablespoon'})
      ],
      instructions: ['Cook the dry rice according to its package directions.', 'Cook the onion in the oil until softened, add the seasoning, and stir for about 30 seconds. Add the sweet potato, pepper, crushed tomatoes and coconut milk.', 'Simmer until the sweet potato is tender, then stir in the drained chickpeas and heat until steaming throughout.', 'Divide the cooked rice and curry evenly among the selected number of shallow containers.', 'Follow the cooling guidance before sealing.'],
      portioning: 'Divide into the selected number of equal curry-and-rice portions. Actual yield and sauce reduction await a preparation check.', storage: storage('Freeze curry-and-rice portions airtight. USDA lists soups/stews at 2–3 months and general leftovers at 3–4 months for best quality; use the shorter 2–3 month quality window for this curry.'), sources
    },
    {
      ...provisional, id: 'lentil-bolognese-pasta', version: 1, name: 'Lentil bolognese pasta portions',
      diet: ['vegan', 'vegetarian'], vegetarian: true, vegan: true, tags: ['dinner', 'vegan', 'pasta'], baseYield: 6, minimumYield: 1,
      output: { label: 'equal pasta portion', singular: 'portion', plural: 'portions', servingIncrement: 0.5, defaultUnitsPerMeal: 1 },
      estimatedMinutes: { prep: 15, cook: 40, total: 55, status: 'estimated' }, equipment: ['large saucepan', 'pasta pot', 'enough shallow meal containers for the selected batch'],
      ingredients: [
        ingredient('pasta','regular-pasta','Dry durum-wheat pasta',600,'g','dry weight before cooking',m(2226,78,448.2,9,19.2),{sourceDetail:'USDA SR Legacy dry enriched pasta; per 100 g: 371 kcal, 13 g protein, 74.7 g carbohydrate, 1.5 g fat, 3.2 g fibre'}),
        ingredient('lentils','lentils-cooked','Dry brown lentils',360,'g','dry weight before cooking',m(1267,88.8,228.3,3.8,38.4),{sourceDetail:'USDA Foundation lentils, dry; representative per 100 g: 352 kcal, 24.6 g protein, 63.4 g carbohydrate, 1.06 g fat, 10.7 g fibre'}),
        ingredient('marinara','marinara-sauce','Jarred marinara sauce',900,'ml','as sold',m(495,13.5,63,27,9),{sourceRef:'representative-package-estimate'}),
        ingredient('onion','onion','Onion',200,'g','raw edible weight, diced',m(80,2.2,18.7,0.2,3.4),{sourceDetail:'USDA FDC 170000; per 100 g basis'}),
        ingredient('mushrooms','mushrooms','White mushrooms',300,'g','raw edible weight, sliced',m(66,9.3,9.8,1,3),{sourceDetail:'USDA FDC 169251; per 100 g: 22 kcal, 3.09 g protein, 3.26 g carbohydrate, 0.34 g fat, 1 g fibre'}),
        ingredient('seasoning',null,'Dried Italian herb blend',2,'tbsp','dry herb blend',m(10,0.5,2,0.3,1.3),{sourceRef:'representative-package-estimate'}),
        ingredient('oil','olive-oil','Olive oil',1,'tbsp','measured before cooking',m(119,0,0,13.5,0),{sourceDetail:'USDA SR Legacy olive oil; one tablespoon'})
      ],
      instructions: ['Simmer the dry lentils in water according to their package directions until tender, then drain.', 'Boil the dry pasta until just tender and drain.', 'Cook the onion in the oil until softened, then add the raw mushrooms and herb blend and cook until their released moisture reduces.', 'Add the cooked lentils and marinara; simmer until the sauce is steaming and slightly thickened.', 'Combine with the pasta and divide evenly among the selected number of shallow containers.', 'Follow the cooling guidance before sealing.'],
      portioning: 'Divide the finished pasta and sauce into the selected number of equal portions. Dry pasta and lentil weights are explicit because cooked weights vary.', storage: storage(), sources
    },
    {
      ...provisional, id: 'paneer-vegetable-traybake', version: 1, name: 'Paneer and vegetable tray-bake portions',
      diet: ['vegetarian'], vegetarian: true, tags: ['dinner', 'vegetarian', 'tray-bake'], baseYield: 6, minimumYield: 1,
      output: { label: 'equal tray-bake portion', singular: 'portion', plural: 'portions', servingIncrement: 0.5, defaultUnitsPerMeal: 1 },
      estimatedMinutes: { prep: 20, cook: 40, total: 60, status: 'estimated' }, equipment: ['one or more rimmed baking trays large enough for a single layer', 'mixing bowl', 'enough shallow meal containers for the selected batch'],
      ingredients: [
        ingredient('paneer','paneer','Paneer',720,'g','packaged weight, cubed',m(1908,129.6,21.6,144,0),{sourceRef:'representative-package-estimate'}),
        ingredient('potato','sweet-potato','Sweet potato',900,'g','raw edible weight, diced',m(774,14.1,180.9,0.5,27),{sourceDetail:'USDA SR Legacy sweet potato, raw; per 100 g basis'}),
        ingredient('broccoli','broccoli','Broccoli',450,'g','raw edible weight, florets',m(153,12.7,29.9,1.7,11.7),{sourceDetail:'USDA raw broccoli; per 100 g basis'}),
        ingredient('pepper','bell-pepper','Red bell pepper',450,'g','raw edible weight, chopped',m(140,4,29.9,0.6,5.2),{sourceDetail:'USDA FDC 2258590; per 100 g basis'}),
        ingredient('oil','olive-oil','Olive oil',3,'tbsp','measured before cooking',m(357,0,0,40.5,0),{sourceDetail:'USDA SR Legacy olive oil; three tablespoons'}),
        ingredient('seasoning',null,'Garam masala',2,'tbsp','dry spice blend',m(40,2,8,2,4),{sourceRef:'representative-package-estimate'}),
        ingredient('yogurt','greek-yogurt','Plain Greek yogurt',300,'g','packaged; pack separately',m(195,30,12,6,0),{sourceRef:'representative-package-estimate'})
      ],
      instructions: ['Heat the oven to 220°C/425°F.', 'Toss the sweet potato and vegetables with two-thirds of the oil and half the seasoning and spread in a single layer.', 'Roast until nearly tender, then add the paneer tossed with the remaining oil and seasoning.', 'Roast until the paneer edges colour and all ingredients are hot.', 'Divide into the selected number of shallow containers; portion the yogurt separately and keep chilled.', 'Follow the cooling guidance before sealing the hot components.'],
      portioning: 'Divide the roasted mixture into the selected number of equal portions and divide the chilled yogurt equally among them. Actual moisture loss awaits a preparation check.', storage: storage('Freeze the roasted mixture airtight; freeze yogurt separately only if its texture change is acceptable. USDA’s general leftover guidance lists 3–4 months for best quality.'), sources
    }
  ];
})();
