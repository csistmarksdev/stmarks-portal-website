#!/usr/bin/env bash
# Build a public image from a verified production bundle. Existing installations
# supply their database and uploads through the two standard Docker volumes.
set -euo pipefail
cd "$(dirname "$0")/.."
tag=${1:?Usage: build-public-image.sh namespace/image:version}
arch=$(node -p "process.arch")
node scripts/preflight-image.mjs --arch "$arch"

# Stage runtime files before Docker sees the context. Removing a snapshot in a
# later Dockerfile layer would still publish the snapshot in the earlier layer.
context=$(mktemp -d)
trap 'rm -rf -- "$context"' EXIT
out="$context/dist-portal"
mkdir -p "$context"/{docker,scripts} "$out"/{backend,snapshot/db,snapshot/uploads}
cp Dockerfile "$context/"
cp docker/launch.sh "$context/docker/"
cp scripts/check-website-api.mjs "$context/scripts/"
cp -a dist-portal/{.node-version,start.mjs,frontend,node_modules,shared} "$out/"
cp -a dist-portal/backend/{dist,node_modules,package.json,restore-snapshot.mjs} "$out/backend/"
node -e 'const {name,builtAt,node,target,sameOriginApi}=require("./dist-portal/bundle-info.json"); console.log(JSON.stringify({name,builtAt,node,target,sameOriginApi,snapshot:null}))' > "$out/bundle-info.json"
if find "$out" -type f \( -name .env -o -name '.env.local' -o -name '.env.production*' \) -print -quit | grep -q .; then
    echo "Unexpected runtime environment file in public build context" >&2
    exit 1
fi
docker build --tag "$tag" "$context"
