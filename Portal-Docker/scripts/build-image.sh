#!/usr/bin/env bash
# Build the Portal container image.
#
#   ./scripts/build-image.sh                      native architecture, local
#   ./scripts/build-image.sh --multi-arch         amd64 + arm64
#   ./scripts/build-image.sh --push youruser/csistmarkscmsportal:1.0
#
# Native build by default. Multi-architecture builds run the *other*
# architecture under QEMU emulation, which for a Next.js compile is roughly ten
# times slower — worth it to publish an image, wasteful when you are about to
# run it on the machine you built it on.
#
# A multi-arch build cannot be loaded into the local Docker daemon: the daemon
# holds one image per name and a manifest list is several. So `--multi-arch`
# requires `--push` to a registry, which is the only place a manifest list can
# live. That is a limitation of Docker, not of this script.

set -euo pipefail

IMAGE="csistmarkscmsportal:latest"
PLATFORMS="linux/amd64,linux/arm64"
MULTI_ARCH=false
PUSH=false

while [ $# -gt 0 ]; do
    case "$1" in
        --multi-arch) MULTI_ARCH=true; shift ;;
        --push)       PUSH=true; shift
                      # An image name may follow --push; anything not starting
                      # with a dash is taken as one.
                      if [ $# -gt 0 ] && [ "${1#-}" = "$1" ]; then IMAGE="$1"; shift; fi ;;
        --platforms)  PLATFORMS="$2"; shift 2 ;;
        -t|--tag)     IMAGE="$2"; shift 2 ;;
        -h|--help)    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)            echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

cd "$(dirname "$0")/.."

# The snapshot is the image's reason for existing. Building without it produces
# something that starts, shows an empty portal, and looks like the export step
# silently failed — which it did, several steps ago and somewhere else.
if [ ! -d snapshot/db ]; then
    cat >&2 <<'EOF'
error: snapshot/ is missing.

  The image bakes in the live database and media. Capture them first, from a
  machine that can reach the database:

      node scripts/capture-live-data.mjs

  See docker/DEPLOY.md for running the capture from a checkout that has
  node_modules installed.
EOF
    exit 1
fi

docs=$(node -e "const m=require('./snapshot/db/_manifest.json'); \
    console.log(m.documents+' documents, '+m.uploads.files+' uploads, captured '+m.capturedAt)")
echo "Snapshot: $docs"
echo

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

    echo "Building $IMAGE for $PLATFORMS (emulated; this takes a while)"
    docker buildx build \
        --builder portal-builder \
        --platform "$PLATFORMS" \
        --tag "$IMAGE" \
        --push \
        .
else
    echo "Building $IMAGE for this machine's architecture"
    docker build --tag "$IMAGE" .
    [ "$PUSH" = true ] && docker push "$IMAGE"
fi

echo
echo "Done: $IMAGE"
echo
echo "Run it:"
echo "  docker run -d --name portal -p 8080:8080 -v portal-data:/data $IMAGE"
echo "  open http://localhost:8080"
