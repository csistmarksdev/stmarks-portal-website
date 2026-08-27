# AWS EC2 demo deployment

CSI St. Mark's, on one Ubuntu instance at **54.252.189.117**.

```
AWS EC2  (Ubuntu, 2 vCPU / 4 GiB, x86_64)
54.252.189.117
      |
      +-- :3000  Next.js website        host process, systemd, `next start`
      |
      +-- :8080  Portal application     Docker Compose, one container
                     |-- admin CMS       /
                     |-- API             /v1/*
                     |-- uploaded media  /uploads/*
                     +-- MongoDB         127.0.0.1:27017, inside the container
```

Two things run, and only one of them is Docker. The website is a plain Node
process on the host by design — it is rebuilt far more often than the Portal
is, and a container around it would buy nothing here.

The Portal is a single image that carries its own MongoDB and a snapshot of the
church's content, media and accounts, which is why there is no database service
to provision, no Redis and no queue. Its data lives in two named Docker volumes.

---

## 1. EC2 prerequisites

| | |
|---|---|
| OS | Ubuntu 22.04 or 24.04, x86_64 |
| Size | 2 vCPU / 4 GiB (t3.small or larger) |
| Disk | 20 GB or more — the image is ~1 GB, the website's `node_modules` another ~1 GB |
| Login | `ssh -i your-key.pem ubuntu@54.252.189.117` |

**Security Group.** Not configurable from this repository, and not something
these scripts touch. Set it in the AWS console — EC2 → Instances → Security →
inbound rules:

| Type | Protocol | Port | Source | Why |
|---|---|---|---|---|
| SSH | TCP | 22 | your IP, not 0.0.0.0/0 | administration |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | the public website |
| Custom TCP | TCP | 8080 | 0.0.0.0/0 | the Portal (CMS + API + media) |

Nothing else. In particular **not** 27017 — MongoDB listens on loopback inside
the container and is not published to the host at all.

Outbound needs to reach Docker Hub and the npm registry; the default
allow-all outbound rule covers it.

### Swap

A `next build` wants roughly 2 GB, and the Portal container is using some of
the 4 GiB while it runs. Give the instance swap once, so a build that peaks
does not get OOM-killed halfway:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## 2. Docker

```bash
docker --version          # already installed?
docker compose version    # must be v2 — "docker-compose" v1 is not enough
```

If not:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker              # or log out and back in
docker run --rm hello-world
```

The Portal image is private, so log in once:

```bash
docker login -u stmarksdev
```

## 3. Node.js

Only the website needs it; the Portal carries its own Node inside the image.
Node 20 or newer — the site is built with Next 16.

```bash
node --version
npm --version
```

If not:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

NodeSource puts `npm` at `/usr/bin/npm`, which is the path the systemd unit
uses. If you install Node some other way (nvm, for instance), edit `ExecStart`
in `csistmc-website.service` to match `readlink -f "$(which npm)"`.

---

## 4. Upload the project

The two halves live side by side, and the scripts find each other by relative
path, so keep the layout:

```
/home/ubuntu/app/
├── deploy-ec2/          <- this directory: compose, env, scripts, systemd unit
│   ├── docker-compose.yml
│   ├── .env                     (you create this; git-ignored)
│   ├── .env.example
│   ├── website.env.example
│   ├── csistmc-website.service
│   └── scripts/
├── WebsiteRT/           <- the Next.js website, served on :3000
└── Portal-Docker/       <- the Portal source and image build (not needed to run)
```

From a git remote:

```bash
mkdir -p /home/ubuntu/app
git clone <your-remote> /home/ubuntu/app
```

Or from your machine, over rsync — skipping the two directories that must be
rebuilt on the target rather than copied:

```bash
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git \
  -e "ssh -i your-key.pem" \
  ./ ubuntu@54.252.189.117:/home/ubuntu/app/
