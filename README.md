# Nutrition Shared

## Release build

From a clean checkout with Node.js 20 or newer:

```text
npm ci --ignore-scripts
npm run build
```

The single documented release command is `npm run build`. It creates `dist/` containing:

- `index.html`
- `app.js`
- `service-worker.js`
- `manifest.webmanifest`
- `icon.svg`
- `vendor/react.production.min.js`
- `vendor/react-dom.production.min.js`
- `release-hashes.json`

The built application uses no third-party origin at runtime. Serve `dist/` over HTTP to install and exercise its offline service worker.

## Verification

Run `npm test` for requirement lint, catalog fixtures, production-catalog validation, backup/restore tests and the release build. Run `npm run verify:reproducible` to compare release hashes from two clean checkouts of one controlled source commit.

Checkpoint status and evidence live under `docs/requirements/`.
