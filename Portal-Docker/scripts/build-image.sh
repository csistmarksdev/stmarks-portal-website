#!/usr/bin/env bash
# Build the Portal container image.
#
#   ./scripts/build-image.sh                      native architecture, local
#   ./scripts/build-image.sh --multi-arch         amd64 + arm64
#   ./scripts/build-image.sh --push youruser/csistmarkscmsportal:1.5
#   ./scripts/build-image.sh --use-dist-portal    build from the dist-portal/ already there
#   ./scripts/build-image.sh --no-mongodb         slim image, external MONGODB_URI required
#   ./scripts/build-image.sh --from-source        compile inside the image instead
#
# Two steps, and the first one is the point
# -----------------------------------------
# The application is compiled here, on this machine, into `dist-portal/`. The
# image build that follows copies that folder in and compiles nothing.
#
# Doing it the other way — `npm ci && next build` inside the builder — needs
# roughly 2 GB of RAM and several minutes of CPU per architecture, every time,
# which is more than a ZimaBoard or a free-tier box has to give. Here the
# expensive half runs once, and can be run and tested before an image exists at
# all.
#
# Three ways to build, and only one of them needs Node
# ---------------------------------------------------
#   (default)           compile here, then assemble. Needs Docker and Node 20+.
#                       Dependencies are installed on the first run.
#
#   --use-dist-portal   assemble from a `dist-portal/` that was built
#                       elsewhere and copied in. **Needs Docker only** — no
#                       Node, no npm, no node_modules, nothing to install. Build
#                       the bundle on a machine that has Node, copy the folder
#                       to the build host, and this turns it into an image in
#                       about a minute:
#
#                           # on a machine with Node
#                           node scripts/build-production-bundle.mjs
#                           rsync -a dist-portal/ buildhost:~/Portal-Docker/dist-portal/
#
#                           # on the build host, Docker only
#                           ./scripts/build-image.sh --use-dist-portal
#
#                       The bundle must target the architecture of the image
#                       being built; the preflight and the image's own
#                       verification both refuse a mismatch rather than
#                       producing something that starts and then dies.
#
#   --from-source       compile inside the image (`Dockerfile.source`). Also
#                       Docker-only, and the slow path: a full npm install and
#                       Next.js build in the builder, per architecture.
#
# `--skip-bundle` is the old name for `--use-dist-portal` and still works.

set -euo pipefail

IMAGE="csistmarkscmsportal:latest"
PLATFORMS="linux/amd64,linux/arm64"
MULTI_ARCH=false
PUSH=false
SKIP_BUNDLE=false
FROM_SOURCE=false
WITH_MONGODB=true

while [ $# -gt 0 ]; do
    case "$1" in
        --multi-arch)  MULTI_ARCH=true; shift ;;
        --push)        PUSH=true; shift
                       # An image name may follow --push; anything not starting
                       # with a dash is taken as one.
                       if [ $# -gt 0 ] && [ "${1#-}" = "$1" ]; then IMAGE="$1"; shift; fi ;;
        --platforms)   PLATFORMS="$2"; shift 2 ;;
        # Same flag, two names: `--skip-bundle` says what it does not do,
        # `--use-dist-portal` says what it does, and the second is the one worth
        # finding when you are looking for how to build without Node.
        --use-dist-portal|--prebuilt|--skip-bundle)
                       SKIP_BUNDLE=true; shift ;;
        --no-mongodb)  WITH_MONGODB=false; shift ;;
        --from-source) FROM_SOURCE=true; shift ;;
        -t|--tag)      IMAGE="$2"; shift 2 ;;
        # To the first blank line, so adding a paragraph above never truncates
        # the help or spills `set -euo pipefail` into it.
        -h|--help)     sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)             echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

cd "$(dirname "$0")/.."

# Whether this machine can run the build tooling at all.
#
# `--use-dist-portal` and `--from-source` are both meant to work on a host that
# has Docker and nothing else, so every `node` call below is optional and guarded
# by this. A build host without Node is a supported configuration, not a broken
# one.
HAVE_NODE=false
command -v node > /dev/null 2>&1 && HAVE_NODE=true

# Where the snapshot lives depends on what is being built from. With a prebuilt
# bundle it is *inside* that bundle — and the source tree's own `snapshot/` may
# legitimately not exist at all, because the only thing copied to this machine
# was `dist-portal/`.
if [ "$SKIP_BUNDLE" = true ]; then
    # Checked here rather than at the build step below, so that a missing bundle
    # is reported as a missing bundle instead of as the missing snapshot inside
    # one that was never there.
    if [ ! -d dist-portal ]; then
        cat >&2 <<'EOF'
