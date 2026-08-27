# AWS EC2 — Portal demo deployment

The Portal, on one Ubuntu EC2 instance, reachable at `http://<EC2_PUBLIC_IP>:8080`.

Nothing else: no ECS, no EKS, no ALB, no RDS, no CloudFront. One instance, one
container, Docker Engine and the Compose plugin.

```
AWS EC2  (Ubuntu 24.04, x86_64 or arm64)
<EC2_PUBLIC_IP>
      |
      +-- :8080  ->  container :8080   portal
                        |-- admin CMS       /
                        |-- API             /v1/*
                        |-- Swagger         /docs*   (off by default)
                        |-- uploaded media  /uploads/*
                        +-- MongoDB         127.0.0.1:27017, inside the container
```

## What the Portal actually is

A workspace of three packages that deploys as **one image**:

| Package | What it is | Where it ends up |
|---|---|---|
| `shared/` | types and constants shared by the other two | compiled into the backend |
| `backend/` | NestJS API — content, auth, media, backups | container, internal `127.0.0.1:4000` |
| `frontend/` | Next.js admin CMS | container, internal `127.0.0.1:3001` |

A router inside the container ([`docker/entrypoint.mjs`](docker/entrypoint.mjs))
binds `0.0.0.0:8080` and serves the CMS with the API proxied beneath it, so
there is one origin and no CORS between the two halves. The API and the CMS bind
to loopback *inside* the container and are unreachable from the host — which is
why only one port is published.

**Services required for the demo: one.** The image also carries its own MongoDB
and a snapshot of the church's content, media and accounts, so there is no
database to provision, and no Redis, queue or reverse proxy to add.

**Internal container port: 8080.** Set by `ENV PORT=8080` and declared by
`EXPOSE 8080` in [`Dockerfile.source`](Dockerfile.source). **Published on the
host: 8080.** A matched pair, not a coincidence to rely on — if `PORT` ever
changes, `ports:` in the compose file has to change with it.

**Database ports published: none.** MongoDB listens on `127.0.0.1:27017` inside
the container.

---

## 1. Instance and Security Group

| | |
|---|---|
| OS | Ubuntu 24.04 LTS |
| Size | 2 vCPU / 4 GiB (t3.small) minimum if you build on the instance |
| Disk | 20 GB or more |
| Login | `ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>` |

Inbound rules — EC2 → Instances → Security → Security groups → Edit inbound:

| Type | Protocol | Port | Source |
|---|---|---|---|
| SSH | TCP | 22 | your IP, not `0.0.0.0/0` |
| Custom TCP | TCP | 8080 | `0.0.0.0/0` |

Nothing else, and in particular **not 27017**. The default allow-all outbound
rule is enough for Docker Hub, the npm registry and the MongoDB apt repository.

### Swap, if you build on the instance

The Next.js build inside the image wants roughly 2 GB. On a 4 GiB box give it
somewhere to overflow, once:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## 2. Install Docker on Ubuntu EC2

Docker's own repository, which is where the Compose v2 plugin comes from.
Ubuntu's `docker.io` package does not include it.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Run Docker without `sudo`, and make sure it comes back after an instance reboot:

```bash
sudo usermod -aG docker ubuntu
sudo systemctl enable --now docker
newgrp docker          # or log out and back in
```

`systemctl enable docker` is the half of `restart: unless-stopped` that lives
outside the compose file. Without it the daemon does not start on boot, so
nothing restarts the container.

## 3. Verify Docker and Compose

```bash
docker --version
docker compose version         # must be v2 — "docker-compose" v1 is not enough
docker run --rm hello-world
systemctl is-enabled docker    # expect: enabled
```

## 4. Clone or upload the project

```bash
mkdir -p /home/ubuntu/app
git clone <your-remote> /home/ubuntu/app
cd /home/ubuntu/app/Portal-Docker
```

Or push it from your machine, skipping what the build regenerates:

