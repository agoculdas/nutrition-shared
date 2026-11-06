import fs from 'node:fs';
import path from 'node:path';

export const EDITION_IDS = ['shared', 'india'];

export function loadEdition(id, root = path.resolve('.')) {
  const file = path.join(root, 'editions', `${id}.json`);
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  validateEdition(config, file);
  return config;
}

export function validateEdition(config, source = 'edition configuration') {
  const missing = [];
  const requireValue = (condition, field) => { if (!condition) missing.push(field); };
  requireValue(typeof config.id === 'string' && config.id.length > 0, 'id');
  requireValue(typeof config.name === 'string' && config.name.length > 0, 'name');
  requireValue(typeof config.storageNamespace === 'string' && config.storageNamespace.endsWith('.'), 'storageNamespace');
  for (const field of ['name', 'shortName', 'icon', 'startUrl', 'display', 'orientation']) {
    requireValue(typeof config.manifest?.[field] === 'string' && config.manifest[field].length > 0, `manifest.${field}`);
  }
  requireValue(typeof config.iconSource === 'string' && config.iconSource.length > 0, 'iconSource');
  requireValue(typeof config.theme?.default === 'string' && !!config.theme?.values?.[config.theme.default], 'theme.default');
  requireValue(Object.keys(config.theme?.values || {}).length > 0, 'theme.values');
  requireValue(Number.isInteger(config.eatingWindow?.startHour) && Number.isInteger(config.eatingWindow?.endHour) && config.eatingWindow.startHour < config.eatingWindow.endHour, 'eatingWindow');
  requireValue(Array.isArray(config.cuisineOrder) && config.cuisineOrder.length > 0, 'cuisineOrder');
  requireValue(Number.isInteger(config.suggestionPolicy?.setSize) && config.suggestionPolicy.setSize > 0, 'suggestionPolicy.setSize');
  requireValue(Number.isInteger(config.suggestionPolicy?.maxPerCuisine) && config.suggestionPolicy.maxPerCuisine > 0, 'suggestionPolicy.maxPerCuisine');
  for (const state of ['anchor', 'balanced', 'filler']) {
    const policy = config.suggestionPolicy?.states?.[state];
    requireValue(policy && ['anchor', 'balanced', 'filler'].every(tier => Number.isInteger(policy.counts?.[tier]) && policy.counts[tier] >= 0), `suggestionPolicy.states.${state}.counts`);
    requireValue(Array.isArray(policy?.fallbackOrder) && new Set(policy.fallbackOrder).size === 3, `suggestionPolicy.states.${state}.fallbackOrder`);
    if (policy?.counts) requireValue(Object.values(policy.counts).reduce((sum, value) => sum + value, 0) === config.suggestionPolicy.setSize, `suggestionPolicy.states.${state}.countTotal`);
  }
  requireValue(config.defaultTargets && typeof config.defaultTargets === 'object', 'defaultTargets');
  requireValue(typeof config.copy?.dashboardTitle === 'string' && config.copy.dashboardTitle.length > 0, 'copy.dashboardTitle');
  requireValue(typeof config.features?.mealPrep === 'boolean', 'features.mealPrep');
  requireValue(typeof config.features?.dietaryPreferences === 'boolean', 'features.dietaryPreferences');
  requireValue(typeof config.features?.qualifiedFoodCatalog === 'boolean', 'features.qualifiedFoodCatalog');
  if (missing.length) throw new Error(`${source} is missing or invalid: ${missing.join(', ')}`);
  return config;
}

export function publicEditionConfig(config) {
  const publicConfig = structuredClone(config);
  delete publicConfig.iconSource;
  return publicConfig;
}
