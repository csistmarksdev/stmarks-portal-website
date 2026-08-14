# Deploying the Portal container

One image. It contains the API, the admin CMS, a MongoDB server, and a snapshot
of the church's real content, media and accounts.

```bash
docker run -d --name portal -p 8080:8080 -v portal-data:/data csistmarkscmsportal
```

Open `http://localhost:8080`. Everything is there — the 6 gallery albums with
their YouTube links, the 10 blog posts, the 96-item media library, the existing
administrator account. Nothing to provision, nothing to configure.

---

## Contents

- [Building the image](#building-the-image)
- [Refreshing the data](#refreshing-the-data)
- [What happens on boot](#what-happens-on-boot)
- [Configuration](#configuration)
- [Testing the Website endpoints](#testing-the-endpoints-the-website-consumes)
- [Persistence](#persistence)
- [Platform guides](#platform-guides)
- [Using an external database](#using-an-external-database)
- [Troubleshooting](#troubleshooting)

---

## Building the image

The build machine needs Docker, Node 20+, and about 2 GB of free RAM. MongoDB is
not needed — the image brings its own.

Node is on that list because the application is compiled **outside** the
container: `./scripts/build-image.sh` produces `dist-portal/` on this machine
and the Dockerfile copies it in, compiling nothing. That is what keeps the image
build cheap enough for a small host. Dependencies install themselves on the
first run.

```bash
cd Portal-Docker
./scripts/build-image.sh
```

Two ways to build without Node on this machine:

```bash
# the bundle was compiled elsewhere and copied here — Docker only, ~1 minute
./scripts/build-image.sh --use-dist-portal

# compile inside the image instead — Docker only, and the slow path
./scripts/build-image.sh --from-source
```

For a registry, and both architectures:

```bash
./scripts/build-image.sh --multi-arch --push YOUR_DOCKERHUB_USER/csistmarkscmsportal:1.5
```

`--multi-arch` builds `linux/amd64` and `linux/arm64`. The non-native one runs
under QEMU and is slow — roughly ten minutes rather than three. It also requires
`--push`, because a manifest list covering two architectures cannot be stored in
a local Docker daemon; only a registry can hold one.

### No build ever happens at runtime

Both applications are compiled once, here, and the container starts them as
finished artifacts:

| | built | started |
|---|---|---|
| API | `nest build` → `backend/dist` | `node dist/main` |
| CMS | `next build` → standalone server | `node server.js` |

A container that runs `next build` on boot needs about a gigabyte of RAM and a
minute of CPU **every time it starts**, and produces exactly what the image
already contains. On a 512 MB host that is the difference between a restart and
an outage.

---

## Refreshing the data

The snapshot in `snapshot/` is a point-in-time copy. To take a fresh one, from a
machine that can reach the live database:

```bash
# From a checkout that has node_modules (the Portal working tree):
cd /path/to/Portal
PORTAL_ROOT=/path/to/Portal-Docker node /path/to/Portal-Docker/scripts/capture-live-data.mjs
```

`PORTAL_ROOT` exists because this tree is built in Docker and never has
`node_modules` of its own — the script runs from a tree that has the MongoDB
driver installed and writes into the tree that gets built.

It reads `MONGODB_URI` from `backend/.env`, and captures:

- **every collection**, including `users`, `audit_logs` and `contact_messages`
- **`_id` preserved**, because documents reference each other by id
- **every file** under `backend/uploads`, not only the referenced ones
- **canonical Extended JSON**, so `Date` and `ObjectId` survive the round trip

Then check it before building anything from it:

```bash
node scripts/verify-snapshot.mjs        # or: npm run verify:snapshot
```

The documents come from the database and the media comes from `backend/uploads`,
which are two different places that are only assumed to agree. This cross-checks
them — every `media` record's file and every `{{MEDIA}}` reference must exist —
and refuses a snapshot pinned to the capture host's own address. A missing file
found here is one re-capture away from fixed; found later, the original may be
gone.

Then rebuild the image.

> The snapshot contains real password hashes and the audit trail. Treat a built
> image as you would a database backup: keep it in a private registry.

---

## What happens on boot

```
1. detect the public origin        platform env vars, else localhost
2. generate missing secrets        written to /data/secrets.json
3. start MongoDB                   loopback only; skipped if MONGODB_URI is external
4. restore the snapshot            per collection, only where empty
5. install bundled media           into uploads, never overwriting
6. run the initializer             creates an admin only if there is none
7. start the API and the CMS       internal ports 4000 and 3001
8. serve both on $PORT             one origin, no CORS between halves
```

Steps 4 and 5 are idempotent and decided per item. Restarting a container the
church has been editing for a year changes nothing: the snapshot is a starting
point, never a reset.

### Routing

One port, because hosting platforms give an application one `$PORT` and route
one hostname to it:

| path | goes to |
|---|---|
| `/v1/*` | API |
| `/uploads/*` | API (uploaded media) |
| `/docs*` | API (Swagger, off in production unless `ENABLE_API_DOCS=true`) |
| everything else | CMS |

---

## Configuration

Nothing is required. These are the values worth knowing about.

| variable | default | meaning |
|---|---|---|
| `PORT` | `8080` | The public port. Platforms set this themselves. |
| `PUBLIC_URL` | detected | Canonical origin. See below. |
| `CORS_ORIGINS` | `*` | `*` serves a literal wildcard, credentials off. A list restores reflection + credentials. |
| `MONGODB_URI` | bundled | Set it to use an external database. |
| `JWT_ACCESS_SECRET` | generated | Kept in `/data/secrets.json` when unset. |
| `JWT_REFRESH_SECRET` | generated | " |
| `SEED_ADMIN_PASSWORD` | generated | Only used if the database has no admin. |
| `WEBSITE_REVALIDATE_URL` | — | Publishing does not refresh the website without it. |
| `MEDIA_ORIGIN_FROM_REQUEST` | `true` | See below. |
| `NEXT_PUBLIC_UNOPTIMIZED_IMAGES` | `true` (baked in) | Build-time only. Serves uploads directly instead of through Next's optimiser, which needs a writable cache the container may not have. |
| `STATE_DIR` | `/data` | Database and secrets. |
| `SPLIT_PORTS` | `false` | Expose API and CMS separately instead of routing. |

### Why you rarely need `PUBLIC_URL`

Media URLs are absolute and stored *inside* content records, so the origin is
fixed when a file is uploaded. That breaks the moment the portal is reached from
anywhere else — and on most platforms you cannot know your own URL until after
the first deploy.

Two things handle it:

1. The container asks the platform. `RENDER_EXTERNAL_URL`,
   `RAILWAY_PUBLIC_DOMAIN`, `CONTAINER_APP_NAME`, `WEBSITE_HOSTNAME`,
   `FLY_APP_NAME`, `KOYEB_PUBLIC_DOMAIN` and `AWS_APPRUNNER_SERVICE_URL` are all
   recognised.
2. Every API response has media origins rewritten to the origin the request
   actually arrived on. So the same image serves `localhost`, a LAN address and
   a public domain correctly, at the same time, with no configuration.

Set `PUBLIC_URL` anyway once you have a domain — it is the value handed to the
public website, which is not making requests through this rewriting.

Set `MEDIA_ORIGIN_FROM_REQUEST=false` only if media moves to a CDN on a
genuinely different origin.

### CORS — open to everything by default

Every response carries a literal wildcard:

```
Access-Control-Allow-Origin: *
```

Not a reflected origin. That distinction matters for the public Website: a
reflected header varies per caller, so a CDN or proxy caches one visitor's
origin and the next visitor's browser rejects the response. `Vary: Origin`
corrects that and destroys the cache hit rate. A wildcard has neither problem
and is identical for everyone.

`Access-Control-Allow-Credentials` is deliberately **absent**, because the CORS
specification forbids it alongside `*` and browsers reject the pair outright.
Nothing is lost: this API has no cookie authentication and no session. The CMS
reads its token from `localStorage` and sends it as an explicit
`Authorization: Bearer` header, which is unaffected by the credentials flag.

That is also what makes the wildcard safe rather than merely convenient — with
credentials off, a browser attaches nothing automatically to a cross-origin
request, so a hostile page calling this API gets exactly the anonymous access it
would get from `curl`. Everything that matters sits behind a Bearer token it
cannot obtain.

`/uploads/*` carries the same wildcard, plus
`Cross-Origin-Resource-Policy: cross-origin`, so media renders on any site.

The condition to watch is authentication moving to cookies. If that ever
happens, the wildcard must go.

Setting a specific list restores per-origin reflection *with* credentials, so
narrowing remains a real tightening rather than a silent no-op:

```bash
CORS_ORIGINS=https://csistmarksmadipakkam.org,https://www.csistmarksmadipakkam.org
```

---

## Testing the endpoints the Website consumes

The Website reads this API for everything on the public site. Before pointing it
at a deployment, check that deployment actually satisfies the contract:

```bash
node scripts/check-website-api.mjs http://localhost:8080
```

53 checks across every public endpoint. It has no dependencies, so it runs on a
bare machine with nothing but Node.

**If the host has no Node**, run it inside the container — which has one:

```bash
docker cp scripts/check-website-api.mjs portal:/tmp/check.mjs
docker exec portal node /tmp/check.mjs http://127.0.0.1:8080
```

### What it checks, and why status codes are not enough

A `200` proves a route exists. It does not prove the Website can render the
response, and the ways that fails are quiet:

| silent failure | what it looks like on the live site |
|---|---|
| `LocalizedText` missing its `ta` half | the Tamil page renders blank, no error |
| a date serialised as `{}` instead of an ISO string | the events list is simply empty |
| an `ImageAsset` without `width`/`height` | `next/image` throws at render time |
| an unpublished draft leaking `status` | editorial state visible to the public |
| media URLs on the wrong origin | every image 404s |

So each record is validated against the shape in `shared/src/content.ts` — the
same file `npm run check:contract` compares against the Website's own types.

It also confirms the endpoints that must **not** exist still return 404
(`/church/profile`, `/leadership`, `/hero-slides` and the rest are hardcoded in
the Website), that `?page=` switches to the paginated envelope, that pinned
announcements sort first, that a `?fellowship=` filter includes churchwide
shared albums, and that sampled images really return bytes with
`access-control-allow-origin: *`.

### Connecting the Website

When it passes, the Website needs two changes:

```bash
# 1. Website/.env.local
NEXT_PUBLIC_API_URL=https://your-portal-host/v1
```

```ts
// 2. Website/src/services/*.service.ts — swap each mock body for apiGet.
//    Nothing else changes: call sites, types and components stay as they are.
export function getEvents(): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", { tags: ["events"] });
}
```

The Website fetches server-side (`next: { revalidate, tags }`), so those
requests carry no `Origin` and CORS never applies to them at all.

One thing to fix on the Website side: `next.config.ts` has
`remotePatterns: []`, which makes `next/image` reject every image this API
serves. Add the portal's host, or set `unoptimized: true` as this container's
CMS does.

---

## Persistence

| path | holds | mount it? |
|---|---|---|
| `/data` | database, generated secrets | yes, for a real deployment |
| `/app/backend/uploads` | media uploaded through the CMS | yes |

Without volumes the container still runs and still works — it simply returns to
the baked-in snapshot whenever it is recreated. That is the right behaviour for
a demonstration and the wrong one for the church's actual portal.

```bash
docker run -d -p 8080:8080 \
  -v portal-data:/data \
  -v portal-uploads:/app/backend/uploads \
  csistmarkscmsportal
```

The container starts as root only to correct ownership of a freshly mounted
volume, then drops to an unprivileged user. Nothing that serves a request runs
as root.

---

## Platform guides

Every one of these is the same image with no changes. If it is not in the
matrix below, it still works — the container is a standard Linux image that
takes one port, two optional volumes and some environment variables.

| Where | Deploy as | Persists | Notes |
|---|---|---|---|
| Ubuntu / ZimaOS / CasaOS / any Docker host | `docker run` or the compose files | `/data` + `/app/backend/uploads` | the full experience, bundled MongoDB |
| Render | Web Service → Existing image | disk at `/data` | `RENDER_EXTERNAL_URL` detected |
| Railway | image, or the repo `Dockerfile` | volume at `/data` | `PORT` + `RAILWAY_PUBLIC_DOMAIN` detected |
| Heroku | `heroku container:push web` | none — use `MONGODB_URI` | dyno filesystem is ephemeral |
| Fly.io / Azure / AWS / GCP | image + platform volume at `/data` | `/data` | origins auto-detected |
| Netlify | — | — | not applicable, see below |

Render, Railway, Fly and Heroku each read a configuration file from the
repository root, and one is written for each of them in
[`../deploy/`](../deploy/README.md) — `render.yaml`, `railway.toml`, `fly.toml`,
`heroku.yml` + `app.json`. Copy the one you need to the root and the platform
picks it up; the sections below are what those files do, in prose.

### ZimaOS / CasaOS / Ubuntu / any Docker host

```bash
docker compose -f docker-compose.universal.yml up -d
```

That file is written to survive every compose parser: no `${VAR}` substitution,
no profiles, no `version:` key, no host paths, both halves of the port written
out. It pastes into Portainer, Dockge, Synology Container Manager, Coolify and
the ZimaOS custom-app import unchanged, and `podman compose` reads it too.

On a ZimaOS or CasaOS box, `docker-compose.zimaos.yml` is the better import: it
is the same container with its storage under `/DATA/AppData/portal/`, so the
database and the parish's photographs appear in the file manager and can be
copied to a USB disk like anything else on the machine.

Without compose at all:

```bash
docker run -d --name portal --restart unless-stopped \
  -p 8080:8080 \
  -v portal-data:/data \
  -v portal-uploads:/app/backend/uploads \
  --stop-timeout 30 \
  csistmarkscmsportal
```

`--stop-timeout 30` matters more than it looks: on stop, the entrypoint shuts
the API and CMS down first and lets `mongod` finish a few seconds later so its
files close cleanly. Docker's 10-second default kills the container in the
middle of that, and the next boot runs WiredTiger recovery instead.

On Ubuntu (or any Linux with Docker), the same one-liner works — Docker, Podman
or any OCI runtime, no Node, npm or MongoDB install needed on the host.

### Render

Web Service → Existing image. Port `8080`. Add a disk mounted at `/data`.
`RENDER_EXTERNAL_URL` is set for you, so `PUBLIC_URL` is detected.

Without a disk the free tier works fine and resets to the snapshot on each
deploy.

### Railway

Deploy from the published image, or from the repo's `Dockerfile` directly.
Railway injects `PORT` and `RAILWAY_PUBLIC_DOMAIN`; both are picked up. Add a
volume mounted at `/data` (Settings → Volumes) so MongoDB and the generated
secrets survive restarts, and set `UPLOAD_DIR=/data/uploads` so uploaded media
lives inside that same volume. Set the healthcheck path to `/v1/health`.

### Fly.io

```bash
fly launch --image csistmarkscmsportal --no-deploy
fly volumes create portal_data --size 3
fly deploy
```

`fly.toml` needs `internal_port = 8080` and the volume mounted at `/data`.

### Azure Container Apps

Ingress target port `8080`. `CONTAINER_APP_NAME` and
`CONTAINER_APP_ENV_DNS_SUFFIX` are set by the platform, so the origin is
detected. Add an Azure Files mount at `/data` for persistence.

### AWS App Runner / ECS

App Runner: port `8080`, and set `PUBLIC_URL` to the service URL after the first
deploy — App Runner's storage is ephemeral, so treat it as a read-mostly
deployment or move to ECS with EFS mounted at `/data`.

### Google Cloud Run

Cloud Run's filesystem is in-memory and its instances are recycled aggressively,
which suits the bundled database badly. Use an external database
(`MONGODB_URI`) there.

### Heroku

Heroku's dyno filesystem is ephemeral and cannot hold a volume, so the bundled
MongoDB has nowhere to persist. Use an external database there (`MONGODB_URI`,
see below); every restart then re-restores the snapshot only where empty.

```bash
heroku container:login
heroku container:push web --app <app>
heroku container:release web --app <app>
heroku config:set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/csistmc-portal" --app <app>
```

Heroku injects `PORT` and terminates TLS at its router, forwarding
`X-Forwarded-Proto` / `X-Forwarded-Host`, so the public origin is detected and
no `PUBLIC_URL` is needed. The healthcheck path is `/v1/health`. Give the dyno
a few seconds past the first-boot restore before curling it.

### Netlify

Not supported, and not needed. Netlify serves static sites; the Portal is a
long-running server — an API, an admin CMS and a MongoDB process — so there is
no static export that behaves like it. The CMS already serves the site's own
frontend at the same address as the API, so a static host adds nothing here.
Point the public website at the Portal's `/v1` endpoints instead (see
`DEPLOY-AND-TEST.md`).

---

## Using an external database

Set `MONGODB_URI` to anything that is not `127.0.0.1` or `localhost` and the
bundled MongoDB is never started:

```bash
docker run -d -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/csistmc-portal" \
  csistmarkscmsportal
```

The snapshot is restored into it on first boot, per collection, only where
empty. Or use the compose stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Prefer this once the portal is more than a demonstration. The bundled database
exists to make the image runnable anywhere in one command, not to be the best
place to keep a parish's records.

---

## Troubleshooting

**Images are broken / the media library is empty.**
Check `docker logs portal` for the restore lines. If media was installed but
images 404, the uploads volume was mounted over a directory that had already
been populated by an earlier boot — remove the volume and restart.

**Images work on the machine running Docker, and are broken from every other
machine.**
The give-away is that the API returns 200, the files are on disk, and the CMS
shows blank tiles with alt text only when opened from a laptop or phone. Ask the
API what origin it is handing out:

```bash
curl -s http://<host>:8080/v1/gallery | grep -o 'http[^"]*uploads[^"]*' | head -3
```

If those come back as `http://localhost:8080/uploads/…`, the browser is being
told to fetch the church's photographs from *its own* computer. Media URLs are
absolute and are built from `PUBLIC_URL`, which defaults to `localhost` when
nothing is configured; `MediaOriginInterceptor` is what rewrites them to the
origin each request actually arrived on, and it must be registered for that to
happen (`configureApp`, in `backend/src/configure-app.ts`). Images from **1.5**
onwards do this; earlier ones need `PUBLIC_URL` set explicitly to the address
people will use:

```yaml
environment:
  PUBLIC_URL: http://10.0.0.5:8080     # or https://portal.example.org
```

Verify a fix without a browser — ask for a hostname the portal has never been
reached on and check the answer follows it:

```bash
curl -s -H 'X-Forwarded-Host: anything.test' http://<host>:8080/v1/gallery \
  | grep -o 'http[^"]*uploads[^"]*' | head -3
```

**"Refusing to start: N unsafe production setting(s)."**
The API's own guard. It should not trigger on this image, which generates its
secrets. If you set `JWT_ACCESS_SECRET` yourself, it must be at least 32
characters and differ from the refresh secret.

**Everyone is signed out after a restart.**
`/data` is not persisted, so new JWT secrets were generated. Mount a volume
there, or set the secrets explicitly.

**The container is killed shortly after starting, on a small host.**
MongoDB's cache is capped at 256 MB by default here; lower it with
already the lowest value MongoDB accepts — `--wiredTigerCacheSizeGB` has a floor
of `0.25`, and setting `MONGO_CACHE_GB` below it makes `mongod` refuse to start.
If 256 MB of cache is still too much for the host, move to an external database.

**`mongod` exits immediately with an "illegal instruction" error.**
MongoDB 5.0 and later require AVX on x86-64. A very old Celeron or Atom does not
have it. Use an external database on that hardware.

**The CMS loads but every request fails with a connection error.**
The CMS is built to call the API on its own origin under `/v1`. If you set
`SPLIT_PORTS=true`, that assumption no longer holds — you would need to rebuild
with `NEXT_PUBLIC_API_URL` set, because `NEXT_PUBLIC_*` values are inlined into
the browser bundle at build time.