```bash
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude dist --exclude dist-portal --exclude .git \
  -e "ssh -i your-key.pem" \
  ./Portal-Docker/ ubuntu@<EC2_PUBLIC_IP>:/home/ubuntu/app/Portal-Docker/
```

Do not exclude `snapshot/` — that is the church's content and media, and the
image is built from it.

## 5. Configure environment variables

```bash
cd /home/ubuntu/app/Portal-Docker
cp .env.aws.example .env.aws
nano .env.aws
```

Everything in it is optional; the container generates its JWT secrets on first
boot into the `portal-data` volume. Set `PUBLIC_URL` to
`http://<EC2_PUBLIC_IP>:8080` and leave the rest alone for a demo.

`.env.aws` is git-ignored. Never put real secrets in `.env.aws.example`.

| Variable | Required | Default and effect |
|---|---|---|
| `PUBLIC_URL` | worth setting | empty — detected from the request; stored media URLs are rewritten per response either way |
| `CORS_ORIGINS` | worth setting | `*` — any origin may call the API |
| `JWT_ACCESS_SECRET` | no | generated on first boot, kept in `portal-data` |
| `JWT_REFRESH_SECRET` | no | generated on first boot, kept in `portal-data` |
| `SEED_ADMIN_EMAIL` | no | `admin@csistmarksmadipakkam.org`; must not be blank |
| `SEED_ADMIN_PASSWORD` | no | generated; used only if the database has no administrator |
| `MONGO_CACHE_GB` | no | `0.25`, MongoDB's floor, deliberately low |

Two more are deliberately not variables in `.env.aws`:

- **`MONGODB_URI`** is commented out in the compose file rather than defaulted
  to empty. The API reads it with `??`, which does not fall back on an empty
  string, so `MONGODB_URI=""` would hand mongoose an empty connection string and
  kill the container on boot. Uncomment the line and give it a real value to use
  an external database; the bundled MongoDB is then never started.
- **`PORTAL_IMAGE`** is substituted into `image:` before any env file is read,
  so it belongs on the command line. See section 6.

## 6. Build the image

```bash
cd /home/ubuntu/app/Portal-Docker
docker compose --env-file .env.aws -f docker-compose.aws.yml build
```

This compiles the whole workspace inside the builder — `npm ci` across three
packages, then `nest build` and `next build`. Expect **10–20 minutes** and about
2 GB of RAM on a 2 vCPU instance. It only needs Docker; nothing is installed on
the host.

### Faster: pull the published image instead

The build exists so a bare instance needs nothing but Docker. If you would rather
not spend the CPU, run the published image and skip the build entirely.
`PORTAL_IMAGE` is substituted into `image:` before Compose reads any env file, so
it goes on the command line rather than into `.env.aws`:

```bash
docker login -u stmarksdev        # the image is private

export PORTAL_IMAGE=stmarksdev/csistmarkscmsportal:1.5
docker compose --env-file .env.aws -f docker-compose.aws.yml pull
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d --no-build
```

`export` it in the same shell you run the later commands from — or prefix each
one — otherwise `up -d` falls back to the local tag and builds after all.

## 7. Start the Portal

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d
```

First boot restores the bundled snapshot before anything listens, so give it a
minute or two. That is what the healthcheck's 120-second `start_period` is for.

## 8. Check running containers

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml ps
```

Expect `portal` as `running (healthy)` with `0.0.0.0:8080->8080/tcp`. While it
is still restoring the snapshot it reports `running (health: starting)`, which
is correct rather than broken.

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml ps --format json | jq   # if jq is installed
docker inspect --format '{{.State.Health.Status}}' portal
```

## 9. Check logs

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml logs -f
docker compose --env-file .env.aws -f docker-compose.aws.yml logs --tail 100 portal
docker compose --env-file .env.aws -f docker-compose.aws.yml logs --since 10m
```

Logs are capped at 3 × 10 MB by the compose file, so they cannot fill the root
volume.

## 10. Test the Portal locally on EC2

