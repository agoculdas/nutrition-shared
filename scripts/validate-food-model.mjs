import { FoodModel, loadCatalog, loadFoodModelData, validateCatalog } from './catalog.mjs';

const release = process.argv.includes('--release');
const catalog = loadCatalog();
const data = loadFoodModelData();
const baselineErrors = validateCatalog(catalog);
const result = FoodModel.validateFoodModel(catalog, data, { release });
if (baselineErrors.length) result.errors.unshift(...baselineErrors);
result.valid = result.errors.length === 0;

console.log(JSON.stringify({ mode: release ? 'release' : 'prototype', ...result }, null, 2));
if (!result.valid) process.exitCode = 1;