```

Then make the scripts executable, which rsync from Windows will not have done:

```bash
chmod +x /home/ubuntu/app/deploy-ec2/scripts/*.sh
```

---

## 5. Environment configuration

Two files, one for each half. Neither is committed.

**The Portal** — `deploy-ec2/.env`:

```bash
cd /home/ubuntu/app/deploy-ec2
cp .env.example .env
nano .env
```

Everything in it is optional: the container generates its JWT secrets on first
boot and keeps them in the `portal-data` volume. The two worth setting are
`PUBLIC_URL` and `CORS_ORIGINS`, both of which the example already has right
for this instance.

**The website** — `WebsiteRT/.env.local`:

```bash
cp /home/ubuntu/app/deploy-ec2/website.env.example /home/ubuntu/app/WebsiteRT/.env.local
nano /home/ubuntu/app/WebsiteRT/.env.local
```

`NEXT_PUBLIC_API_URL` matters more than it looks. It is inlined into the client
JavaScript **at build time**, so changing it means rebuilding — and with it
unset the site silently serves sample content from `src/data/*.mock.ts` instead
of the church's, which looks like a working deployment.

To connect the publish-refreshes-the-site path, generate one secret and put the
same value in both files:

```bash
openssl rand -base64 32
# -> WEBSITE_REVALIDATE_SECRET in deploy-ec2/.env
# -> REVALIDATE_SECRET         in WebsiteRT/.env.local
```

Skip it and publishing still works; the site just picks changes up within about
five minutes rather than immediately.

---

## 6. Deploy

Everything, in one command:

```bash
cd /home/ubuntu/app/deploy-ec2
chmod +x scripts/*.sh      # once, after a clone or an rsync from Windows
./scripts/deploy.sh
```

It pulls the pinned image, starts the container, waits for the API's health
route to answer, installs and builds the website, restarts it, and prints the
status. Any failing step stops it.

### Or step by step

**The Portal:**

```bash
cd /home/ubuntu/app/deploy-ec2
docker compose pull
docker compose up -d
docker compose ps
```

First boot restores the bundled snapshot before anything listens, so give it a
minute or two — that is what the healthcheck's 120 s `start_period` is for.

**The website — build:**

```bash
cd /home/ubuntu/app/WebsiteRT
npm ci
npm run build
```

Not `npm ci --omit=dev`: `next build` needs `tailwindcss`, `@tailwindcss/postcss`
and `typescript`, which are devDependencies.

**The website — install the service and start it:**

```bash
sudo cp /home/ubuntu/app/deploy-ec2/csistmc-website.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now csistmc-website
sudo systemctl status csistmc-website
```

The unit runs `npm run start -- -H 0.0.0.0 -p 3000` as the `ubuntu` user, from
`/home/ubuntu/app/WebsiteRT`, and restarts it on failure and after a reboot. It
is not run as root.

`-H 0.0.0.0` is the part that matters: Next binds to localhost otherwise, and
the site would answer `curl` on the instance while being unreachable from a
browser — which looks exactly like a Security Group problem and is not one.

---

## 7. Verify

```bash
cd /home/ubuntu/app/deploy-ec2
./scripts/status.sh
```

By hand:

```bash
# on the instance
curl -sI http://127.0.0.1:8080/v1/health     # Portal API
curl -sI http://127.0.0.1:8080/              # admin CMS
curl -sI http://127.0.0.1:3000/              # website

# what is actually listening, and on which interface
sudo ss -tlnp | grep -E ':3000|:8080'
#   0.0.0.0:3000   next-server     <- not 127.0.0.1:3000
#   0.0.0.0:8080   docker-proxy
#   :27017 must NOT appear — the database is inside the container

# the Website API contract, from inside the image, no checkout needed
docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080
```

From a browser:

| | |
|---|---|
| Website | http://54.252.189.117:3000 |
| Admin CMS | http://54.252.189.117:8080 |
| API health | http://54.252.189.117:8080/v1/health |

Answers on the instance but not in a browser? That is the Security Group,
every time. Section 1.

---

## 8. Logs

```bash
# Portal
docker compose logs -f                  # follow
docker compose logs --tail 100 portal   # last 100 lines
docker compose logs --since 10m         # recent only

# Website
sudo journalctl -u csistmc-website -f
sudo journalctl -u csistmc-website -n 100 --no-pager
sudo journalctl -u csistmc-website --since "10 min ago"
```

Container logs are capped at 3 × 10 MB by the compose file, so they cannot fill
the disk.

## 9. Restart

```bash
# Portal
docker compose restart portal
docker compose up -d          # after editing .env or the compose file

# Website
sudo systemctl restart csistmc-website

# both, rebuilding the site
./scripts/deploy.sh

# both, without rebuilding the site
./scripts/deploy.sh --skip-build
```

Changing `NEXT_PUBLIC_API_URL` needs a rebuild, not a restart — it is compiled
into the client bundle.

## 10. Stop

```bash
./scripts/stop.sh             # both
./scripts/stop.sh --portal    # container only
./scripts/stop.sh --website   # website only
```

`stop.sh` runs `docker compose down`, which removes the container and keeps the
volumes. To stop the website coming back after a reboot as well:

```bash
sudo systemctl disable --now csistmc-website
```

### Deleting the Portal's data

Deliberately not in any script. This destroys the database, every uploaded
photograph added since deployment, and the generated secrets:

```bash
docker compose down -v
```

The next `up -d` restores the snapshot baked into the image, so the demo comes
back — as it shipped, without anything added since.

---

## Updating

**A new Portal version.** Edit the tag in `docker-compose.yml` — it is pinned to
`stmarksdev/csistmarkscmsportal:1.5` on purpose, so an instance that reboots
does not silently change version — then:

```bash
docker compose pull && docker compose up -d
```

Rolling back is the same edit in reverse.

**New website code:**

```bash
cd /home/ubuntu/app && git pull
cd deploy-ec2 && ./scripts/start-website.sh
```

---

## Troubleshooting

**`docker compose pull` fails with `pull access denied`.** The image is
private: `docker login -u stmarksdev`.

**The container restarts in a loop.** `docker compose logs --tail 50 portal`.
The API prints every unsafe production setting at once and refuses to start
rather than booting insecurely.

**`next build` is killed.** Out of memory. Add swap (section 1), or stop the
container for the duration of the build:

```bash
docker compose stop portal
cd /home/ubuntu/app/WebsiteRT && npm run build
cd /home/ubuntu/app/deploy-ec2 && docker compose start portal
```

**The site shows sample content — wrong events, wrong photographs.**
`NEXT_PUBLIC_API_URL` was unset when it was built. Set it in
`WebsiteRT/.env.local` and rebuild.

**Images on the site are broken.** `next/image` only optimises hosts listed in
`images.remotePatterns`, which `next.config.ts` derives from
`NEXT_PUBLIC_API_URL`. If the site was built pointing somewhere else, the
optimiser refuses the Portal's `/uploads/**` URLs. Same cure: fix it and rebuild.

**Publishing in the CMS does not refresh the site.** The two secrets do not
match, or `WEBSITE_REVALIDATE_URL` is wrong. From inside the container:

```bash
docker exec portal node -e "fetch('http://host.docker.internal:3000/api/revalidate',{method:'POST'}).then(r=>console.log(r.status))"
```

`401` means it reached the site and the secret is wrong. A connection error
means `host.docker.internal` did not resolve — check the `extra_hosts` entry in
the compose file.

**A script fails with `/usr/bin/env: 'bash^M': No such file or directory`.**
The scripts were checked out with Windows line endings. `.gitattributes` in this
directory is meant to prevent it; if it happened anyway: `dos2unix scripts/*.sh`.

---

## Files here

| File | What it is |
|---|---|
| `docker-compose.yml` | the one service, on 8080 |
| `.env.example` | every variable the Portal reads, placeholders only |
| `website.env.example` | the website's variables -> copy to `WebsiteRT/.env.local` |
| `csistmc-website.service` | systemd unit for the website, runs as `ubuntu` |
| `scripts/deploy.sh` | pull, start, build, restart, report |
| `scripts/start-website.sh` | build and start the website only |
| `scripts/stop.sh` | stop either half, or both |
| `scripts/status.sh` | containers, service, ports, health |
| `scripts/common.sh` | shared paths and helpers, sourced by the others |

Related, in `Portal-Docker/`: `docker/DEPLOY.md` for the Portal's own
configuration and platform notes, `PUSH.md` for building and publishing the
image, and `docker-compose.deploy.yml` for the generic (non-EC2) form of this.
