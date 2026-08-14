# CSI St. Mark's Church — Portal

Combined **Admin CMS (Next.js)** + **REST API (NestJS + MongoDB)** for CSI St. Mark's Church, Madipakkam. The Portal is the single source of truth for the public Website: it implements the Website's documented API contract **exactly** (see `Website/README.md` §5), plus a full authenticated admin CMS on top.

> **Development phase note:** the Website and the Portal are currently developed independently. The Portal exposes every contract endpoint, but the Website keeps using its mock services until the integration phase. Nothing in this repo touches the Website project.

## Layout

```
Portal/
├── frontend/   Next.js 16 admin CMS   (port 3001)
├── backend/    NestJS API             (port 4000, Swagger at /docs)
├── shared/     Types shared by both — content types mirror the Website contract
├── docs/       API + architecture documentation
├── scripts/    Utility scripts
└── docker-compose.yml
```

## Quick start

Prerequisites: Node ≥ 20, a MongoDB (local install or `docker compose up mongo`).

```bash
npm install

# configure the backend
cp backend/.env.example backend/.env      # then edit secrets/URI
cp frontend/.env.example frontend/.env.local

# create the admin user, fellowships, church singletons + sample content
npm run seed

# run API (4000) + CMS (3001) together
npm run dev
```

Sign in at **http://localhost:3001** with the seeded admin
(`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `backend/.env`,
default `admin@csistmarksmadipakkam.org` / `ChangeMe@123` — change it).

Swagger UI: **http://localhost:4000/docs**. Public contract endpoints live under
**http://localhost:4000/v1** (`/events`, `/blog`, `/gallery`, `/announcements`,
`/downloads`, `/fellowships`, `/church/*`, `/contact`).

### Opening it from another device

Both servers bind every interface, so the portal works from any phone or laptop
on the same network (including ZeroTier/Tailscale) with **no configuration**:

```
http://<this-machine's-IP>:3001      the CMS
http://<this-machine's-IP>:4000/v1   the API
```

The backend prints its LAN address on boot. Three things make this work:

- **CORS** admits any private-network origin — `localhost`, `10.x`, `192.168.x`,
  `172.16–31.x`, `*.local` — on any port. Public origins still need an explicit
  entry in `CORS_ORIGINS` (or `*` to allow everything). Set
  `CORS_ALLOW_PRIVATE_NETWORK=false` to turn the LAN allowance off.
- **The CMS resolves the API from the address you opened it on**, so
  `192.168.1.5:3001` calls `192.168.1.5:4000`. Leave `NEXT_PUBLIC_API_URL`
  unset for this; setting it pins every device to one address.
- **`PUBLIC_URL` defaults to this machine's LAN address.** Media URLs are stored
  *inside* content records, so a `localhost` default would write addresses no
  other device could load. Set it explicitly to the canonical origin in
  production.

### Docker

```bash
docker compose up --build
# mongo :27017, api :4000, cms :3001
```

## Verification

- `npm run build` — builds shared → backend → frontend.
- `npm run smoke -w @portal/backend` — boots the API against an **in-memory MongoDB**, seeds it, and exercises the public contract (array vs `Paginated` envelopes, pinned-first announcements, grouped downloads, singleton shapes, contact form), JWT login/refresh rotation, draft→publish visibility, RBAC denials and audit logging. 22 checks; all green as of the last commit.

## Key design points

- **Contract fidelity** — `shared/src/{common,content}.ts` mirror the Website's `src/types/*.ts` field-for-field. Public responses omit internal fields (`status` etc.); event timing status is derived from dates, never stored; `readingMinutes`, file `format`/`size`, image dimensions and `blurDataURL` are computed server-side.
- **Array vs pagination** — public list endpoints return a plain array (what the Website services expect) unless `page`/`pageSize` is passed, in which case they return `Paginated<T>`.
- **Publish workflow** — every content record is `draft | published | archived`; only `published` records are served publicly. Slugs are generated from the English title and immutable after publish.
- **RBAC** — roles `super-admin | admin | editor | viewer` with a static permission matrix (`shared/src/admin.ts`) enforced by a global guard; public GETs are `@Public()`.
- **Audit** — login/logout, create/update/delete, publish/unpublish/archive, pin and media uploads are logged and browsable at `/admin/audit-logs` and in the CMS.
- **Media** — uploads go to `backend/uploads/` (served at `/uploads/**`); images get intrinsic dimensions, a WebP thumbnail and a base64 blur preview via sharp.
- **Website revalidation** — on publish the backend can POST to the Website's ISR webhook (`WEBSITE_REVALIDATE_URL`); left empty during the standalone phase, making it a no-op.
- **Backup & restore** — `/backup` in the CMS builds one zip of every collection (canonical Extended JSON, `_id` preserved) plus every uploaded file, and takes one back. The module works through the raw Mongo connection rather than a schema list, so a collection added later is carried without anyone remembering to add it. Restoring is two steps — upload and inspect, then apply — because it cannot be undone; `replace` rolls the database back, `merge` upserts and deletes nothing, and a safety backup is taken first by default. Both halves are **super-admin only** (`backup.read`, `backup.restore`) — the archive is the whole database in one file, so downloading one is as consequential as putting one back.

See [docs/API.md](docs/API.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.
