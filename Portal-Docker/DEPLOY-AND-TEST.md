# Deploying and testing the published image

Pull `stmarksdev/csistmarkscmsportal` on any machine and prove it works.

Nothing but Docker is required on the target — no source, no Node, no MongoDB.
The image carries its own database and a snapshot of the church's content, media
and accounts.

> The image is **private**. Every machine that pulls it must
> `docker login -u stmarksdev` first.

---

## 1. Deploy

Copy one compose file to the target — it is the only file needed. Which one:

- **`docker-compose.universal.yml`** for anything with a web UI (Portainer,
  ZimaOS, Synology, Unraid, Coolify) or when you would rather not think about
  it. No `${VAR}`, no profiles, nothing an app-store parser mishandles.
- **`docker-compose.zimaos.yml`** on a ZimaOS or CasaOS box, to keep the data
  under `/DATA/AppData/portal/` where its file manager can see it.
- **`docker-compose.deploy.yml`**, below, for the `docker compose` CLI — the one
  place `${VAR}` and the `verify` profile actually work.

```bash
docker login -u stmarksdev
docker compose -f docker-compose.deploy.yml up -d
docker compose -f docker-compose.deploy.yml logs -f portal
```

Wait for `[portal] listening on :8080`. First boot takes 20–40 seconds while it
restores 577 documents and 376 media files.

Without compose, the same thing:

```bash
docker login -u stmarksdev
docker run -d --name portal --restart unless-stopped \
  -p 8080:8080 \
  -v portal-data:/data \
  -v portal-uploads:/app/backend/uploads \
  stmarksdev/csistmarkscmsportal:1.5
```

---

## 2. Test it

### The full contract suite — 53 checks

Every endpoint the public Website consumes, validated for **response shape**,
not just status codes. A `200` proves a route exists; it does not prove the
Website can render it.

With compose:

```bash
docker compose -f docker-compose.deploy.yml --profile verify run --rm verify
```

This reuses the portal image (which already contains Node and the test), waits
for the healthcheck rather than racing the first-boot restore, and reaches the
portal by service name — so it also proves container-to-container networking,
which is how the Website will reach it if they deploy side by side.

Against a plain `docker run`:

```bash
docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080
```

From another machine, pointed at the deployment:

```bash
node scripts/check-website-api.mjs http://<host>:8080
```

Expect `53/53 checks passed`.

> The bundled test is in the image from `1.1` onwards. On the original `1.0`,
> copy it in first:
> `docker cp scripts/check-website-api.mjs portal:/app/check-website-api.mjs`

### A ten-second smoke test

```bash
BASE=http://localhost:8080
curl -s $BASE/v1/health
curl -s $BASE/v1/gallery | head -c 200
curl -s -o /dev/null -w '%{http_code}\n' $BASE/login
```

### That the data really persisted

The check that matters most, and the one nobody runs. Edit something in the CMS
at `http://<host>:8080`, then:

```bash
docker compose -f docker-compose.deploy.yml restart portal
sleep 30
docker compose -f docker-compose.deploy.yml logs portal | grep -i "already populated\|Media:"
```

Expect `Database already populated (11 collection(s) left untouched)` and
`Media: 0 installed, 376 already present`. Your edit is still there. If instead
it restores everything again, the volumes are not attached and every change will
be lost on the next restart.

Harder version — destroy the container entirely, keep the volumes:

```bash
docker compose -f docker-compose.deploy.yml down     # NOT `down -v`
docker compose -f docker-compose.deploy.yml up -d
```

`down -v` deletes the volumes and resets to the baked-in snapshot. That is
occasionally what you want, and never by accident.

---

## 3. Test it on the platforms

Same image everywhere. Per-platform detail is in
[docker/DEPLOY.md](docker/DEPLOY.md#platform-guides); this is what to check once
it is up.

| platform | port | persistence | verify with |
|---|---|---|---|
| ZimaOS / CasaOS / any VPS | `8080` | two named volumes | `docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080` |
| Render | `8080` | add a Disk at `/data` | `node scripts/check-website-api.mjs https://<app>.onrender.com` |
| Railway | injects `$PORT` | volume at `/data` | `node scripts/check-website-api.mjs https://<app>.up.railway.app` |
| Fly.io | `internal_port = 8080` | `fly volumes create` at `/data` | `node scripts/check-website-api.mjs https://<app>.fly.dev` |
| Azure Container Apps | ingress → `8080` | Azure Files at `/data` | `node scripts/check-website-api.mjs https://<app>.<region>.azurecontainerapps.io` |
| AWS App Runner | `8080` | ephemeral — read-mostly, or ECS + EFS | `node scripts/check-website-api.mjs https://<id>.awsapprunner.com` |

Each platform needs its registry credentials set, since the image is private —
Render calls it a *Credential*, Azure takes `--registry-username` /
`--registry-password`. Use the access token as the password, never the account
password.

### What to check on a real HTTPS host

Two things behave differently behind a platform's TLS terminator, and both are
worth confirming once:

```bash
# Media URLs must come back https:// on the public hostname — not http://,
# and not an internal address. Mixed content is blocked by the browser.
curl -s https://<host>/v1/gallery | grep -o 'https://[^"]*/uploads/[^"]*' | head -3

# The wildcard must survive the proxy.
curl -s -o /dev/null -D - -H 'Origin: https://csistmarksmadipakkam.org' \
  https://<host>/v1/gallery | grep -i access-control-allow-origin
```

`PUBLIC_URL` does not need to be set for those to be right — the container
detects its origin from the platform, and rewrites media origins per request
regardless. Set it anyway once the domain is final, because it is the value
handed to the public Website.

---

## 4. Connect the Website

When the suite passes:

```bash
# Website/.env.local
NEXT_PUBLIC_API_URL=https://<portal-host>/v1
```

Then swap each `mockResponse(...)` body in `Website/src/services/*.service.ts`
for `apiGet(...)`. Call sites, types and components stay untouched.

The Website fetches server-side, so its requests carry no `Origin` and CORS
never applies to them.

**One blocker on the Website side**: `next.config.ts` has `remotePatterns: []`,
which makes `next/image` reject every image this API serves. Add the portal host
to it, or set `unoptimized: true` as this container's own CMS does.

---

## Upgrading

```bash
# on the build machine
./scripts/build-image.sh
docker tag csistmarkscmsportal:latest stmarksdev/csistmarkscmsportal:1.6
docker push stmarksdev/csistmarkscmsportal:1.6
```

```bash
# on the target — edit the tag in docker-compose.deploy.yml, then
docker compose -f docker-compose.deploy.yml pull
docker compose -f docker-compose.deploy.yml up -d
```

The volumes carry over untouched, so the database and uploaded media survive.
The restore step sees the collections already populated and leaves them alone —
the snapshot is a starting point, never a reset.

Rolling back is the same two commands with the old tag.
