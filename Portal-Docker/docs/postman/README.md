# Postman collection

Two files, both generated — don't edit them by hand:

| File | What it is |
|---|---|
| `CSISTMC-Portal.postman_collection.json` | 108 requests covering the full API — Auth, the public Website contract, and every Admin CRUD folder |
| `CSISTMC-Portal-Local.postman_environment.json` | `baseUrl`, seed admin credentials, token slots and the id variables the collection fills in as you work |

## Setup (once)

1. In Postman: **Import** → drop both JSON files in.
2. Select the **CSISTMC Portal — Local** environment (top-right).
3. Run **Auth → Login**. Its test script stores `accessToken` and `refreshToken` in the environment — every Admin request then authenticates automatically via the collection's bearer auth.

## How it's wired

- **Public (Website contract)** requests send no auth, exactly like the Website will.
- **Create** requests save the new record's id into the environment (`eventId`, `albumId`, `mediaId`, …), so the *Get by id / Update / Set status / Delete* requests in the same folder work when run top-to-bottom.
- **Gallery → Add photos** captures `photoId` for the reorder/remove requests; **Contact messages** grabs the first message's id for the read/delete calls.
- Optional query params ship disabled — tick them in the Params tab to filter.
- When the access token expires (15 min), run **Auth → Refresh tokens** (or just Login again).

## Pointing at another server

Duplicate the environment and change `baseUrl` (e.g. `http://10.147.18.1:4000/v1`) and `baseUrl2` — nothing else needs to change.

## Regenerating

The collection is produced by [`scripts/generate-postman.mjs`](../../scripts/generate-postman.mjs):

```bash
node scripts/generate-postman.mjs
```

Re-run it after adding or changing endpoints so the collection stays truthful.
