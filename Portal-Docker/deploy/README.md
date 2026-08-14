# Platform deployment files

One image, and a configuration file per platform that knows how that platform
names things. Every file here deploys the *same* container — the differences are
where the disk comes from, what the platform calls its port, and which of them
can keep data at all.

Each file lives here and is **copied to the repository root** before use,
because that is where every one of these platforms looks for it:

| File | Platform | Copy to | Then |
|---|---|---|---|
| [render.yaml](render.yaml) | Render | `./render.yaml` | New → Blueprint |
| [railway.toml](railway.toml) | Railway | `./railway.toml` | New Project → Deploy from repo |
| [fly.toml](fly.toml) | Fly.io | `./fly.toml` | `fly volumes create portal_data --size 3 && fly deploy` |
| [heroku.yml](heroku.yml) + [app.json](app.json) | Heroku | `./heroku.yml`, `./app.json` | `heroku stack:set container && git push heroku main` |
| [../docker-compose.universal.yml](../docker-compose.universal.yml) | anything that runs containers | — | `docker compose -f … up -d`, or paste into any UI |
| [../docker-compose.zimaos.yml](../docker-compose.zimaos.yml) | ZimaOS / CasaOS | — | import it in the ZimaOS app UI |

---

## Which compose file

Five of them, because they answer different questions. If in doubt, the first.

| File | Use it when | Database | Image |
|---|---|---|---|
| [universal](../docker-compose.universal.yml) | **almost always** — Portainer, ZimaOS, Synology, Unraid, Podman, a plain server | bundled | pulled |
| [zimaos](../docker-compose.zimaos.yml) | a ZimaOS/CasaOS box, and you want the data browsable in its file manager | bundled | pulled |
| [deploy](../docker-compose.deploy.yml) | the `docker compose` CLI, where `${VAR}` works and the `verify` profile is useful | bundled | pulled |
| [prod](../docker-compose.prod.yml) | the portal should use a MongoDB container of its own | separate | pulled |
| [plain](../docker-compose.yml) | on the build machine, to build the image from source | bundled | built here |

The universal one differs from `deploy` in what it refuses to use — no `${VAR}`
substitution, no profiles, no `version:`, no host paths — because every one of
those is mis-parsed by at least one app-store UI in a way that produces a
container which starts and misbehaves rather than an error. The cost is that
configuration moves out of the file, which costs nothing here: an empty
environment is a correct deployment.

`docker/DEPLOY.md` is the prose version of all of this, including the platforms
with no file here (Azure Container Apps, AWS App Runner, Google Cloud Run) —
those are configured entirely in their own consoles and have nothing to commit.

---

## The one question that decides everything: is there a disk?

The image carries its own MongoDB and the church's content, so it runs anywhere
with nothing configured. Whether it *keeps* what the parish then types depends
on one thing only — whether the platform can give it persistent storage at
`/data`.

| | disk at `/data` | what to do |
|---|---|---|
| Docker host, ZimaOS, Render (paid), Railway, Fly | yes | nothing — the bundled MongoDB is the database |
| Heroku, Cloud Run, App Runner, Render free | no | set `MONGODB_URI` to Atlas or a managed MongoDB |

Without either, the container still comes up as a complete, working portal — it
simply restores the snapshot again on every restart, and anything entered since
the last one is gone. That is a fine demonstration and the wrong thing to hand a
parish.

On a platform with a disk, also set `UPLOAD_DIR=/data/uploads` so that uploaded
media lands on the same mount as the database, and one volume covers everything
that must survive a redeploy. (Compose and ZimaOS mount `/app/backend/uploads`
separately instead, which does the same job with two named volumes.)

---

## Published image, or build from the repository?

Both are described in every file here. Prefer the image.

**The image** (`Dockerfile`) is assembled from `dist-portal/`, which is compiled
on a machine you control and copied in. The image build itself is a file copy:
no npm, no compiler, no `node_modules` resolution, and no 2 GB of builder RAM.

```bash
cd Portal-Docker
./scripts/build-image.sh --push you/csistmarkscmsportal:1.5
```

**From the repository** (`Dockerfile.source`) compiles inside the platform's
builder on every push — minutes of CPU and roughly 2 GB of RAM each time. It
exists because Render's and Railway's repo integrations never see a prebuilt
bundle: `dist-portal/` is generated, not committed, so `Dockerfile` has nothing
to copy there.

Both produce the same runtime image, snapshot included.

---

## Netlify

The Portal cannot run on Netlify, and does not need to.

Netlify hosts static sites and short-lived functions. The Portal is three
long-running processes — an API, an admin CMS and a MongoDB server — with a disk
underneath. There is no static export of it that behaves like it, and no
configuration that would make one.

What goes on Netlify is the **public website**, which reads this API. That is
the intended arrangement: the Portal on a host with a disk, the website on a CDN
in front of it.

```toml
# netlify.toml, in the Website repository — not this one
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_PUBLIC_API_URL = "https://portal.example.org/v1"
```

Then, on the Portal side, name that origin so the browser is allowed to call it:

```bash
CORS_ORIGINS=https://your-site.netlify.app,https://www.stmarkschurch.org
```

Media URLs need nothing: the API rewrites them to the origin each request
arrived on, so images served to the Netlify site come back on the Portal's own
public hostname over HTTPS.

---

## What every platform needs, and what none of them do

**Needs**: one inbound port routed to the container's `8080` (or to whatever
`PORT` the platform injects — the entrypoint listens on it either way).

**Does not need**: Node, npm, MongoDB, a reverse proxy, a TLS certificate for
the container, a second service for the API, or any environment variable at
all. The CMS and the API share one origin behind a router inside the container:

```
/v1/*       -> API
/uploads/*  -> API   (media)
everything else -> CMS
```

so the API base is `https://<your-host>/v1` with no CORS between the two halves
and no second deployment to keep in step.

The public origin is detected from the platform — `RENDER_EXTERNAL_URL`,
`RAILWAY_PUBLIC_DOMAIN`, `FLY_APP_NAME`, Azure's and App Runner's variables, or
the forwarded headers — so `PUBLIC_URL` is only worth setting for a custom
domain. JWT secrets and the emergency admin password are generated into `/data`
on first boot, so a deploy with an empty environment is a *correct* deploy
rather than an insecure one.
