#!/usr/bin/env bash
# Stop both halves of the demo.
#
#   ./scripts/stop.sh              stop the container and the website
#   ./scripts/stop.sh --portal     the Portal container only
#   ./scripts/stop.sh --website    the website only
#
# Data is kept. `docker compose down` removes the container, not the named
# volumes, so the database, the uploaded media and the generated secrets all
# survive — see README.md for how to actually delete them.

set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

STOP_PORTAL=true
STOP_WEBSITE=true
case "${1:-}" in
  --portal)  STOP_WEBSITE=false ;;
  --website) STOP_PORTAL=false ;;
  "")        ;;
  -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
  *)         die "unknown option: $1" ;;
esac

if [ "${STOP_WEBSITE}" = true ]; then
  if website_unit_installed; then
    say "Stopping ${WEBSITE_SERVICE}"
    sudo systemctl stop "${WEBSITE_SERVICE}"
    info "stopped (it will start again on reboot unless you also 'systemctl disable' it)"
  else
    warn "${WEBSITE_SERVICE}.service is not installed — nothing to stop."
    warn "If the site is running in a foreground shell, stop it there with Ctrl-C."
  fi
fi

if [ "${STOP_PORTAL}" = true ]; then
  require_docker
  say "Stopping the Portal container"
  # `down`, not `stop`, so the container and the compose network are removed
  # cleanly. The named volumes are untouched.
  compose down
  info "volumes kept: portal-data (database, secrets), portal-uploads (media)"
fi
