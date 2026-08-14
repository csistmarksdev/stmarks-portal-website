# csistmarkscmsportal — build & push

The CSI St. Mark's Portal as **one Docker image**: the NestJS API, the Next.js
admin CMS, a MongoDB server, and a snapshot of the live installation's content,
media and accounts.

```bash
docker run -d -p 8080:8080 -v portal-data:/data csistmarkscmsportal
```

That is the whole deployment. No database to provision, no environment to set,
no build at startup. It runs the same way on ZimaOS, Render, Railway, Azure,
AWS, Fly, or a laptop.

For what the image does once it is running — configuration, persistence,
per-platform deployment, troubleshooting — see **[docker/DEPLOY.md](docker/DEPLOY.md)**.
This file is only about producing and publishing it.

---

## What is inside

| | |
|---|---|
| Documents | 577 across 12 collections |
| Media | 376 files, 14.9 MB |
| Accounts | the existing administrator, password hash intact |
| Gallery | 6 albums, including their YouTube video links |
| Also included | the full audit trail and contact messages |

Captured from the live database on 2026-08-13. To take a newer snapshot, see
[Refreshing the data](docker/DEPLOY.md#refreshing-the-data).

> The snapshot contains real password hashes and the church's audit trail. Treat
> a built image the way you would a database backup — **push it to a private
> registry only**.

---

## Prerequisites on the build machine

**Docker and Node 20+**, and about 4 GB of RAM. MongoDB is not needed — the
image brings its own.

Node is on that list because the application is compiled *here*, not in the
image. `scripts/build-production-bundle.mjs` produces `dist-portal/` and the
Dockerfile copies it in: no `npm ci`, no `nest build`, no `next build` and no
`node_modules` resolution inside the builder.

That is the point of this layout rather than an implementation detail.
Compiling in the image means a Next.js build in the builder — ~2 GB of RAM and
minutes of CPU, on every architecture and again on every host that rebuilds
rather than pulls. On a ZimaBoard or a free-tier box that is the difference
between an image that builds and a machine that swaps until the daemon is
killed. Out here it happens once, on a machine that already has `node_modules`
warmed, and the result can be *run and tested* before an image exists at all.

```bash
docker --version          # 20.10 or newer
node --version            # 20 or newer — this machine does the compiling
docker buildx version     # only needed for multi-architecture builds
free -m                   # the Next.js compile wants ~2 GB free
```

`node_modules/` does not have to come with the folder — it should not, being
hundreds of megabytes of another platform's binaries. The first build runs
`npm ci` itself when the compilers are missing, which needs a few minutes and
access to the npm registry; every build afterwards skips it. `package-lock.json`
does have to come across, or that install resolves fresh versions instead of the
tested ones.

A machine with Docker but no Node can still build, the slow way, with
`./scripts/build-image.sh --from-source` — that uses `Dockerfile.source` and
pays the full compile cost inside the builder. It exists for Render's and
Railway's repository integrations, which never see a prebuilt bundle.

If `docker` needs `sudo` on every command, add yourself to the group once and
log back in:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

---

## 1. Build

From the folder you copied across:

```bash
cd ~/Portal-Docker
chmod +x scripts/build-image.sh docker/launch.sh
./scripts/build-image.sh
```

One command, two steps: it compiles the application into `dist-portal/`, then
assembles the image from it. Roughly 3–6 minutes for the first, under a minute
for the second — the image build is a file copy plus an apt layer that is cached
until the Node version changes.

### Building from a bundle someone else compiled

```bash
./scripts/build-image.sh --use-dist-portal
```

Skips the compile entirely and assembles the image from the `dist-portal/`
already present. Two uses:

- **Iterating on packaging.** The Dockerfile, the entrypoint or the compose
  files changed and the application did not — under a minute instead of six.
- **A build host with no Node at all.** Compile the bundle somewhere that has
  Node, copy the folder over, and this path needs nothing but Docker: no npm, no
  `node_modules`, and not even `snapshot/`, because the bundle carries its own
  copy of it. Every `node` call in the script is skipped when there is no `node`
  to make it with.

The bundle must target the architecture of the image being built. Both the
preflight and the image's own verification layer refuse a mismatch rather than
producing an image that builds, starts, and then dies on the first uploaded
photograph.

`--skip-bundle` is the same flag under its older name.

The plain Docker equivalent, if you would rather not use the script — note that
the first line is not optional, because `Dockerfile` copies `dist-portal/` and
fails immediately when it is absent:

```bash
node scripts/build-production-bundle.mjs
docker build -t csistmarkscmsportal:latest .
```

The script does three things the raw command does not: it checks that `snapshot/`
is present before starting — building without it produces an image that runs and
shows an empty portal, which looks like a bug and is actually a missing step —
it prints what the snapshot contains so you can see the data went in, and it runs
the preflight below.

### Preflight

```bash
node scripts/preflight-image.mjs        # or: npm run preflight
```

Everything the image's own verification layer checks, a second after the bundle
is built instead of two minutes into a build — plus the three things a Dockerfile
cannot see: CRLF in `docker/launch.sh` (which makes the container exit claiming
the entrypoint does not exist), native binaries left over from the build machine
(which fail on the first uploaded image, nowhere near the cause), and a `.env`
left in `dist-portal/` that would be baked into a layer and pushed with it.

Each failure prints the command that fixes it.

### Line endings

`.gitattributes` pins `*.sh` to LF, so a `git clone` on any platform produces
scripts the container can execute. That covers the normal case.

It does not cover a folder copied by hand — a zip, a USB stick, a Windows share.
If that is how this arrived and the build fails with `launch.sh: not found` or
`\r: No such file or directory`, the scripts picked up CRLF on the way over:

```bash
sudo apt install -y dos2unix
dos2unix scripts/build-image.sh docker/launch.sh
```

`node scripts/preflight-image.mjs` detects it before the build does.

---

## 2. Verify before publishing

### Before an image exists at all

```bash
npm run test:bundle        # node .bundle-e2e.mjs
```

Because the application is compiled outside the container, it can be tested
outside one too. This starts a throwaway MongoDB, runs `dist-portal/start.mjs`
exactly as the container's entrypoint does, and checks the whole surface on one
port: the snapshot restored with real documents, the restore staying idempotent
on a second run, the CMS and its static assets served, a bundled upload
fetchable under `/uploads`, `{{MEDIA}}` resolved to the request origin, and the
church's own administrator account present and active.

It finishes by running the full Website contract suite
(`scripts/check-website-api.mjs`, 53 checks) against that same process — so
every endpoint the public website consumes is verified for both status *and
shape* before a single image layer is written.

Note that it runs the bundle on *this* machine, so it needs a bundle built for
it: `TARGET_OS=win32 node scripts/build-production-bundle.mjs` on Windows,
or the default on Linux. Rebuild for `linux` before building the image —
`preflight-image.mjs` refuses a bundle that targets anything else.

### Then the image itself

Run it locally first. Pushing a broken image and finding out from the
hosting platform is a slow way to learn.

```bash
docker run -d --name portal-test -p 8080:8080 csistmarkscmsportal:latest
docker logs -f portal-test
```

Expected, ending in about 20 seconds:

```
[portal] public origin: http://localhost:8080 (fallback)
[portal] generated JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SEED_ADMIN_PASSWORD — stored in /data/secrets.json
[portal] starting bundled MongoDB (data: /data/db)
[portal] bundled MongoDB ready
[portal] restoring snapshot…
✓ Media: 376 installed, 0 already present
✓ users: restored 1 document(s)
✓ media: restored 96 document(s)
✓ gallery_albums: restored 6 document(s)
   … 12 collections in total
[portal] starting API on 127.0.0.1:4000
[portal] starting CMS on 127.0.0.1:3001
[portal] listening on :8080
```

Then check each part actually works:

```bash
# API is up and the database is connected
curl -s localhost:8080/v1/health

# Real content came through — expect 6 albums
curl -s localhost:8080/v1/gallery | head -c 400

# Media URLs follow the origin the request arrived on
curl -s -H 'X-Forwarded-Host: portal.example.org' -H 'X-Forwarded-Proto: https' \
     localhost:8080/v1/gallery | grep -o 'https://portal.example.org/uploads/[^"]*' | head -3

# CORS answers any origin
curl -s -o /dev/null -D - -H 'Origin: https://anything.test' \
     localhost:8080/v1/gallery | grep -i access-control-allow-origin

# An uploaded image is really served
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' \
     "localhost:8080/uploads/$(curl -s localhost:8080/v1/gallery \
     | grep -o 'uploads/images/[^"]*' | head -1 | cut -d/ -f2-)"

# Signing in with the church's existing account
curl -s -X POST localhost:8080/v1/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"admin@csistmarksmadipakkam.org","password":"ChangeMe@123"}' \
     | head -c 120
```

Open `http://<vm-ip>:8080` in a browser and sign in. The CMS calls the API on
its own origin, so it works from any address the VM answers on without changes.

Clean up:

```bash
docker rm -f portal-test
```

---

## 3. Push to Docker Hub

Full walkthrough, including the private-repository check, is in
**[PUSH.md](PUSH.md#3-push-to-docker-hub)**. The short version:

**Create the repository as private on hub.docker.com first.** Docker Hub creates
one implicitly on first push if it does not exist, and an implicitly created
repository is *public* — this image carries the church's database.

```bash
export DH_USER=your-dockerhub-username
export DH_TOKEN=dckr_pat_xxxxxxxxxxxxxxxx   # Account Settings → Personal access tokens

echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin

docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:1.5
docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:latest

docker push $DH_USER/csistmarkscmsportal:1.5
docker push $DH_USER/csistmarkscmsportal:latest
```

Deploy from `1.5`, not `latest` — a fixed tag means a restart gets the image you
tested rather than whatever was pushed since.

### Both architectures in one tag

Needed if the image will run on ARM hardware — a Raspberry Pi, an Apple Silicon
Mac, AWS Graviton — as well as ordinary x86 servers.

```bash
./scripts/build-image.sh --multi-arch --push $DH_USER/csistmarkscmsportal:1.5
```

This builds `linux/amd64` and `linux/arm64`. The non-native half runs under QEMU
emulation and takes considerably longer — ten to twenty minutes rather than
three. It pushes directly and cannot also load into the local daemon, because a
manifest list covering two architectures is not something a Docker daemon can
hold; only a registry can.

One-time setup for emulation, if the VM has never done a cross-build:

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

### Deploying without a registry

For a one-off move to a machine you can reach directly:

```bash
docker save csistmarkscmsportal:latest | gzip > csistmarkscmsportal.tar.gz
scp csistmarkscmsportal.tar.gz user@target:/tmp/
ssh user@target 'gunzip -c /tmp/csistmarkscmsportal.tar.gz | docker load'
```

---

## 4. Run it properly

With volumes, so the church's edits survive a restart:

```bash
# Private image, so the target authenticates too.
echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin

docker run -d --name portal --restart unless-stopped \
  -p 8080:8080 \
  -v portal-data:/data \
  -v portal-uploads:/app/backend/uploads \
  $DH_USER/csistmarkscmsportal:1.5
```

Or with compose, which sets both up for you:

```bash
docker compose up -d
```

Without volumes the container still works — it simply returns to the baked-in
snapshot each time it is recreated. That is right for a demonstration and wrong
for the live portal.

---

## Rebuilding after a code change

```bash
git pull                       # or re-copy the folder
./scripts/build-image.sh
docker rm -f portal
docker run -d --name portal --restart unless-stopped -p 8080:8080 \
  -v portal-data:/data -v portal-uploads:/app/backend/uploads \
  csistmarkscmsportal:latest
```

The volumes are kept, so the database and uploaded media carry over untouched.
The restore step sees the collections are already populated and leaves them
alone — the snapshot is a starting point, never a reset.

---

## If a build fails

**`snapshot/ is missing`** — the data was not copied across. `snapshot/` is
about 15 MB and some transfer methods skip it. Check `ls snapshot/db` shows
twelve `.json` files.

**Killed during `next build`** — out of memory. Give the VM more RAM, or add
swap:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

**`npm ci` fails to reach the registry** — the VM has no outbound DNS or is
behind a proxy. The build genuinely needs internet: it downloads dependencies
and the Node runtime.

**`mongod` exits with "illegal instruction"** — MongoDB 5.0 and later require
AVX on x86-64, which very old Celeron and Atom CPUs lack. That hardware needs an
external database; see [DEPLOY.md](docker/DEPLOY.md#using-an-external-database).

More, including runtime problems, in
[docker/DEPLOY.md](docker/DEPLOY.md#troubleshooting).
