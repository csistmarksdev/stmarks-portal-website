# CSI St. Mark's Church — Portal

Deployment and operations guide.

This folder is a complete, self-contained application: a REST API, an admin CMS
for the church staff, and the content and images to start with. Upload it as-is
and start it. Nothing needs to be compiled or installed on the server.

**Contents**

1. [What you are hosting](#1-what-you-are-hosting)
2. [Requirements](#2-requirements)
3. [Quick start](#3-quick-start)
4. [Environment variables](#4-environment-variables)
5. [What happens on first boot](#5-what-happens-on-first-boot)
6. [Verifying the deployment](#6-verifying-the-deployment)
7. [Connecting the public website](#7-connecting-the-public-website)
8. [Data that must survive a redeploy](#8-data-that-must-survive-a-redeploy)
9. [Reverse proxy and TLS](#9-reverse-proxy-and-tls)
10. [Redeploying and updating](#10-redeploying-and-updating)
11. [Troubleshooting](#11-troubleshooting)
12. [Things that will break it](#12-things-that-will-break-it)

---

## 1. What you are hosting

Two applications served from **one port**:

| Path | What it is | Who uses it |
|---|---|---|
| `/` and everything unmatched | Admin CMS | Church staff, in a browser |
| `/v1/*` | REST API | The public website, and the CMS |
| `/uploads/*` | Uploaded images and video | Both |
| `/docs` | API documentation | Off in production unless enabled |

A third component — the public church website — is a **separate deployment**
that talks to this one over `/v1`. See [section 7](#7-connecting-the-public-website).

```
                  ┌─────────────── this deployment ───────────────┐
  church staff ──►│  /            Admin CMS                       │
                  │  /v1/*        API          ├──► MongoDB       │
  public website ►│  /uploads/*   media files  └──► disk (uploads)│
                  └───────────────────────────────────────────────┘
```

### Layout

```
start.mjs              entrypoint — the only thing you run
README.md              this file
.env.example           every setting, annotated

backend/
  dist/                the API
  node_modules/        its dependencies, prebuilt for the target platform
  seed-data/           initial content (139 records)
  seed-assets/         the images that content references (193 files)
  uploads/             created on first boot — the live media folder

frontend/              the admin CMS (Next.js standalone server)
node_modules/          the CMS's dependencies
```

---

## 2. Requirements

| | |
|---|---|
| **Node.js** | 20 or newer (22 LTS recommended) |
| **MongoDB** | 6 or 7, reachable from the app |
| **CPU** | 1 vCPU is enough; 2 gives headroom for image processing |
| **Memory** | **1 GB.** 512 MB works but leaves little margin — see below |
| **Disk** | ~150 MB for the app, plus uploads (starts at ~14 MB and grows) |
| **Platform** | **linux-x64.** See the note below |
| **Outbound network** | Only to MongoDB and the website's revalidate URL |

### Measured resource use

Taken from a real run of this bundle — three Node processes: the entrypoint and
router, the API, and the CMS. MongoDB is separate and not counted here.

| | Idle | Under load |
|---|---|---|
| entrypoint + router | 68 MB | 73 MB |
| API (NestJS) | 145 MB | 182 MB |
| CMS (Next.js) | 100 MB | 92 MB |
| **Total** | **313 MB** | **346 MB** |

"Under load" is 300 API requests sustained at ~270 req/s plus six image resizes
of a 2 MB PNG — far beyond anything a parish site generates, so treat ~350 MB as
a working ceiling rather than a typical figure.

**512 MB is viable** but leaves ~160 MB of headroom, and image processing is the
spiky part. **1 GB is the comfortable choice**, and is usually the same price
tier.

A parish website's real traffic is a few requests per second at most. Throughput
is not the constraint here; memory is.

### Startup time

| | |
|---|---|
| First boot (imports content and 193 images) | ~3.5 s |
| Every later restart | ~3 s |

Set the platform's health-check grace period to **at least 60 seconds** anyway.
The figures above are from a warm filesystem; the very first start after
uploading 130 MB can take considerably longer while the operating system reads
those files for the first time. A grace period shorter than the real startup
makes the platform kill and restart the app forever.

Point the health check at `/v1/health` ([section 6](#6-verifying-the-deployment)).

> **Platform matters.** This bundle contains precompiled native binaries
> (`sharp`, for image processing). It is built for **linux-x64**. On any other
> platform — ARM servers such as AWS Graviton or a Raspberry Pi, or macOS — the
> app starts but fails the moment it touches an image, with
> `Could not load the sharp module`. If your server is not linux-x64, ask for a
> rebuild naming the platform; it is a one-line change at build time.

---

## 3. Quick start

**1. Upload this folder** to the server.

**2. Generate two secrets.** Anywhere with `openssl`:

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
```

They must be different from each other. No `openssl`? Use:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**3. Set the environment variables** from [section 4](#4-environment-variables).

Either in the platform's dashboard, or in a **`.env` file beside `start.mjs`** —
copy `.env.example` to `.env` and fill it in. Real environment variables win
over the file, so a platform's settings are never overridden by a stale copy.

> **`PORT` is the public port**, not the API's. The API and CMS sit behind it on
> internal ports (4000 and 3001 by default). Setting `PORT=4000` collides with
> `API_PORT`, and the app will say so and stop.

With `NODE_ENV=production` the app checks its own configuration at startup and
sorts the findings into two kinds:

**Refuses to start** — anything that would let a stranger in, and cannot be
corrected after the fact:

```
Refusing to start: 2 unsafe production setting(s).
  • JWT_ACCESS_SECRET is still the built-in placeholder …
  • SEED_ADMIN_PASSWORD is still the example value …
```

**Starts, but warns** — settings you can only complete once the rest of the
system exists. Expected on a first deploy, when the website does not exist yet:

```
⚠  3 setting(s) still to complete:
   • PUBLIC_URL is "http://localhost:8080", a local address …
   • CORS_ORIGINS contains local origins …
   • WEBSITE_REVALIDATE_URL / WEBSITE_REVALIDATE_SECRET are unset …
   The Portal will run, but finish these before handing it over.
```

So a first deploy comes up and tells you what is left, rather than refusing over
a URL you cannot know yet. Work through the warnings until the boot is silent.

**4. Set the start command:**

```bash
node start.mjs
```

**5. Start it, and watch the logs.** [Section 5](#5-what-happens-on-first-boot)
shows what a healthy first boot looks like.

**6. Once you know the public URL**, set `PUBLIC_URL` to it and restart. The app
repairs stored image URLs automatically — see [section 5](#5-what-happens-on-first-boot).

---

## 4. Environment variables

### Required

The API validates these before it accepts traffic and **refuses to start** if
any is missing or unsafe, listing every problem at once. This is deliberate: a
missing secret would otherwise produce a running server that quietly accepts
forged administrator logins.

| Variable | Example | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb://user:pass@host:27017/csistmc-portal` | Include credentials if your database requires them |
| `PUBLIC_URL` | `https://portal.example.org` | The public origin of **this** deployment, no trailing slash. Written into image URLs — see the warning below |
| `CORS_ORIGINS` | `https://csistmarksmadipakkam.org,https://www.csistmarksmadipakkam.org` | Comma-separated. Browser origins allowed to call the API. Exact match, so include `www.` if you serve it |
| `JWT_ACCESS_SECRET` | 48 random bytes | Minimum 32 characters |
| `JWT_REFRESH_SECRET` | 48 random bytes | Minimum 32 characters, **different** from the access secret |
| `SEED_ADMIN_PASSWORD` | your choice | Minimum 12 characters. Used **once**, on first boot, to create the administrator |
| `NODE_ENV` | `production` | Enables the safety checks above |

> **`PUBLIC_URL` must match the origin browsers actually use.** It is stored
> inside image URLs in the database, so a wrong value means every image 404s.
> You often will not know it until after the first deploy — that is fine, set it
> afterwards and restart.

### Recommended

| Variable | Default | Notes |
|---|---|---|
| `SEED_ADMIN_EMAIL` | `admin@csistmarksmadipakkam.org` | The administrator's login. **Do not change after first boot** — see [section 11](#11-troubleshooting) |
| `SEED_ADMIN_NAME` | `Portal Administrator` | Display name |
| `WEBSITE_REVALIDATE_URL` | — | `https://<website>/api/revalidate`. Without it, publishing in the CMS does not refresh the website for up to 5 minutes |
| `WEBSITE_REVALIDATE_SECRET` | — | Shared secret. **Must be identical** to `REVALIDATE_SECRET` on the website |
| `CORS_ALLOW_PRIVATE_NETWORK` | `false` in production | Leave off. `true` admits any private-network origin with credentials |

### Optional

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8080` | The public port. Most platforms set this automatically |
| `API_PORT` | `4000` | Internal only. Change if something else on the host uses 4000 |
| `CMS_PORT` | `3001` | Internal only |
| `SPLIT_PORTS` | `false` | `true` exposes API and CMS on their own ports instead of routing |
| `API_PREFIX` | `v1` | Changing this changes the API path everywhere |
| `UPLOAD_DIR` | `uploads` | Relative to `backend/`. Point at a mounted volume if you have one |
| `MAX_UPLOAD_MB` | `15` | Per image/document |
| `MAX_VIDEO_UPLOAD_MB` | `200` | Per video |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | `7d` | Sign-in lifetime |
| `ENABLE_API_DOCS` | off | `true` publishes Swagger at `/docs` |

---

## 5. What happens on first boot

The entrypoint waits for the database, prepares the data, then starts both apps.
A healthy first boot looks like this:

```
[portal] database reachable at db-host:27017
[portal] initializing data…
✓ Created super-admin admin@csistmarksmadipakkam.org
✓ Media: 193 installed, 0 already present
✓ announcements: inserted 6 document(s)
✓ blog_posts: inserted 10 document(s)
✓ church_singletons: inserted 8 document(s)
✓ events: inserted 6 document(s)
✓ fellowships: inserted 7 document(s)
✓ gallery_albums: inserted 6 document(s)
✓ media: inserted 96 document(s)
· Media origin already https://portal.example.org
Initialization complete.
[portal] starting API on 127.0.0.1:4000
[portal] starting CMS on 127.0.0.1:3001
[portal] listening on :8080
[portal]   API   /v1  and  /uploads
[portal]   CMS   everything else
```

**Every later boot is a no-op** — it only fills what is empty:

```
· Administrator admin@csistmarksmadipakkam.org already exists
· Media: 0 installed, 193 already present
· events: 6 document(s) already present, left alone
```

So restarting is always safe, including after a year of the church's edits.

### Correcting `PUBLIC_URL` after the fact

If the first boot ran with the wrong `PUBLIC_URL`, set the right one and
restart. Stored image URLs are repointed automatically:

```
✓ Media origin: repointed 29 record(s) at https://portal.example.org
```

Only URLs belonging to this app's own `/uploads/` route are touched. Nothing is
deleted, and a boot where nothing changed says so and does nothing.

---

## 6. Verifying the deployment

**Health.** Reports the database connection, not merely that the process is up —
use it for the platform's health check:

```bash
curl https://portal.example.org/v1/health
# {"status":"ok","database":"connected","uptimeSeconds":12,"timestamp":"…"}
```

Returns **503** with `"status":"degraded"` if the database connection drops.

**Public API** — should return data with no authentication:

```bash
curl https://portal.example.org/v1/events
curl https://portal.example.org/v1/fellowships
```

**Admin API** — must refuse anonymous callers:

```bash
curl -o /dev/null -w "%{http_code}\n" https://portal.example.org/v1/admin/events
# 401
```

**Images** — take a `banner.url` from the fellowships response and open it. It
should return the image, and its origin should equal `PUBLIC_URL`.

**CMS** — open `https://portal.example.org/` and sign in with `SEED_ADMIN_EMAIL`
and `SEED_ADMIN_PASSWORD`. Have the church change that password immediately,
under Users.

---

## 7. Connecting the public website

The website is deployed separately. It needs **one** variable:

```bash
NEXT_PUBLIC_API_URL=https://portal.example.org/v1
```

That single value drives both its API calls and its image loading, so there is
no second setting to keep in step.

**Three things must agree, or the site half-works in a confusing way:**

1. `NEXT_PUBLIC_API_URL` on the website = `PUBLIC_URL` here, plus `/v1`.
   Same scheme, same host, exactly. If one says `example.org` and the other
   `www.example.org`, **the JSON loads but every image fails to render.**
2. The website's domain is listed in `CORS_ORIGINS` here.
3. `WEBSITE_REVALIDATE_SECRET` here = `REVALIDATE_SECRET` on the website, so
   publishing refreshes the site.

**Order of operations:** deploy this Portal first, confirm its URL, then deploy
the website pointing at it.

---

## 8. Data that must survive a redeploy

Two things hold everything the church owns:

| | Holds | If lost |
|---|---|---|
| **MongoDB** | All content, users, audit log | Everything reverts to the bundled starting content |
| **`backend/uploads/`** | Every uploaded image and video | Content survives but all images 404 |

`uploads/` is a **directory inside the app folder**. If your platform replaces
the whole folder on deploy — most do — mount persistent storage at
`backend/uploads`, or point `UPLOAD_DIR` at a path that persists. Getting this
wrong loses every photograph the church uploads.

**Back up both together.** A database restored against mismatched uploads gives
broken images.

```bash
mongodump --uri="$MONGODB_URI" --out=backup/db
tar czf backup/uploads.tar.gz backend/uploads
```

---

## 9. Reverse proxy and TLS

The app speaks plain HTTP on one port and expects TLS to be terminated in front
of it — by the platform, or by nginx/Caddy if you manage the server.

If you run your own proxy, it must:

- forward **all** paths to the app; do not filter or rewrite `/v1` or `/uploads`
- set `X-Forwarded-Proto: https` so generated links use `https`
- allow request bodies up to at least `MAX_VIDEO_UPLOAD_MB` (default 200 MB) —
  nginx's default `client_max_body_size` is **1 MB** and will reject uploads
- allow a generous timeout on uploads

Minimal nginx:

```nginx
server {
  server_name portal.example.org;
  client_max_body_size 200m;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
  }
}
```

`PUBLIC_URL` must then be the **public** address (`https://portal.example.org`),
not the internal port.

---

## 10. Redeploying and updating

To deploy a new build:

1. Stop the app.
2. Replace everything **except `backend/uploads/`**.
3. Start it.

The initializer runs again, sees existing data, and leaves it alone. No
migration step, no downtime beyond the restart.

Keep the previous folder until the new one is confirmed working — rolling back
is then just swapping the folders back.

---

## 11. Troubleshooting

### It refuses to start and lists problems

```
Refusing to start: 3 unsafe production setting(s).
  • JWT_ACCESS_SECRET is 12 characters; use at least 32 …
```

Working as intended. Fix exactly what it names and start again. It reports every
problem at once, so one pass is enough.

### `MONGODB_URI is not set` — but it *is* in my `.env`

`start.mjs` reads `.env` from **its own folder**. Check the file sits beside
`start.mjs` (not in `backend/`), is named exactly `.env`, and that the line has
no `export ` prefix. The first log line confirms what happened:

```
[portal] configuration: .env loaded (real environment variables take precedence)
[portal] configuration: no .env file — reading the environment only
```

### `PORT and API_PORT are both 4000`

`PORT` is the public port that serves the CMS and API together; `API_PORT` is
internal. Leave `API_PORT` and `CMS_PORT` unset and give `PORT` its own number.

### `Refusing to start: N unsafe production setting(s)`

Only security settings stop the boot: the two JWT secrets, the administrator
password, and private-network CORS. Fix exactly what it names.

Incomplete-but-workable settings — a local `PUBLIC_URL`, local `CORS_ORIGINS`,
a missing revalidation URL — print a `⚠` warning and let the app run.

### `database at … did not become reachable`

The app waited 90 seconds for MongoDB. Check `MONGODB_URI`, that the database
accepts connections from this host, and any firewall or IP allow-list.

### All images are broken, but text content is fine

`PUBLIC_URL` does not match the address browsers use. Set it correctly and
restart — stored URLs are repaired automatically ([section 5](#5-what-happens-on-first-boot)).

If images break only on the **public website** while working in the CMS, it is
instead a mismatch between `PUBLIC_URL` here and `NEXT_PUBLIC_API_URL` there
([section 7](#7-connecting-the-public-website)).

### The CMS loads but is unstyled, or "fails to fetch"

The browser is being blocked by CORS. Add the exact origin — scheme, host and
`www.` if used — to `CORS_ORIGINS` and restart.

### `Could not load the sharp module`

The bundle was built for a different CPU or operating system than this server
([section 2](#2-requirements)). It needs rebuilding for your platform.

### Uploads fail on large files

Either above `MAX_UPLOAD_MB` / `MAX_VIDEO_UPLOAD_MB`, or your reverse proxy's
body-size limit ([section 9](#9-reverse-proxy-and-tls)) — nginx defaults to 1 MB.

### Two administrator accounts appeared

`SEED_ADMIN_EMAIL` was changed after the first boot. The initializer looks the
account up **by email**, finds nothing, and creates another super-admin. Delete
the unwanted one in the CMS under Users, and settle on one email.

### Edits in the CMS do not appear on the website

`WEBSITE_REVALIDATE_URL` or `WEBSITE_REVALIDATE_SECRET` is missing or does not
match the website's `REVALIDATE_SECRET`. Without them the site refreshes on its
own schedule instead, within about five minutes.

### Changing `SEED_ADMIN_PASSWORD` did not change the login

Expected. It is read **only** when creating the account. Change the password in
the CMS under Users.

---

## 12. Things that will break it

- **Do not run `npm install` here.** Dependencies are already present and built
  for the target platform. Reinstalling replaces them with binaries for whatever
  the build host happens to be, and breaks image handling.
- **Do not delete or reset `backend/uploads/`.** Every photograph the church has
  uploaded lives there, and nothing else holds a copy.
- **Do not change `SEED_ADMIN_EMAIL` after the first boot** — it creates a second
  administrator rather than renaming the first.
- **Do not point two deployments at one database** unless they share the uploads
  folder too. Each writes image URLs using its own `PUBLIC_URL`, and they will
  overwrite each other's.
- **Do not set `CORS_ALLOW_PRIVATE_NETWORK=true` on a public server.** It admits
  any private-network origin with credentials.
- **Do not commit the environment values anywhere.** They include the signing
  secrets for administrator sessions.
