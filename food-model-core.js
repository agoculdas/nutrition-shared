(function (root, factory) {
  const api = factory(root.NutritionFoodModelData || null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NutritionFoodModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (initialData) {
  'use strict';

  const DIET_CLASSES = Object.freeze(['vegan', 'vegetarian', 'egg', 'nonveg']);
  const CONTEXTS = Object.freeze(['home', 'restaurant', 'delivery', 'packaged', 'generic']);
  const REQUIRED_UNITS = Object.freeze(['katori', 'pc', 'tsp', 'tbsp', 'cup', 'glass', 'g', 'ml']);
  const DIET_RANK = Object.freeze({ vegan: 0, vegetarian: 1, egg: 2, nonveg: 3 });

  function canonicalDietType(value) {
    const key = String(value == null ? 'all' : value).trim().toLowerCase().replace(/[\s-]+/g, '_');
    const aliases = {
      all: 'all', any: 'all', none: 'all',
      vegan: 'vegan',
      vegetarian: 'vegetarian', veg: 'vegetarian',
      vegetarian_eggs: 'vegetarian_eggs', vegetarian_with_eggs: 'vegetarian_eggs',
      ovo_vegetarian: 'vegetarian_eggs', egg: 'vegetarian_eggs',
    };
    return aliases[key] || 'all';
  }

  function normalizePreference(value) {
    if (value && typeof value === 'object') {
      return {
        dietType: canonicalDietType(value.dietType ?? value.diet ?? value.preference),
        noOnionGarlic: Boolean(value.noOnionGarlic ?? value.no_onion_garlic),
      };
    }
    const key = String(value == null ? '' : value).trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (['no-onion-garlic', 'onion-garlic-free'].includes(key)) {
      return { dietType: 'all', noOnionGarlic: true };
    }
    return { dietType: canonicalDietType(value), noOnionGarlic: false };
  }

  function allowedDiet(dietClass, dietType) {
    if (dietType === 'all') return true;
    if (!(dietClass in DIET_RANK)) return null;
    const ceiling = { vegan: 0, vegetarian: 1, vegetarian_eggs: 2 }[dietType];
    return DIET_RANK[dietClass] <= ceiling;
  }

  function compatible(metaOrDiet, preference) {
    const pref = normalizePreference(preference);
    const meta = typeof metaOrDiet === 'string' ? { dietClass: metaOrDiet } : (metaOrDiet || {});
    const dietResult = allowedDiet(meta.dietClass, pref.dietType);
    if (dietResult === false) return false;
    if (pref.noOnionGarlic && meta.containsOnionGarlic === true) return false;
    if ((pref.dietType !== 'all' && dietResult == null)
      || (pref.noOnionGarlic && typeof meta.containsOnionGarlic !== 'boolean')) return null;
    return true;
  }

  function resolveFood(foodOrId, lookup) {
    if (foodOrId && typeof foodOrId === 'object') return foodOrId;
    if (lookup instanceof Map) return lookup.get(foodOrId) || null;
    if (lookup && typeof lookup === 'object') return lookup[foodOrId] || null;
    const meta = (initialData?.componentMeta || initialData?.components || {})[foodOrId];
    return meta ? { id: foodOrId, ...meta } : null;
  }

  function evaluateFood(foodOrId, preference, lookup) {
    const food = resolveFood(foodOrId, lookup);
    const pref = normalizePreference(preference);
    const reasons = [];
    if (!food) return { compatible: null, reasons: ['unknown-food'], unknown: true };
    const dietResult = allowedDiet(food.dietClass, pref.dietType);
    if (pref.dietType !== 'all') {
      if (dietResult === false) reasons.push('diet-class');
      else if (dietResult == null) reasons.push('unknown-diet-class');
    }
    if (pref.noOnionGarlic) {
      if (food.containsOnionGarlic === true) reasons.push('contains-onion-garlic');
      else if (typeof food.containsOnionGarlic !== 'boolean') reasons.push('unknown-onion-garlic');
    }
    const unknown = reasons.some(reason => reason.startsWith('unknown'));
    return { compatible: unknown ? null : reasons.length === 0, reasons, unknown };
  }

  function filterFoods(list, preference, lookup) {
    const pref = normalizePreference(preference);
    if (pref.dietType === 'all' && !pref.noOnionGarlic) return [...(list || [])];
    return (list || []).filter(food => evaluateFood(food, pref, lookup).compatible === true);
  }

  function unitsForFood(foodOrId, lookup) {
    const food = resolveFood(foodOrId, lookup);
    if (!food) return [];
    if (Array.isArray(food.units)) return [...food.units];
    return Object.keys(food.householdUnits || {});
  }

  function dataParts(data) {
    return {
      componentMeta: data?.componentMeta || data?.components || {},
      presetContextByName: data?.presetContextByName || data?.presetContexts || {},
      presetQualificationByName: data?.presetQualificationByName || {},
      provenance: data?.provenance || {},
    };
  }

  function mergeComponent(component, meta, options = {}) {
    if (!meta) return { ...component, metadataUnknown: true };
    const catalogOverride = options.applyCatalogOverrides === true ? (meta.catalogOverride || {}) : {};
    const householdUnits = meta.householdUnits || meta.units || {};
    const addedUnits = Object.keys(householdUnits);
    const units = [...new Set([...(component.units || []), ...addedUnits])];
    const unitFactor = { ...(component.unitFactor || {}) };
    for (const [unit, definition] of Object.entries(householdUnits)) {
      if (options.applyCatalogOverrides === true && typeof definition === 'object'
        && unit === component.defaultUnit && definition?.baseUnit !== component.defaultUnit) {
        const inverseFactor = 1 / Number(definition.baseQty);
        if (Number.isFinite(inverseFactor) && inverseFactor > 0
          && (unitFactor[definition.baseUnit] == null || options.applyCatalogOverrides === true)) {
          unitFactor[definition.baseUnit] = inverseFactor;
        }
        continue;
      }
      const baseUnitFactor = component.unitFactor?.[definition?.baseUnit]
        ?? (definition?.baseUnit === component.defaultUnit ? 1 : NaN);
      const factor = typeof definition === 'number'
        ? definition
        : Number(definition.baseQty) * baseUnitFactor;
      if (Number.isFinite(factor) && factor > 0 && (unitFactor[unit] == null || options.applyCatalogOverrides === true)) unitFactor[unit] = factor;
    }
    return { ...component, ...meta, ...catalogOverride, householdUnits: { ...householdUnits }, units, unitFactor };
  }

  function derivePresetMetadata(preset, componentLookup, data) {
    const rows = preset?._builder;
    if (!Array.isArray(rows) || rows.length === 0) {
      return { dietClass: null, containsOnionGarlic: null, metadataUnknown: true, provenanceRefs: [] };
    }
    let rank = -1;
    let containsOnionGarlic = false;
    let unknown = false;
    const provenanceRefs = new Set();
    for (const row of rows) {
      const component = componentLookup instanceof Map ? componentLookup.get(row.componentId) : componentLookup?.[row.componentId];
      if (!component || !(component.dietClass in DIET_RANK) || typeof component.containsOnionGarlic !== 'boolean') {
        unknown = true;
        continue;
      }
      rank = Math.max(rank, DIET_RANK[component.dietClass]);
      containsOnionGarlic ||= component.containsOnionGarlic;
      if (component.provenanceRef) provenanceRefs.add(component.provenanceRef);
    }
    const contextMap = dataParts(data).presetContextByName;
    const qualification = dataParts(data).presetQualificationByName[preset.name];
    const qualifiedRank = qualification?.dietClass in DIET_RANK ? DIET_RANK[qualification.dietClass] : -1;
    const derivedDietClass = unknown || rank < 0 ? null : DIET_CLASSES[Math.max(rank, qualifiedRank)];
    if (qualification?.provenanceRef) provenanceRefs.add(qualification.provenanceRef);
    return {
      dietClass: derivedDietClass,
      containsOnionGarlic: containsOnionGarlic || qualification?.containsOnionGarlic === true
        ? true
        : unknown ? null
        : qualification && Object.prototype.hasOwnProperty.call(qualification, 'containsOnionGarlic')
          ? qualification.containsOnionGarlic
          : false,
      context: contextMap[preset.name] ?? preset.context ?? null,
      provenanceRefs: [...provenanceRefs],
      metadataUnknown: unknown,
    };
  }

  function deriveRecipeMetadata(recipe, componentLookup) {
    const labels = (Array.isArray(recipe?.diet) ? recipe.diet : [recipe?.diet]).filter(Boolean).map(x => String(x).toLowerCase());
    const declaredDietClass = recipe?.vegan === true || labels.includes('vegan')
      ? 'vegan'
      : recipe?.vegetarian === true || labels.includes('vegetarian')
        ? 'vegetarian'
        : labels.includes('non-vegetarian') ? 'nonveg' : null;
    let dietRank = declaredDietClass in DIET_RANK ? DIET_RANK[declaredDietClass] : -1;
    let containsOnionGarlic = false;
    let unknown = false;
    for (const ingredient of recipe?.ingredients || []) {
      if (!ingredient.componentId) { unknown = true; continue; }
      const component = componentLookup instanceof Map ? componentLookup.get(ingredient.componentId) : componentLookup?.[ingredient.componentId];
      if (!component || typeof component.containsOnionGarlic !== 'boolean') { unknown = true; continue; }
      if (component.dietClass in DIET_RANK) dietRank = Math.max(dietRank, DIET_RANK[component.dietClass]);
      if (component.containsOnionGarlic) containsOnionGarlic = true;
    }
    return {
      dietClass: dietRank < 0 ? null : DIET_CLASSES[dietRank],
      containsOnionGarlic: containsOnionGarlic ? true : (unknown ? null : false),
      metadataUnknown: dietRank < 0 || unknown,
    };
  }

  function enrichCatalog(components, presets, data = initialData, options = {}) {
    const parts = dataParts(data);
    const enrichedComponents = (components || []).map(component => mergeComponent(component, parts.componentMeta[component.id], options));
    const lookup = new Map(enrichedComponents.map(component => [component.id, component]));
    const enrichedPresets = (presets || []).map(preset => ({
      ...preset,
      ...derivePresetMetadata(preset, lookup, data),
    }));
    return { components: enrichedComponents, presets: enrichedPresets };
  }

  function validateFoodModel(catalog, data = initialData, options = {}) {
    const release = Boolean(options.release);
    const errors = [];
    const warnings = [];
    const parts = dataParts(data);
    const components = catalog?.components || [];
    const presets = catalog?.presets || [];
    const ids = new Set(components.map(item => item.id));
    for (const component of components) {
      const meta = parts.componentMeta[component.id];
      if (!meta) { errors.push({ rule: 'component-metadata', subject: component.id }); continue; }
      if (!DIET_CLASSES.includes(meta.dietClass)) errors.push({ rule: 'diet-class', subject: component.id });
      if (typeof meta.containsOnionGarlic !== 'boolean') errors.push({ rule: 'onion-garlic-boolean', subject: component.id });
      if (!CONTEXTS.includes(meta.context)) errors.push({ rule: 'component-context', subject: component.id });
      const record = parts.provenance[meta.provenanceRef];
      if (!record || !record.source || !record.accessDate || !record.portionBasis || !record.licenseStatus) {
        errors.push({ rule: 'provenance-complete', subject: component.id, provenanceRef: meta.provenanceRef });
      } else if (record.licenseStatus === 'unapproved') {
        (release ? errors : warnings).push({ rule: 'unapproved-provenance', subject: component.id, provenanceRef: meta.provenanceRef });
      }
      for (const [unit, definition] of Object.entries(meta.householdUnits || meta.units || {})) {
        const quantity = typeof definition === 'number' ? definition * component.defaultQty : definition.baseQty;
        if (!REQUIRED_UNITS.includes(unit) || !Number.isFinite(quantity) || quantity <= 0
          || (typeof definition === 'object' && !['g', 'ml', 'pc', component.defaultUnit].includes(definition.baseUnit))) {
          errors.push({ rule: 'household-unit', subject: component.id, unit });
        }
        if (typeof definition === 'object') {
          const unitRecord = parts.provenance[definition.provenanceRef];
          if (!definition.basis || !unitRecord || !unitRecord.source || !unitRecord.accessDate
            || !unitRecord.portionBasis || !unitRecord.licenseStatus) {
            errors.push({ rule: 'unit-provenance-complete', subject: component.id, unit, provenanceRef: definition.provenanceRef });
          } else if (release && unitRecord.licenseStatus === 'unapproved') {
            errors.push({ rule: 'unapproved-unit-provenance', subject: component.id, unit, provenanceRef: definition.provenanceRef });
          }
        }
      }
    }
    for (const id of Object.keys(parts.componentMeta)) {
      if (!ids.has(id)) errors.push({ rule: 'orphan-component-metadata', subject: id });
    }
    const enriched = enrichCatalog(components, presets, data);
    const presetNames = new Set(presets.map(item => item.name));
    for (const [name, qualification] of Object.entries(parts.presetQualificationByName)) {
      if (!presetNames.has(name)) errors.push({ rule: 'orphan-preset-qualification', subject: name });
      if (![true, false, null].includes(qualification?.containsOnionGarlic)) errors.push({ rule: 'preset-qualification-onion-garlic', subject: name });
      if (qualification?.dietClass != null && !DIET_CLASSES.includes(qualification.dietClass)) errors.push({ rule: 'preset-qualification-diet-class', subject: name });
      const record = parts.provenance[qualification?.provenanceRef];
      if (!qualification?.basis || !record || !record.source || !record.accessDate || !record.portionBasis || !record.licenseStatus) {
        errors.push({ rule: 'preset-qualification-provenance', subject: name, provenanceRef: qualification?.provenanceRef });
      }
    }
    for (const preset of enriched.presets) {
      if (preset.metadataUnknown || !DIET_CLASSES.includes(preset.dietClass)) errors.push({ rule: 'preset-diet-derived', subject: preset.name });
      if (typeof preset.containsOnionGarlic !== 'boolean'
        && !(parts.presetQualificationByName[preset.name]?.containsOnionGarlic === null)) errors.push({ rule: 'preset-onion-garlic-derived', subject: preset.name });
      if (!CONTEXTS.includes(preset.context)) errors.push({ rule: 'preset-context', subject: preset.name });
    }
    return {
      errors, warnings,
      summary: { components: components.length, presets: presets.length, unapproved: warnings.filter(x => x.rule === 'unapproved-provenance').length },
      valid: errors.length === 0,
    };
  }

  return Object.freeze({
    DIET_CLASSES, CONTEXTS, REQUIRED_UNITS, normalizePreference, compatible,
    evaluateFood, filterFoods, unitsForFood, derivePresetMetadata, deriveRecipeMetadata, enrichCatalog, validateFoodModel,
  });
});