error: --use-dist-portal, but dist-portal/ does not exist.

  That flag builds the image from a bundle compiled elsewhere. Build it on a
  machine that has Node and copy the folder here:

      node scripts/build-production-bundle.mjs        # there
      rsync -a dist-portal/ thishost:$PWD/dist-portal/

  Or drop the flag to compile here, which needs Node 20+.
EOF
        exit 1
    fi
    SNAPSHOT_DIR=dist-portal/snapshot
else
    SNAPSHOT_DIR=snapshot
fi

# The snapshot is the image's reason for existing. Building without it produces
# something that starts, shows an empty portal, and looks like the export step
# silently failed — which it did, several steps ago and somewhere else.
if [ ! -d "$SNAPSHOT_DIR/db" ]; then
    if [ "$SKIP_BUNDLE" = true ]; then
        cat >&2 <<'EOF'
error: dist-portal/snapshot/ is missing.

  --use-dist-portal builds from a bundle that was assembled elsewhere, and this
  one carries no data — the image would come up as an empty portal.

  Either the copy across dropped it (it is ~15 MB; some transfer methods skip
  directories that look like media), or the bundle was built on a machine whose
  `snapshot/` was empty. Rebuild it there and copy the whole folder:

      node scripts/capture-live-data.mjs
      node scripts/build-production-bundle.mjs
EOF
    else
        cat >&2 <<'EOF'
error: snapshot/ is missing.

  The image bakes in the live database and media. Capture them first, from a
  machine that can reach the database:

      node scripts/capture-live-data.mjs

  Or, if the application was compiled elsewhere and only `dist-portal/` was
  copied to this machine, build from that instead — it carries its own copy of
  the snapshot and needs no Node here:

      ./scripts/build-image.sh --use-dist-portal
EOF
    fi
    exit 1
fi

if [ "$HAVE_NODE" = true ]; then
    docs=$(node -e "const m=require('./$SNAPSHOT_DIR/db/_manifest.json'); \
        console.log(m.documents+' documents, '+m.uploads.files+' uploads, captured '+m.capturedAt)")
    echo "Snapshot: $docs"
else
    # No Node to parse the manifest with; count what is on disk instead, so the
    # data is still confirmed rather than merely assumed. `_manifest.json` is
    # excluded — it describes the collections rather than being one.
    echo "Snapshot: $(find "$SNAPSHOT_DIR/db" -name '*.json' ! -name '_*' 2>/dev/null | wc -l) collection(s), \
$(find "$SNAPSHOT_DIR/uploads" -type f 2>/dev/null | wc -l) media file(s)"
fi

DOCKERFILE=Dockerfile

if [ "$FROM_SOURCE" = true ]; then
    DOCKERFILE=Dockerfile.source
    echo "Compiling inside the image (Dockerfile.source) — this is the slow path."
else
    # --------------------------------------------------------------- bundle --
    #
    # Cross-building is settled here rather than in the Dockerfile, because this
    # is where npm runs. A multi-architecture image needs one bundle per
    # architecture and this script builds one, so that combination is refused
    # rather than silently producing an arm64 image carrying amd64 binaries —
    # which builds, starts, and dies on the first uploaded image.
    if [ "$MULTI_ARCH" = true ] && [ "$SKIP_BUNDLE" != true ]; then
        cat >&2 <<'EOF'
error: --multi-arch cannot prebuild both architectures in one pass.

  `npm install --cpu` resolves one target per run, so a single dist-portal/ is
  correct for exactly one architecture. Either:

    build each architecture on (or for) its own host:
        TARGET_CPU=arm64 node scripts/build-production-bundle.mjs
        ./scripts/build-image.sh --use-dist-portal --push you/portal:1.5-arm64

    or compile inside the image, which QEMU then handles per platform:
        ./scripts/build-image.sh --multi-arch --from-source --push you/portal:1.5
EOF
        exit 2
    fi

    if [ "$SKIP_BUNDLE" = true ]; then
        # Its existence was established above, before the snapshot check.
        echo "Building from the existing dist-portal/ — nothing is compiled here"
    else
        if [ "$HAVE_NODE" != true ]; then
            cat >&2 <<'EOF'
