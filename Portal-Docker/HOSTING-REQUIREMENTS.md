# Hosting requirements — CSI St. Mark's Portal

What the host machine must provide to run `stmarksdev/csistmarkscmsportal`.

This is one container. It carries its own database (MongoDB 8.0), the built CMS,
the API, and a snapshot of the church's content, media and accounts. The host
does **not** need Node, npm, MongoDB, a web server, or the source code.

Operating instructions are in [DEPLOY-AND-TEST.md](DEPLOY-AND-TEST.md) and
[docker/DEPLOY.md](docker/DEPLOY.md); ready-made configuration for Render,
Railway, Fly.io and Heroku is in [deploy/](deploy/README.md). This file is only
the shopping list.

---

## 1. Summary

| | requirement |
|---|---|
| Runtime | Docker Engine 20.10+ (or Podman 4+), Linux host |
| CPU | 2 cores recommended, 1 minimum — **x86-64 with AVX**, or arm64 |
| RAM | 1 GB for the container, so ≥ 2 GB on the machine |
| Disk | 5 GB free, on real (non-ephemeral) storage |
| Inbound port | one TCP port → container `8080` |
| Persistent storage | two mounts: `/data` and `/app/backend/uploads` |
| Outbound network | HTTPS to the registry, at pull time only |
| Registry access | the image is **private** — credentials required |
| Privileges | container starts as root, then drops; no read-only rootfs |

---

## 2. Container runtime

Docker Engine 20.10 or newer, with `docker compose` (v2) if the compose file is
used. Podman 4+ works. Any Linux distribution.

ZimaOS, CasaOS, Portainer, Unraid, Synology Container Manager, Proxmox LXC with
Docker, or a plain VPS are all fine. Windows and macOS Docker Desktop will run
it, but neither is appropriate for the live parish portal.

**ZimaOS / CasaOS hosts must import [docker-compose.zimaos.yml](docker-compose.zimaos.yml)**,
not the general one — their importer does not expand `${VAR}` syntax and will
store the literal text, which boot-loops the container with no obvious cause.

---

## 3. CPU

Two cores is comfortable; one works. The container never compiles anything at
runtime — the CMS is built into the image — so CPU only matters during the
20–40 second first boot and under request load.

**AVX is mandatory on x86-64.** MongoDB 5.0 and later refuse to run without it,
and `mongod` exits with "illegal instruction". Very old Celeron and Atom chips,
and some minimal VPS CPU models, lack it. Verify before committing to hardware:

```bash
grep -o avx /proc/cpuinfo | head -1     # must print "avx"
```

A host without AVX can still run the Portal, but only pointed at an external
database (`MONGODB_URI`), which is a different deployment.

arm64 (Raspberry Pi 5, Ampere, Apple silicon) has no AVX requirement. Confirm
the published tag covers the host's architecture before provisioning:

```bash
docker manifest inspect stmarksdev/csistmarkscmsportal:1.5
```

If that returns a single-architecture manifest, the image must be rebuilt with
`./scripts/build-image.sh --multi-arch` for the other platform.

---

## 4. Memory

**1 GB allocated to the container**, which is the limit set in both compose
files. MongoDB's WiredTiger cache is already capped at 256 MB inside the image,
so the gigabyte is headroom rather than a target.

Leave the host at least 2 GB total so the OS and Docker itself have room. On a
512 MB box the container will be OOM-killed shortly after starting.

256 MB is the floor for MongoDB's cache — `--wiredTigerCacheSizeGB` will not
accept less. A host that cannot spare it needs an external database.

---

## 5. Disk

**5 GB free**, as a conservative allowance covering the image, its layers, and
room to pull an upgrade tag alongside the running one before switching over.
Confirm the actual pulled size on the host with `docker image ls` and adjust.

The data itself is small and grows slowly: the shipped snapshot is ~15 MB in
total — 577 documents and 376 media files. Growth is whatever the parish uploads afterwards —
photographs and the occasional video, at 15 MB and 200 MB per-file ceilings.

The storage must be **persistent block or file storage, not ephemeral**. This
rules out Google Cloud Run (in-memory filesystem, aggressively recycled
instances) and AWS App Runner for anything but a read-mostly demonstration.

---

## 6. Persistent volumes

Two mounts. Both are required for a real deployment.

| container path | holds | consequence of not mounting |
|---|---|---|
| `/data` | MongoDB database, secrets generated on first boot | every edit is lost on restart; everyone is signed out |
| `/app/backend/uploads` | media uploaded through the CMS | uploaded photographs vanish on restart |

Without them the container still runs correctly — it simply returns to the
baked-in snapshot each time it is recreated. That is right for a demonstration
and wrong for the church's live portal.

