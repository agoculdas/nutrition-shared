import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { transform } from 'esbuild';

const root = path.resolve('.');
const dist = path.join(root, 'dist');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptMatch = source.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Inline application script was not found.');

const compiled = await transform(scriptMatch[1], {
  loader: 'jsx',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
});

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'vendor'), { recursive: true });

const vendor = [
  ['node_modules/react/umd/react.production.min.js', 'vendor/react.production.min.js'],
  ['node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/react-dom.production.min.js'],
];
for (const [from, to] of vendor) fs.copyFileSync(path.join(root, from), path.join(dist, to));
fs.copyFileSync(path.join(root, 'icon.svg'), path.join(dist, 'icon.svg'));
fs.copyFileSync(path.join(root, 'manifest.webmanifest'), path.join(dist, 'manifest.webmanifest'));
fs.writeFileSync(path.join(dist, 'app.js'), compiled.code.replace(/\r\n/g, '\n'));

let html = source
  .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/, '')
  .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>/, '')
  .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]+>/, '')
  .replace(/\s*<script src="https:\/\/unpkg\.com\/react[^>]+><\/script>/, '')
  .replace(/\s*<script src="https:\/\/unpkg\.com\/react-dom[^>]+><\/script>/, '')
  .replace(/\s*<script src="https:\/\/unpkg\.com\/@babel[^>]+><\/script>/, '')
  .replace(/<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/, [
    '<script src="vendor/react.production.min.js"></script>',
    '<script src="vendor/react-dom.production.min.js"></script>',
    '<script src="app.js"></script>',
    '<script>if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));}</script>',
  ].join('\n'))
  .replace(/\r\n/g, '\n');
fs.writeFileSync(path.join(dist, 'index.html'), html);

const assets = ['index.html', 'app.js', 'icon.svg', 'manifest.webmanifest', ...vendor.map(([, to]) => to)];
const digest = crypto.createHash('sha256');
for (const asset of assets) digest.update(asset).update('\0').update(fs.readFileSync(path.join(dist, asset)));
const cacheName = `nutrition-shared-${digest.digest('hex').slice(0, 16)}`;
const serviceWorker = `const CACHE=${JSON.stringify(cacheName)};\nconst ASSETS=${JSON.stringify(assets.map(asset => `./${asset}`))};\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||fetch(event.request)));});\n`;
fs.writeFileSync(path.join(dist, 'service-worker.js'), serviceWorker);

const releaseFiles = [...assets, 'service-worker.js'].sort();
const manifest = releaseFiles.map(file => ({
  file,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, file))).digest('hex'),
}));
fs.writeFileSync(path.join(dist, 'release-hashes.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${releaseFiles.length + 1} files in dist/`);
