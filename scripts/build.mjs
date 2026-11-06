import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { transform } from 'esbuild';
import { EDITION_IDS, loadEdition, publicEditionConfig } from './editions.mjs';

const root = path.resolve('.');
const dist = path.join(root, 'dist');
const sourcePath = path.join(root, 'index.html');
const source = fs.readFileSync(sourcePath, 'utf8');
const scriptMatch = source.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Inline application script was not found.');

const compiled = await transform(scriptMatch[1], {
  loader: 'jsx',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
});

function git(command, fallback) {
  try { return execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim(); }
  catch { return fallback; }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const coreCommit = process.env.CORE_COMMIT || git(['rev-parse', 'HEAD'], 'unavailable');
const sourceDirty = git(['status', '--porcelain'], 'dirty') !== '';
const coreSourceSha256 = sha256(Buffer.from(source));
const vendor = [
  ['node_modules/react/umd/react.production.min.js', 'vendor/react.production.min.js'],
  ['node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/react-dom.production.min.js'],
];
const modelAssets = ['food-model-data.js', 'food-model-core.js'];
const mealPrepAssets = ['meal-prep-core.js', 'meal-prep-recipes.js'];
const fastLogAssets = ['fast-log-core.js'];

fs.mkdirSync(dist, { recursive: true });
const buildManifest = {
  schemaVersion: 1,
  coreCommit,
  coreSourceSha256,
  sourceDirty,
  editions: [],
};

for (const editionId of EDITION_IDS) {
  const config = loadEdition(editionId, root);
  const publicConfig = publicEditionConfig(config);
  const output = path.join(dist, editionId);
  fs.mkdirSync(path.join(output, 'vendor'), { recursive: true });

  for (const [from, to] of vendor) fs.copyFileSync(path.join(root, from), path.join(output, to));
  for (const asset of modelAssets) fs.copyFileSync(path.join(root, asset), path.join(output, asset));
  for (const asset of mealPrepAssets) fs.copyFileSync(path.join(root, asset), path.join(output, asset));
  for (const asset of fastLogAssets) fs.copyFileSync(path.join(root, asset), path.join(output, asset));
  fs.copyFileSync(path.join(root, config.iconSource), path.join(output, config.manifest.icon));
  fs.writeFileSync(path.join(output, 'app.js'), compiled.code.replace(/\r\n/g, '\n'));
  fs.writeFileSync(path.join(output, 'edition-config.js'), `window.__NUTRITION_EDITION__=${JSON.stringify(publicConfig)};\n`);

  const webManifest = {
    name: config.manifest.name,
    short_name: config.manifest.shortName,
    start_url: config.manifest.startUrl,
    scope: './',
    display: config.manifest.display,
    orientation: config.manifest.orientation,
    background_color: config.theme.values[config.theme.default].themeColor,
    theme_color: config.theme.values[config.theme.default].themeColor,
    icons: [{ src: config.manifest.icon, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
  };
  fs.writeFileSync(path.join(output, 'manifest.webmanifest'), JSON.stringify(webManifest, null, 2) + '\n');

  let html = source
    .replace(/<title>.*?<\/title>/, `<title>${config.name}</title>`)
    .replace(/<meta name="theme-color" content="[^"]*" \/>/, `<meta name="theme-color" content="${webManifest.theme_color}" />`)
    .replace(/<meta name="apple-mobile-web-app-title" content="[^"]*" \/>/, `<meta name="apple-mobile-web-app-title" content="${config.manifest.shortName}" />`)
    .replace(/<link rel="icon" type="image\/svg\+xml" href="[^"]*" \/>/, `<link rel="icon" type="image/svg+xml" href="${config.manifest.icon}" />`)
    .replace(/<link rel="apple-touch-icon" href="[^"]*" \/>/, `<link rel="apple-touch-icon" href="${config.manifest.icon}" />`)
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/, '')
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>/, '')
    .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]+>/, '')
    .replace(/\s*<script src="https:\/\/unpkg\.com\/react[^>]+><\/script>/, '')
    .replace(/\s*<script src="https:\/\/unpkg\.com\/react-dom[^>]+><\/script>/, '')
    .replace(/\s*<script src="https:\/\/unpkg\.com\/@babel[^>]+><\/script>/, '')
    .replace(/\s*<script src="(?:food-model-data|food-model-core|meal-prep-core|meal-prep-recipes|fast-log-core)\.js"><\/script>/g, '')
    .replace(/<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/, [
      '<script src="edition-config.js"></script>',
      '<script src="food-model-data.js"></script>',
      '<script src="food-model-core.js"></script>',
      '<script src="meal-prep-core.js"></script>',
      '<script src="meal-prep-recipes.js"></script>',
      '<script src="fast-log-core.js"></script>',
      '<script src="vendor/react.production.min.js"></script>',
      '<script src="vendor/react-dom.production.min.js"></script>',
      '<script src="app.js"></script>',
      '<script>if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));}</script>',
    ].join('\n'))
    .replace(/\r\n/g, '\n');
  fs.writeFileSync(path.join(output, 'index.html'), html);

  const assets = ['index.html', 'app.js', 'edition-config.js', ...modelAssets, ...mealPrepAssets, ...fastLogAssets, config.manifest.icon, 'manifest.webmanifest', ...vendor.map(([, to]) => to)];
  const digest = crypto.createHash('sha256');
  for (const asset of assets) digest.update(asset).update('\0').update(fs.readFileSync(path.join(output, asset)));
  const cacheName = `nutrition-${editionId}-${digest.digest('hex').slice(0, 16)}`;
  const cachePrefix = `nutrition-${editionId}-`;
  const serviceWorker = `const CACHE=${JSON.stringify(cacheName)};\nconst CACHE_PREFIX=${JSON.stringify(cachePrefix)};\nconst ASSETS=${JSON.stringify(assets.map(asset => `./${asset}`))};\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||fetch(event.request)));});\n`;
  fs.writeFileSync(path.join(output, 'service-worker.js'), serviceWorker);

  const releaseFiles = [...assets, 'service-worker.js'].sort();
  const releaseHashes = releaseFiles.map(file => ({ file, sha256: sha256(fs.readFileSync(path.join(output, file))) }));
  fs.writeFileSync(path.join(output, 'release-hashes.json'), JSON.stringify(releaseHashes, null, 2) + '\n');
  buildManifest.editions.push({
    id: editionId,
    name: config.name,
    outputDirectory: `dist/${editionId}`,
    coreCommit,
    coreSourceSha256,
    configSha256: sha256(Buffer.from(JSON.stringify(config))),
    releaseManifest: `dist/${editionId}/release-hashes.json`,
  });
}

fs.writeFileSync(path.join(dist, 'build-manifest.json'), JSON.stringify(buildManifest, null, 2) + '\n');
console.log(`Built ${buildManifest.editions.length} editions from core ${coreCommit.slice(0, 12)}.`);
