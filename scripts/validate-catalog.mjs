import { loadCatalog, validateCatalog } from './catalog.mjs';

const catalog = loadCatalog();
const errors = validateCatalog(catalog);
if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    errors: 0,
    components: catalog.components.length,
    presets: catalog.presets.length,
  }, null, 2));
}