Named Docker volumes are fine. Bind mounts are fine (ZimaOS uses
`/DATA/AppData/portal/...`). Network storage — NFS, SMB, Azure Files — works for
`uploads`; for `/data` prefer local storage, since MongoDB on a network share is
a known source of trouble.

**These two volumes are the entire backup surface.** Whatever backup scheme the
host runs must include them; nothing else on the machine holds parish data.

---

## 7. Networking

Publish one host port to container port **8080**. That single port serves
everything: `/v1` and `/uploads` route to the API, everything else to the CMS.

Outbound internet is needed only to pull the image. The running container makes
no outbound calls unless `WEBSITE_REVALIDATE_URL` is configured, in which case
it must reach the public website's host.

### If a reverse proxy or TLS terminator sits in front

Public deployments should terminate HTTPS at a proxy (nginx, Caddy, Traefik,
Cloudflare Tunnel). Two things must be right:

- **Forward `X-Forwarded-Proto` and `X-Forwarded-Host`.** The container rewrites
  media URLs to the requesting origin on every response. Without these headers
  it emits `http://` URLs on an `https://` page and the browser blocks them as
  mixed content.
- **Raise the request body limit to at least 200 MB** — nginx's
  `client_max_body_size` defaults to 1 MB, which fails every video upload and
  most image uploads. Match the container's own ceilings (`MAX_UPLOAD_MB=15`,
  `MAX_VIDEO_UPLOAD_MB=200`) or whatever they are set to.

Also allow a generous proxy read timeout; the first boot restores 577 documents
and 376 media files before anything listens.

---

## 8. Registry credentials

The image is private. **Every machine that pulls it must authenticate**, and the
host person needs credentials before they can do anything at all:

```bash
docker login -u stmarksdev
```

Use a Docker Hub **access token** as the password, never the account password.
Managed platforms have their own field for this — Render calls it a Credential,
Azure takes `--registry-username` / `--registry-password`.

If the host is a third party who should not hold the account token, the
alternatives are a read-only scoped token, or exporting the image with
`docker save` and handing over the tarball for `docker load`.

---

## 9. Privileges and platform restrictions

The container starts as root solely to fix ownership of a freshly mounted
volume, then drops to an unprivileged user. Nothing that serves a request runs
as root. It needs no capabilities beyond the Docker default, no `--privileged`,
and no host devices.

A platform that forces an arbitrary non-root UID (OpenShift, and any Kubernetes
with a restricted security context) is supported by the image: its writable
directories are owned by group 0 and group-writable, which is the group those
platforms put the imposed UID in, and the entrypoint skips the ownership fix
when it is already unprivileged.

The volume is the part that still needs attention there. A freshly provisioned
one arrives owned by `root:root` with no group write, and no process in the
container has the privilege to correct it — so set `fsGroup: 0` in the pod's
security context (OpenShift's default `restricted-v2` SCC does this) and the
mount arrives writable. Without it `mongod` exits on its first write to
`/data/db`, which reads as a broken image rather than a missing field.

It will **not** work with a read-only root filesystem. MongoDB and both Node
processes need their writable paths, and `/data` alone is not enough.

Set a restart policy of `unless-stopped`.

Allow a **120-second healthcheck grace period** (`start_period`). Both compose
files set this. A shorter one causes the orchestrator to kill and retry a
container that is doing exactly what it was told to.

---

## 10. Configuration the host must supply

Every environment variable is optional — the container generates its own secrets
on first boot and allows any origin by default, so an empty machine comes up as
a working portal. These are the ones worth setting once the domain is settled:

| variable | why |
|---|---|
| `PUBLIC_URL` | the canonical public origin handed to the website; auto-detected on most platforms |
| `CORS_ORIGINS` | narrows the default `*` to the real site origins |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 32+ characters, different from each other; set them to keep sessions alive across a volume reset |
| `WEBSITE_REVALIDATE_URL` / `WEBSITE_REVALIDATE_SECRET` | without these, publishing in the CMS does not immediately refresh the public site |

The full list with defaults is in [docker/bundle.env.example](docker/bundle.env.example).

---

## 11. Acceptance test

The host is correctly provisioned when all three pass.

```bash
# 1. It is up and healthy.
curl -s http://<host>:8080/v1/health

# 2. The full contract suite — 53 checks against every endpoint
#    the public website consumes.
docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080

# 3. Data actually persists. Edit something in the CMS first, then:
docker restart portal && sleep 30
docker logs portal | grep -i "already populated"
```

Expect `53/53 checks passed`, and
`Database already populated (11 collection(s) left untouched)`.

If step 3 instead restores everything again, the volumes are not attached and
every change the parish makes will be lost on the next restart. That is the
check that matters most and the one nobody runs.