```bash
curl -i http://localhost:8080/v1/health      # the API
curl -I http://localhost:8080/               # the admin CMS
```

Confirm what is actually published, and what is not:

```bash
sudo ss -tlnp | grep 8080
#   expect  0.0.0.0:8080   docker-proxy

sudo ss -tlnp | grep 27017
#   expect NOTHING — MongoDB is inside the container
```

The Website API contract check ships inside the image, so it needs no checkout
and nothing installed:

```bash
docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080
```

## 11. Test externally

```
http://<EC2_PUBLIC_IP>:8080          admin CMS
http://<EC2_PUBLIC_IP>:8080/v1/health   API
```

Answers to `curl` on the instance but not in a browser? That is the Security
Group, essentially every time. Section 1.

## 12. Stop and restart

```bash
# stop, keeping the container
docker compose --env-file .env.aws -f docker-compose.aws.yml stop

# start it again
docker compose --env-file .env.aws -f docker-compose.aws.yml start

# restart in place
docker compose --env-file .env.aws -f docker-compose.aws.yml restart

# stop and remove the container and the network — VOLUMES ARE KEPT
docker compose --env-file .env.aws -f docker-compose.aws.yml down

# apply an edit to .env.aws or the compose file
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d
```

`down` removes the container, not the named volumes, so the database, the
uploaded media and the generated secrets survive. `up -d` after it picks them
straight back up.

**`down -v` destroys the database, every photograph uploaded since deployment,
and the generated secrets.** It is not in any script here for that reason. The
next `up -d` would restore the snapshot baked into the image — the demo comes
back, without anything added since.

## 13. Update and redeploy

```bash
cd /home/ubuntu/app && git pull
cd Portal-Docker
docker compose --env-file .env.aws -f docker-compose.aws.yml build
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d
```

Compose recreates the container against the new image and reattaches the same
volumes, so no data is lost.

Reclaim the disk the old image layers were using:

```bash
docker image prune -f
```

If you are running the published image instead, a new version is one edit to
`PORTAL_IMAGE` in `.env.aws` followed by `pull` and `up -d`. Rolling back is the
same edit in reverse — which is the reason the tag is pinned rather than
`latest`.

---

## Troubleshooting

**The build is killed, or the instance freezes.** Out of memory during
`next build`. Add swap (section 1), or use the published image (section 6).

**`permission denied while trying to connect to the Docker daemon socket`.**
`sudo usermod -aG docker ubuntu`, then log out and back in — a new group
membership does not apply to the session that granted it.

**The container restarts in a loop.**
`docker compose --env-file .env.aws -f docker-compose.aws.yml logs --tail 50 portal`. The API prints
every unsafe production setting at once and refuses to start rather than booting
insecurely — the message names the variable.

**`pull access denied` on `stmarksdev/csistmarkscmsportal`.** That image is
private: `docker login -u stmarksdev`. Or just build, which needs no account.

**Port 8080 already in use.** `sudo ss -tlnp | grep 8080` to find what has it.

**The container is `unhealthy` shortly after starting.** Give it the full
`start_period`; restoring the snapshot takes a while on a small instance. If it
persists, the health route is the thing to check by hand:
`docker exec portal node -e "fetch('http://127.0.0.1:8080/v1/health').then(r=>console.log(r.status))"`.

---

## Files for this deployment

| File | What it is |
|---|---|
| [`docker-compose.aws.yml`](docker-compose.aws.yml) | the one service, host 8080 → container 8080 |
| [`.env.aws.example`](.env.aws.example) | every variable, placeholders only — copy to `.env.aws` |
| [`Dockerfile.source`](Dockerfile.source) | compiles the workspace inside the image; Docker is the only prerequisite |

Other compose files in this repository, none of which this replaces:
`docker-compose.yml` (build from a prebuilt `dist-portal/`),
`docker-compose.deploy.yml` (pull the published image on any host),
`docker-compose.prod.yml` (with a separate MongoDB container),
`docker-compose.universal.yml` and `docker-compose.zimaos.yml`.