error: no `node` on this machine, and the application has to be compiled.

  The image itself never compiles anything, which is the point of it — but
  something has to produce `dist-portal/` first. Three ways out, cheapest first:

    1. Build the bundle on a machine that has Node, copy the folder here, and
       assemble the image with Docker alone:
           node scripts/build-production-bundle.mjs      # there
           ./scripts/build-image.sh --use-dist-portal    # here

    2. Install Node 20+ here:
           curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
           sudo apt install -y nodejs

    3. Compile inside the image — no Node needed, but several minutes of CPU
       and ~2 GB of RAM in the builder, on every build:
           ./scripts/build-image.sh --from-source
EOF
            exit 1
        fi
        echo
        echo "Compiling the application (outside the container)"
        node scripts/build-production-bundle.mjs
    fi

    if [ "$HAVE_NODE" = true ]; then
        node -e "const b=require('./dist-portal/bundle-info.json'); \
            console.log('\nBundle: node '+b.node+', '+b.target.os+'/'+b.target.cpu+', built '+b.builtAt)"
    fi

    # -------------------------------------------------------------- preflight --
    #
    # The Dockerfile checks most of this too, in a layer near the end — after the
    # context upload, the apt install and the Node download. Doing it here first
    # turns "two minutes, then a missing file" into "one second, and the command
    # that fixes it".
    #
    # The architecture is what the *image* will be, which is not always this
    # machine: `--platforms linux/arm64 --use-dist-portal` builds an arm64 image from
    # a bundle that had better be arm64 too.
    if [ "$HAVE_NODE" != true ]; then
        # Docker-only host building from a copied bundle. The image's own
        # verification layer still runs every one of these checks — this one is
        # an optimisation, not the safety net, so its absence costs time on a
        # bad bundle rather than correctness.
        echo "Skipping preflight (no node here) — the image build verifies the bundle itself."
    else
        if [ "$MULTI_ARCH" = true ]; then
            case "$PLATFORMS" in
                *,*)     image_arch="" ;;   # several; see below
                */arm64) image_arch=arm64 ;;
                */amd64) image_arch=x64 ;;
                *)       image_arch="" ;;
            esac

            # Several platforms from one bundle cannot all match, and the
            # Dockerfile already refuses that mismatch per platform with the
            # exact rebuild command. Checking it here as well would only fail
            # earlier with less information — so the arch check is neutralised
            # and the rest still runs.
            [ -n "$image_arch" ] || image_arch=$(node -p \
                "require('./dist-portal/bundle-info.json').target.cpu")
        else
            # A local build produces an image for this machine, whatever
            # --platforms says, so the bundle must match the host.
            case "$(uname -m)" in
                aarch64|arm64) image_arch=arm64 ;;
                *)             image_arch=x64 ;;
            esac
        fi

        node scripts/preflight-image.mjs --arch "$image_arch"
    fi
fi

echo

# `Dockerfile.source` has no `WITH_MONGODB`, and passing a build argument a
# Dockerfile does not declare is a warning on every build — noise that trains
# people to ignore warnings.
#
# Expanded as `${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"}` at the call sites: under
# `set -u`, bash before 4.4 treats an empty array's plain expansion as an unset
# variable and aborts — which is exactly the `--from-source` path, on exactly
# the older machines most likely to need it.
BUILD_ARGS=()
[ "$FROM_SOURCE" = true ] || BUILD_ARGS+=(--build-arg "WITH_MONGODB=$WITH_MONGODB")

if [ "$MULTI_ARCH" = true ]; then
    if [ "$PUSH" != true ]; then
        echo "error: --multi-arch needs --push <image>; a manifest list cannot be stored in the local daemon." >&2
        exit 2
    fi

    # A named builder using the docker-container driver. The default builder
    # uses the daemon's own driver, which can only ever build for the host
    # architecture — the `--platform` flag is accepted and then ignored, so the
    # build "succeeds" and produces a single-architecture image.
    docker buildx inspect portal-builder > /dev/null 2>&1 \
        || docker buildx create --name portal-builder --driver docker-container --bootstrap

    echo "Building $IMAGE for $PLATFORMS"
    docker buildx build \
        --builder portal-builder \
        --file "$DOCKERFILE" \
        ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
        --platform "$PLATFORMS" \
        --tag "$IMAGE" \
        --push \
        .
else
    echo "Building $IMAGE for this machine's architecture"
    docker build \
        --file "$DOCKERFILE" \
        ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
        --tag "$IMAGE" \
        .
    [ "$PUSH" = true ] && docker push "$IMAGE"
fi

echo
echo "Done: $IMAGE"
echo
echo "Run it:"
echo "  docker run -d --name portal -p 8080:8080 -v portal-data:/data $IMAGE"
echo "  open http://localhost:8080"
echo
echo "Verify it once it is healthy:"
echo "  docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080"
