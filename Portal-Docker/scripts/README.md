# Scripts

- `npm run seed` (root) — idempotent database seed: super-admin user, the eight fixed fellowships, all church singletons and a few sample records. Safe to run repeatedly.
- `npm run smoke -w @portal/backend` — builds the backend and runs `backend/scripts/smoke-test.js` against an in-memory MongoDB (downloads a MongoDB binary on first run).
- `npm run dev` (root) — builds `shared`, then runs the API (watch mode) and the CMS together.
- `node scripts/generate-postman.mjs` — rebuilds the Postman collection + environment in `docs/postman/`. Re-run after adding or changing endpoints.
- `node scripts/generate-icons.mjs` — rebuilds the Portal's icon set from the church crest in `frontend/Logo.svg`, emitting `frontend/src/app/icon.png`, `apple-icon.png` and `frontend/public/logo.png`. Only needed if the crest artwork changes.
