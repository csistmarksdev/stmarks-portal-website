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
| Documents | 567 across 12 collections |
| Media | 261 files, 13.6 MB |
| Accounts | the existing administrator, password hash intact |
| Gallery | 6 albums, including their YouTube video links |
| Also included | the full audit trail and contact messages |

Captured from the live database on 2026-07-27. To take a newer snapshot, see
[Refreshing the data](docker/DEPLOY.md#refreshing-the-data).

> The snapshot contains real password hashes and the church's audit trail. Treat
> a built image the way you would a database backup — **push it to a private
> registry only**.

---

## Prerequisites on the build VM

Docker, and about 4 GB of RAM. Nothing else — Node, npm and MongoDB are not
needed on the host, because everything is compiled inside the build stage.

```bash
docker --version          # 20.10 or newer
docker buildx version     # only needed for multi-architecture builds
free -m                   # the Next.js compile wants ~2 GB free
```

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

Roughly 3–6 minutes on a first build; under a minute afterwards, because the
dependency layer is cached until `package-lock.json` changes.

The plain Docker equivalent, if you would rather not use the script:

```bash
docker build -t csistmarkscmsportal:latest .
```

The script does two things the raw command does not: it checks that `snapshot/`
is present before starting — building without it produces an image that runs and
shows an empty portal, which looks like a bug and is actually a missing step —
and it prints what the snapshot contains so you can see the data went in.

### Line endings

If the folder came from Windows and the build fails with
`launch.sh: not found` or `\r: No such file or directory`, the shell scripts
picked up CRLF line endings on the way over:

```bash
sudo apt install -y dos2unix
dos2unix scripts/build-image.sh docker/launch.sh
```

---

## 2. Verify before publishing

Run it locally on the VM first. Pushing a broken image and finding out from the
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
✓ Media: 261 installed, 0 already present
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

docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:1.0
docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:latest

docker push $DH_USER/csistmarkscmsportal:1.0
docker push $DH_USER/csistmarkscmsportal:latest
```

Deploy from `1.0`, not `latest` — a fixed tag means a restart gets the image you
tested rather than whatever was pushed since.

### Both architectures in one tag

Needed if the image will run on ARM hardware — a Raspberry Pi, an Apple Silicon
Mac, AWS Graviton — as well as ordinary x86 servers.

```bash
./scripts/build-image.sh --multi-arch --push $DH_USER/csistmarkscmsportal:1.0
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
  $DH_USER/csistmarkscmsportal:1.0
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
