# CSI St. Mark's Portal — the whole installation in one image.
#
#   node scripts/build-production-bundle.mjs      compile, once, out here
#   docker build -t csistmarkscmsportal .         assemble the image
#   docker run -d -p 8080:8080 -v portal-data:/data csistmarkscmsportal
#
# or, both steps together:  ./scripts/build-image.sh
#
# The image carries the API, the admin CMS, a MongoDB server, and a snapshot of
# the church's real content, media and accounts — so it comes up as a working
# portal with no database to provision and nothing to configure. Point
# `MONGODB_URI` at a managed database and the bundled one is never started.
#
# Nothing is compiled here
# ------------------------
# This Dockerfile copies `dist-portal/`, which `scripts/build-production-bundle.mjs`
# produced on the host. There is no `npm ci`, no `nest build`, no `next build`
# and no `node_modules` resolution inside the image.
#
# That is deliberate and it is the point of this file. Compiling in the image
# means a Next.js build inside the builder: roughly 2 GB of RAM, a full
# dependency install, and several minutes of CPU — every time the image is
# built, on every architecture, and again on any host that rebuilds rather than
# pulls. On a ZimaBoard, a free-tier instance or a laptop that is the difference
# between "the image builds" and "the machine swaps until the daemon is killed".
#
# Building outside also fixes what the build can *see*. `NEXT_PUBLIC_*` values
# are inlined into the client JavaScript at build time, so they are a property
# of the artifact rather than of the container; assembling the artifact
# somewhere it can be run and tested is what makes them checkable before an
# image exists at all.
#
# The cost is one prerequisite: `dist-portal/` must be there. The build fails
# immediately and says so if it is not, rather than producing an image that
# starts and then dies.
#
# `Dockerfile.source` is the other half of the trade — it compiles from source
# inside the image, for a platform that builds straight from a git repository
# (Render's and Railway's repo integrations) and never sees a prebuilt bundle.
#
# Base image
# ----------
# `ubuntu:24.04`, chosen over Debian because MongoDB publishes both linux/amd64
# and linux/arm64 packages for Ubuntu and only amd64 for Debian — so one
# Dockerfile serves a ZimaBoard, an AWS Graviton instance and an Apple Silicon
# laptop.
#
# glibc, and that part is not negotiable. `sharp` is a native module resolved
# against the C library, so a bundle whose binaries were fetched for musl fails
# at runtime on the first image upload. The bundle builder fetches glibc Linux
# binaries; this base is what they expect.
#
# Node comes from the official tarball rather than a distribution package,
# because those are built to target glibc 2.28 and are the canonical way to put
# a specific Node on any distribution — and the version is read out of the
# bundle, so the runtime is guaranteed to be the same Node the application was
# compiled and dependency-resolved against rather than a number pinned here and
# left to drift.
#
# Not the official `mongo:8` image, for one specific reason: it declares
# `VOLUME /data/db`. That declaration is inherited and cannot be undone, so
# every `docker run` would create an anonymous volume mounted *over* `/data/db`
# — shadowing the very path inside a `-v portal-data:/data` mount that the
# database writes to. The data would look persisted, live somewhere else, and
# vanish on `docker rm`.

FROM ubuntu:24.04

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    STATE_DIR=/data \
    DEBIAN_FRONTEND=noninteractive

# The Node version the bundle was built with, copied on its own and first.
#
# Alone in its own layer so the expensive apt/Node layer below is cached across
# rebuilds: the application changes constantly, the Node version almost never,
# and a two-line file is what separates them. Copying the whole bundle first
# would invalidate the package installation on every code change.
COPY dist-portal/.node-version /tmp/node-version

# MongoDB and Node, in one layer.
#
# `mongodb-org-server` is just `mongod` — the shell and the import/export tools
# are another 150 MB of things nothing in this image invokes.
#
# Only the `node` binary is extracted from the tarball: npm, the headers and the
# bundled docs are build-time tools, and this image does not build.
#
# One `RUN`, because `curl`, `gnupg` and `xz-utils` are needed by both halves
# and must be gone by the time the layer is committed. Removing them in a
# *later* layer would leave them in the image regardless — a deleted file in an
# upper layer still ships the bytes underneath it.
#
# `WITH_MONGODB=false` builds without the database, for a deployment that sets
# `MONGODB_URI` to Atlas or a managed instance and would otherwise carry ~150 MB
# it never starts.
ARG MONGO_MAJOR=8.0
ARG WITH_MONGODB=true
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg xz-utils; \
    \
    if [ "${WITH_MONGODB}" = "true" ]; then \
        curl -fsSL "https://pgp.mongodb.com/server-${MONGO_MAJOR}.asc" \
            | gpg --dearmor -o /usr/share/keyrings/mongodb.gpg; \
        echo "deb [ signed-by=/usr/share/keyrings/mongodb.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/${MONGO_MAJOR} multiverse" \
            > /etc/apt/sources.list.d/mongodb.list; \
        apt-get update; \
        apt-get install -y --no-install-recommends mongodb-org-server; \
    fi; \
    \
    NODE_VERSION="$(cat /tmp/node-version)"; \
    case "$(dpkg --print-architecture)" in \
        amd64) node_arch=x64 ;; \
        arm64) node_arch=arm64 ;; \
        *) echo "unsupported architecture: $(dpkg --print-architecture)" >&2; exit 1 ;; \
    esac; \
    tarball="node-v${NODE_VERSION}-linux-${node_arch}"; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${tarball}.tar.xz" -o /tmp/node.tar.xz; \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner "${tarball}/bin/node"; \
    rm /tmp/node.tar.xz /tmp/node-version; \
    \
    apt-get purge -y --auto-remove curl gnupg xz-utils; \
    rm -rf /var/lib/apt/lists/*; \
    node --version; \
    if [ "${WITH_MONGODB}" = "true" ]; then mongod --version | head -1; fi

