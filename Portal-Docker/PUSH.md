# Building and pushing `csistmarkscmsportal`

Copy-paste commands for the Linux VM. Run them in order.

Image name: **`csistmarkscmsportal`**

> **Private registry only.** The image contains the church's real database —
> including the administrator's password hash, 425 audit-log entries and a
> contact message from a real person. Treat it as a database backup.

---

## 0. Check the VM once

```bash
docker --version          # 20.10+
node --version            # 20+ — this VM compiles the application, not the image
docker buildx version     # only needed for --multi-arch
free -m                   # want ~2 GB free for the Next.js compile
df -h /var/lib/docker      # want ~5 GB free
```

Node is on that list because the build happens **outside** the container: the
application is compiled here into `dist-portal/`, and the image copies it in.
That is what keeps the image build cheap enough for a small machine. If this VM
has no Node:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

`node_modules/` does **not** need to be copied across — nobody should, it is
hundreds of megabytes of the wrong platform's binaries. The first build installs
dependencies itself, which needs a few minutes and outbound access to the npm
registry. Every build after that skips the step.

If `docker` needs `sudo` every time:

```bash
sudo usermod -aG docker "$USER" && newgrp docker
```

If the folder came from Windows, normalise the shell scripts — otherwise the
build fails with `launch.sh: not found`, which is a CRLF problem wearing a
misleading error message:

```bash
sudo apt install -y dos2unix
cd ~/Portal-Docker
dos2unix scripts/build-image.sh docker/launch.sh
chmod +x scripts/build-image.sh docker/launch.sh
```

Confirm the data actually came across — it is 15 MB and some transfer methods
silently skip it:

```bash
cd ~/Portal-Docker
ls snapshot/db | wc -l          # expect 13  (12 collections + _manifest.json)
du -sh snapshot/uploads         # expect ~15M
cat snapshot/db/_manifest.json  # 577 documents, 376 uploads
```

---

## 1. Build

```bash
cd ~/Portal-Docker
./scripts/build-image.sh
```

First build on a fresh machine: 6–12 minutes, most of it the one-off `npm ci`
and the Next.js compile. Later builds: a couple of minutes, and under a minute
with `--use-dist-portal` when only the packaging changed.

### If this VM has no Node — or you would rather not compile on it

Compile on a machine that has Node, copy the resulting folder across, and this
VM turns it into an image with Docker alone:

```bash
# where the source and Node are
node scripts/build-production-bundle.mjs
rsync -a dist-portal/ jero@vm:~/Portal-Docker/dist-portal/     # ~155 MB

# on the VM: Docker only, no Node, no npm, no node_modules
cd ~/Portal-Docker
./scripts/build-image.sh --use-dist-portal
```

About a minute, and it is the same image byte for byte. The bundle carries its
own copy of the snapshot, so the VM does not need `snapshot/` either.

One rule: the bundle must target the architecture of the image being built —
`TARGET_CPU=arm64` for an ARM host. The preflight and the image's own
verification both refuse a mismatch rather than producing something that builds,
starts, and dies on the first uploaded photograph.

Plain equivalent, if you prefer — the first line is not optional, because
`Dockerfile` copies `dist-portal/` and compiles nothing:

```bash
node scripts/build-production-bundle.mjs
docker build -t csistmarkscmsportal:latest .
```

The script adds three things: it refuses to build without `snapshot/` (which
would produce an image that runs and shows an empty portal — a bug that looks
like a code problem and is actually a missing file), it prints what the snapshot
contains, and it runs `scripts/preflight-image.mjs` so a bundle built for the
wrong architecture is caught before the daemon is touched rather than two
minutes into the build.

Check the result:

```bash
docker images csistmarkscmsportal
```

---

## 2. Test locally before pushing

```bash
docker run -d --name portal-test -p 8080:8080 csistmarkscmsportal:latest
docker logs -f portal-test        # Ctrl-C once you see "listening on :8080"
```

Expected on a **first** boot, in about 20–30 seconds:

```
[portal] configuration: no .env file — reading the environment only
[portal] public origin: http://localhost:8080 (fallback)
[portal] generated JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SEED_ADMIN_PASSWORD — stored in /data/secrets.json
[portal] starting bundled MongoDB (data: /data/db)
[portal] bundled MongoDB ready
[portal] restoring snapshot…
✓ Media: 376 installed, 0 already present
· Snapshot captured 2026-08-13T12:46:24.348Z
✓ announcements: restored 6 document(s)
✓ audit_logs: restored 425 document(s)
✓ blog_posts: restored 10 document(s)
✓ church_singletons: restored 8 document(s)
✓ contact_messages: restored 1 document(s)
✓ events: restored 6 document(s)
✓ fellowships: restored 7 document(s)
✓ gallery_albums: restored 6 document(s)
✓ leaders: restored 1 document(s)
✓ media: restored 96 document(s)
✓ users: restored 1 document(s)
✓ Restored 11 collection(s); 0 already had data
[portal] initializing data…
· Administrator admin@csistmarksmadipakkam.org already exists
· No bundled media to install
· No bundled content to install
[portal] starting API on 127.0.0.1:4000
[portal] starting CMS on 127.0.0.1:3001
[portal] listening on :8080
[portal]   API   /v1  and  /uploads
[portal]   CMS   everything else
```

Three lines that look like problems and are not:

- **`Restored 11`, not 12.** `downloads` is genuinely empty in the live
  database, so there is nothing to insert.
- **`No bundled media / content to install`.** That is the *old* seed-data
  path, which the image deliberately does not ship — the snapshot replaced it.
- **`Administrator … already exists`.** Correct: the account came from the
  snapshot, so the generated `SEED_ADMIN_PASSWORD` is never used.

