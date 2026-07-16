import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (urlPath === '/__test__/seed-baseline') {
    const fixture = fs.readFileSync(path.resolve('docs/requirements/fixtures/shared-storage-baseline.json'), 'utf8');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(`<!doctype html><meta charset="utf-8"><title>Fixture seeded</title><script>const fixture=${fixture};for(const [key,value] of Object.entries(fixture))localStorage.setItem(key,value);</script><p>Baseline fixture seeded.</p>`);
    return;
  }
  if (urlPath === '/__test__/clear') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(`<!doctype html><meta charset="utf-8"><title>Fixture cleared</title><script>for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&key.startsWith('shared.'))localStorage.removeItem(key);}</script><p>Shared fixture cleared.</p>`);
    return;
  }
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) && file !== root) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) response.writeHead(404).end('Not found');
    else response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
  });
});

server.listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}`));
