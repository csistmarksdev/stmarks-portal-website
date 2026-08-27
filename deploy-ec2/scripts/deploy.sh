#!/usr/bin/env bash
# Bring up the whole demo: the Portal container on :8080, the website on :3000.
#
#   ./scripts/deploy.sh                  pull the pinned image, build the site
#   ./scripts/deploy.sh --skip-website   Portal only
#   ./scripts/deploy.sh --skip-build     restart the site without rebuilding
#
# Safe to run again: the Portal's data lives in named volumes, and the website
# build is idempotent. Anything that fails stops the script — a half-deployed
# demo that reports success is worse than one that stops and says where.

set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

SKIP_WEBSITE=false
SKIP_BUILD=false
for arg in "$@"; do
  case "${arg}" in
    --skip-website) SKIP_WEBSITE=true ;;
    --skip-build)   SKIP_BUILD=true ;;
    -h|--help)      sed -n '2,10p' "$0"; exit 0 ;;
    *)              die "unknown option: ${arg}" ;;
  esac
done

require_docker

[ -f "${DEPLOY_DIR}/.env" ] \
  || warn "no .env beside the compose file — every value falls back to its default. cp .env.example .env"

# ------------------------------------------------------------ the Portal ---

say "Pulling the Portal image"
# The image is private; a failure here is almost always a missing docker login.
compose pull \
  || die "pull failed. The image is private — run 'docker login -u stmarksdev' first."

say "Starting the Portal container"
compose up -d --remove-orphans

say "Waiting for the Portal to become healthy"
# The first boot restores the bundled snapshot before anything listens, which
# is why this waits minutes rather than seconds.
if ! wait_for_http "http://127.0.0.1:${PORTAL_PORT}/v1/health" "the Portal API" 240; then
  compose logs --tail 50
  die "the Portal did not answer on :${PORTAL_PORT} within 240s. Logs above."
fi

# ----------------------------------------------------------- the website ---

if [ "${SKIP_WEBSITE}" = false ]; then
  require_website_dir

  if [ "${SKIP_BUILD}" = false ]; then
    say "Building the website"
    "${SCRIPT_DIR}/start-website.sh" --build-only
  fi

  say "Starting the website"
  "${SCRIPT_DIR}/start-website.sh" --start-only
fi

# ---------------------------------------------------------------- status ---

"${SCRIPT_DIR}/status.sh" || true

say "Deployed"
info "Website : http://${PUBLIC_IP}:${WEBSITE_PORT}"
info "Portal  : http://${PUBLIC_IP}:${PORTAL_PORT}"
info ""
info "Not reachable from outside? The EC2 Security Group must allow inbound"
info "TCP ${WEBSITE_PORT} and TCP ${PORTAL_PORT}. See README.md."