# The unprivileged account, created *before* anything is copied so that the
# COPY can set ownership directly.
#
# Group 0 rather than a group of its own: that is what lets platforms which
# impose an arbitrary `runAsUser` — OpenShift, and any Kubernetes with a
# restricted security context — still read the application. They pick the UID;
# they always put it in group 0.
RUN useradd --system --uid 10001 --gid 0 --home-dir /app --shell /usr/sbin/nologin portal

# The application: compiled API, Next standalone CMS, production dependencies,
# the snapshot, and the entrypoint — all of it already assembled on the host.
#
# One COPY rather than a dozen, because there is nothing left to interleave; and
# `--chown` on it rather than a `chown -R` afterwards, since a recursive chown
# rewrites every file it touches and copy-on-write layers then carry a second
# full copy of the application — roughly doubling the image for a metadata
# change.
COPY --chown=10001:0 dist-portal/ ./

# Started as root so ownership of a freshly mounted volume can be corrected,
# then dropped to `portal`. See `docker/launch.sh`.
#
# Deliberately not `COPY --chmod`: that option requires BuildKit, and this image
# should build under the classic builder too. `chmod` in the next layer costs
# nothing on a 2 KB file.
COPY docker/launch.sh /usr/local/bin/launch.sh

# The Website contract test, carried inside the image so any deployment can
# verify itself with nothing installed on the host:
#
#   docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080
#
# It has no dependencies and is a few kilobytes. Shipping it means the answer to
# "is this deployment actually serving the Website correctly" is available on
# the machine where the question is being asked, rather than needing a checkout.
COPY --chown=10001:0 scripts/check-website-api.mjs check-website-api.mjs

# Only the writable paths need group-write, and both are empty here — so this
# stays a metadata-only layer of two directories rather than a copy of the app.
RUN chmod 0755 /usr/local/bin/launch.sh \
 && mkdir -p /data/db /app/backend/uploads \
 && chown -R 10001:0 /data /app/backend/uploads \
 && chmod -R g+rwX   /data /app/backend/uploads

# Fail the build, not the deployment.
#
# Everything here is something the bundle was supposed to provide and that the
# entrypoint will reach for on boot. Each has a plausible way of going missing —
# a stale `dist-portal/` from before a rename, a capture step skipped, a bundle
# built for the wrong architecture — and each would otherwise surface as a
# container that starts and then dies, or worse, one that comes up empty.
#
# The architecture check is the one that repays itself. An amd64 bundle inside
# an arm64 image builds perfectly and then fails on the first image operation
# with a message about a missing `sharp` binding, a long way from the cause.
RUN set -eux; \
    test -f /app/start.mjs; \
    test -f /app/backend/dist/main.js; \
    test -f /app/backend/dist/seed/initialize.js; \
    test -f /app/backend/restore-snapshot.mjs; \
    test -f /app/frontend/server.js; \
    test -d /app/frontend/.next/static; \
    test -d /app/snapshot/db; \
    cd /app/backend; \
    node -e "require.resolve('mongodb'); require.resolve('bson'); require.resolve('sharp')"; \
    cd /app; \
    want="$(node -e "process.stdout.write(require('/app/bundle-info.json').target.cpu)")"; \
    case "$(dpkg --print-architecture)" in \
        amd64) have=x64 ;; \
        arm64) have=arm64 ;; \
    esac; \
    if [ "$want" != "$have" ]; then \
        echo "bundle targets ${want} but this image is ${have}." >&2; \
        echo "Rebuild it: TARGET_CPU=${have} node scripts/build-production-bundle.mjs" >&2; \
        exit 1; \
    fi; \
    command -v setpriv || command -v gosu; \
    node -e "const b=require('/app/bundle-info.json'); \
        console.log('bundle: node '+b.node+', '+b.target.os+'/'+b.target.cpu+', built '+b.builtAt); \
        console.log('snapshot: '+(b.snapshot ? b.snapshot.documents+' documents, '+b.snapshot.uploads.files+' uploads' : 'NONE — this portal will start empty'))"; \
    echo "runtime image contents verified"

# The database, generated secrets and uploaded media. Declared so that a plain
# `docker run` with no `-v` still keeps them out of the container's writable
# layer, and so hosts that provision storage automatically know where it goes.
VOLUME ["/data", "/app/backend/uploads"]

# One port. The router inside serves the CMS and proxies the API under it, so
# there is a single URL, a single origin and no CORS between the two halves:
#
#   /v1/*       -> API
#   /uploads/*  -> API   (uploaded media)
#   /docs*      -> API   (Swagger, off in production unless enabled)
#   everything else -> CMS
#
# `SPLIT_PORTS=true` skips the router and publishes the two servers directly on
# 4000 and 3001 instead, for a host that can route to both. Declared here so
# that mode needs no `--expose`; nothing listens on them otherwise.
EXPOSE 8080
EXPOSE 4000 3001

# `start-period` is generous because the first boot restores the snapshot before
# anything listens. Marking a container unhealthy while it is doing exactly what
# it was told to do causes platforms to kill and retry it, forever.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/'+(process.env.API_PREFIX||'v1')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/launch.sh"]
CMD ["node", "/app/start.mjs"]