The API also prints one warning at every boot, about `CORS_ORIGINS` being `*`.
That is intended — see [DEPLOY.md](docker/DEPLOY.md#cors--open-to-everything-by-default).

On a **second** boot, the restore finds every collection populated and prints
`· Database already populated (11 collection(s) left untouched)` with
`Media: 0 installed, 376 already present`. Nothing is overwritten.

Then run every check at once:

```bash
BASE=http://localhost:8080

echo "--- health ---"
curl -s $BASE/v1/health; echo

echo "--- content (expect 6 albums, 10 posts, 6 events) ---"
for p in gallery blog events fellowships announcements; do
  printf '%-16s %s\n' "$p" "$(curl -s $BASE/v1/$p | head -c 60)"
done

echo "--- CORS is a literal wildcard for any origin ---"
curl -s -o /dev/null -D - -H 'Origin: https://csistmarksmadipakkam.org' \
  $BASE/v1/gallery | grep -i 'access-control-allow-origin'

echo "--- preflight (what the browser sends first) ---"
curl -s -o /dev/null -D - -X OPTIONS \
  -H 'Origin: https://csistmarksmadipakkam.org' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization,content-type' \
  $BASE/v1/gallery | grep -i 'HTTP/\|access-control'

echo "--- an uploaded image really serves ---"
IMG=$(curl -s $BASE/v1/gallery | grep -o 'http[^"]*\/uploads\/[^"]*' | head -1)
echo "$IMG"
curl -s -o /dev/null -w 'status=%{http_code} type=%{content_type} bytes=%{size_download}\n' "$IMG"

echo "--- login with the church's existing account ---"
curl -s -X POST $BASE/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@csistmarksmadipakkam.org","password":"ChangeMe@123"}' | head -c 100; echo

echo "--- the CMS itself ---"
curl -s -o /dev/null -w 'CMS status=%{http_code}\n' $BASE/login
```

You want: `status ok`, JSON from every content route,
`access-control-allow-origin: *`, `HTTP/1.1 204` on the preflight, a non-zero
image, a token from login, and `CMS status=200`.

Open `http://<vm-ip>:8080` in a browser and sign in. The CMS calls the API on
its own origin, so it works from any address the VM answers on.

Clean up:

```bash
docker rm -f portal-test
```

---

## 3. Push to Docker Hub

### Create the repository as **private**, first

Go to **hub.docker.com → Repositories → Create repository**:

- Name: `csistmarkscmsportal`
- Visibility: **Private**

Do this before pushing, not after. Docker Hub creates a repository implicitly on
first push if one does not exist, and an implicitly created repository is
**public** — the church's database would be world-pullable for however long it
takes you to notice. The free plan includes one private repository, which is
exactly what this needs.

### If you use `sudo docker`, log in with `sudo` too

`docker login` writes credentials to `$HOME/.docker/config.json`. Under `sudo`,
`$HOME` is `/root`, so a login done as your own user is invisible to
`sudo docker push` — the push goes out anonymous and fails with
`insufficient_scope: authorization failed`, which reads like a permissions
problem with the repository rather than a missing login.

The image itself is unaffected: both clients talk to the same daemon, so a build
made with `sudo` is visible without it and vice versa. Only the credentials are
per-user.

Better to remove `sudo` from the picture entirely:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

Everything below then works without `sudo`. If you would rather keep using it,
prefix `docker login` with `sudo` as well and stay consistent.

### Log in with an access token, not your password

**Account Settings → Personal access tokens → Generate new token**, with
**Read & Write** permissions.

```bash
export DH_USER=your-dockerhub-username
export DH_TOKEN=dckr_pat_xxxxxxxxxxxxxxxx

echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
```

A token can be revoked on its own and does not unlock the account, which matters
more than usual here: `docker login` writes the credential to
`~/.docker/config.json` in plain base64 on a VM you may not keep.

### Tag and push

```bash
docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:1.5
docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:latest

docker push $DH_USER/csistmarkscmsportal:1.5
docker push $DH_USER/csistmarkscmsportal:latest
```

Two tags on purpose. `1.5` is the one to deploy — it never moves, so a host that
restarts gets the image you tested. `latest` is a convenience pointer that will
be reassigned by the next push; deploying from it means a restart can silently
change what runs.

### Confirm it is actually private

```bash
docker logout
docker manifest inspect $DH_USER/csistmarkscmsportal:1.5 2>&1 | head -3
```

You want this to **fail** with `unauthorized` or `denied`. If it prints a
manifest, the repository is public — fix the visibility in
**Repository → Settings → Make private** and rotate the admin password, since
the image carries its hash.

Log back in afterwards:

```bash
echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
```

### Both CPU architectures in one tag

Only needed if it will run on ARM — a Raspberry Pi, Apple Silicon, AWS Graviton
— as well as ordinary x86 servers. Skip it otherwise.

One-time, if this VM has never cross-built:

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

Then:

```bash
./scripts/build-image.sh --multi-arch --push $DH_USER/csistmarkscmsportal:1.5
```

The non-native half runs under QEMU emulation — expect 15–25 minutes rather than
5. It pushes directly and cannot also load into the local daemon: a manifest
list covering two architectures is not something a Docker daemon can hold, only
a registry can.

### Moving it without a registry

Useful alongside Docker Hub rather than instead of it — for a target you can
reach directly, or one with no outbound internet:

```bash
docker save csistmarkscmsportal:latest | gzip > csistmarkscmsportal.tar.gz
scp csistmarkscmsportal.tar.gz user@target:/tmp/
ssh user@target 'gunzip -c /tmp/csistmarkscmsportal.tar.gz | docker load'
```

Note this does not work for Render, Railway or Azure Container Apps — those can
only deploy from a registry.

---

## 4. Pull and run on the target

```bash
# The image is private, so the target must authenticate too.
echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
docker pull $DH_USER/csistmarkscmsportal:1.5

docker run -d --name portal --restart unless-stopped \
  -p 8080:8080 \
  -v portal-data:/data \
  -v portal-uploads:/app/backend/uploads \
  $DH_USER/csistmarkscmsportal:1.5
```

On a hosting platform rather than a shell, the same credentials go in whatever
it calls registry authentication — Render's "Credential", Railway's registry
login, Azure's `--registry-username`/`--registry-password`. Use the access
token as the password there too, never the account password.

The two volumes are what make the church's edits survive a restart. Without
them the container still works and simply returns to the baked-in snapshot each
time it is recreated — right for a demo, wrong for the live portal.

Nothing else is required. Set these only when you want them:

```bash
-e PUBLIC_URL=https://portal.csistmarksmadipakkam.org   # once you have a domain
-e CORS_ORIGINS=https://csistmarksmadipakkam.org        # to stop allowing everything
-e MONGODB_URI=mongodb+srv://…                          # to use a managed database
```

Per-platform notes (Render, Railway, Azure, Fly, AWS, ZimaOS) are in
[docker/DEPLOY.md](docker/DEPLOY.md#platform-guides).

---

## 5. Updating later

After a code change:

```bash
cd ~/Portal-Docker
./scripts/build-image.sh
docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:1.6
docker tag csistmarkscmsportal:latest $DH_USER/csistmarkscmsportal:latest
docker push $DH_USER/csistmarkscmsportal:1.6
docker push $DH_USER/csistmarkscmsportal:latest
```

A new version number each time, rather than overwriting `1.5`. That is what
lets you put the previous image back in one command when a change turns out to
be wrong — with a single moving tag there is nothing to go back to.

On the target:

```bash
docker pull $DH_USER/csistmarkscmsportal:1.6
docker rm -f portal
docker run -d --name portal --restart unless-stopped -p 8080:8080 \
  -v portal-data:/data -v portal-uploads:/app/backend/uploads \
  $DH_USER/csistmarkscmsportal:1.6
```

Rolling back is the same command with the old number:

```bash
docker rm -f portal
docker run -d --name portal --restart unless-stopped -p 8080:8080 \
  -v portal-data:/data -v portal-uploads:/app/backend/uploads \
  $DH_USER/csistmarkscmsportal:1.5
```

Safe because the volumes are untouched by either direction — the database is not
part of the image once it has been restored once.

The volumes are reused, so the database and uploaded media carry over untouched.
The restore step sees the collections are already populated and leaves them
alone — the snapshot is a starting point, never a reset.

To ship **newer data** instead of newer code, re-capture first (from a machine
that can reach the live database) and then rebuild:

```bash
cd /path/to/Portal
PORTAL_ROOT=/path/to/Portal-Docker node /path/to/Portal-Docker/scripts/capture-live-data.mjs
```

---

## If something fails

| symptom | cause |
|---|---|
| `snapshot/ is missing` | The 15 MB `snapshot/` folder did not transfer. Re-copy it. |
| `launch.sh: not found` | CRLF line endings. `dos2unix scripts/build-image.sh docker/launch.sh` |
| Build killed during `next build` | Out of memory. Add swap (below) or give the VM more RAM. |
| `npm ci` cannot reach the registry | No outbound DNS, or a proxy. The build genuinely needs internet. |
| `docker: permission denied` | Not in the `docker` group. `sudo usermod -aG docker "$USER" && newgrp docker` |
| `insufficient_scope: authorization failed` on push | Almost always `sudo docker push` after a non-`sudo` `docker login` — the credentials live in `$HOME/.docker`, and `sudo` changes `$HOME` to `/root`. Check with `sudo docker info \| grep -i username`. Otherwise: the token is read-only (needs **Read & Write**), or the repository does not exist yet. |
| `denied: requested access to the resource is denied` on push | The tag does not start with your Docker Hub username or organisation, or you are not logged in. |
| Pushing to an organisation account fails despite a valid token | The token carries your user's permissions. Your user needs write access to that organisation's repository. |
| Push succeeds but the repo shows as public | It was created implicitly by the push. Set it private in **Repository → Settings**, then rotate the admin password — the image carries its hash. |
| `toomanyrequests` on pull | Docker Hub's anonymous pull rate limit. Log in on the target: authenticated pulls have a far higher limit. |
| `mongod: illegal instruction` at runtime | The CPU has no AVX (very old Celeron/Atom). MongoDB 5.0+ requires it — use an external database on that hardware. |
| Container restarts repeatedly | `docker logs portal`. Most often a `/data` volume the container cannot write. |

Swap, for a build that runs out of memory:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

Runtime problems are covered in
[docker/DEPLOY.md](docker/DEPLOY.md#troubleshooting).
