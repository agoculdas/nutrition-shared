# Nutrition Shared

## Release build

From a clean checkout with Node.js 20 or newer:

```text
npm ci --ignore-scripts
npm run build
```

The single documented release command is `npm run build`. It creates two complete edition artifacts from the same core:

- `dist/shared/`
- `dist/india/`

Each directory contains `index.html`, `app.js`, `edition-config.js`, `service-worker.js`, its manifest and icon, local React vendor files, and `release-hashes.json`. The cross-edition trace is stored at `dist/build-manifest.json`.

The built applications use no third-party origin at runtime. Run `node scripts/serve.mjs` to serve the shared edition, or `node scripts/serve.mjs dist/india` for the India edition. Open `http://127.0.0.1:4173` after starting the server.

## Verification

Run `npm test` for requirement lint, catalog fixtures, production-catalog validation, backup/restore tests, the dual-edition build, edition architecture and shared-edition regression. Run `npm run verify:reproducible` to compare release hashes from two clean checkouts of one controlled source commit.

Checkpoint status and evidence live under `docs/requirements/`.
