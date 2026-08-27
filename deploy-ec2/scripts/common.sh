#!/usr/bin/env bash
# Shared paths and helpers for the EC2 demo scripts. Sourced, not run.

set -euo pipefail

# Resolved from this file's own location, so the scripts work from any cwd and
# from a checkout that is not at /home/ubuntu/app.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd -- "${DEPLOY_DIR}/.." && pwd)"
WEBSITE_DIR="${REPO_ROOT}/WebsiteRT"

COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
WEBSITE_SERVICE="csistmc-website"

PUBLIC_IP="${PUBLIC_IP:-54.252.189.117}"
WEBSITE_PORT=3000
PORTAL_PORT=8080

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\033[33m    warning: %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[31m\nerror: %s\033[0m\n' "$*" >&2; exit 1; }

# `docker compose` (v2 plugin) only. `docker-compose` v1 is end-of-life and
# does not understand every key in the compose file.
compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

require_docker() {
  command -v docker >/dev/null 2>&1 \
    || die "docker is not installed. See README.md, 'EC2 prerequisites'."
  docker compose version >/dev/null 2>&1 \
    || die "the 'docker compose' v2 plugin is missing. See README.md."
  docker info >/dev/null 2>&1 \
    || die "cannot talk to the Docker daemon. Is it running, and is this user in the 'docker' group? (newgroup takes effect on next login)"
}

require_website_dir() {
  [ -d "${WEBSITE_DIR}" ] \
    || die "no website at ${WEBSITE_DIR}. Expected the repository checked out with WebsiteRT/ beside deploy-ec2/."
}

# True when the systemd unit has been installed. The scripts fall back to a
# plain foreground process when it has not, so the demo can be brought up
# before anyone has touched /etc/systemd.
website_unit_installed() {
  command -v systemctl >/dev/null 2>&1 \
    && systemctl list-unit-files "${WEBSITE_SERVICE}.service" >/dev/null 2>&1 \
    && systemctl cat "${WEBSITE_SERVICE}.service" >/dev/null 2>&1
}

# Poll a URL until it answers, rather than sleeping a fixed amount and hoping.
wait_for_http() {
  local url="$1" label="$2" timeout="${3:-180}" waited=0
  info "waiting for ${label} (${url}), up to ${timeout}s"
  while [ "${waited}" -lt "${timeout}" ]; do
    if curl -fsS --max-time 3 -o /dev/null "${url}" 2>/dev/null; then
      info "${label} is answering"
      return 0
    fi
    sleep 3
    waited=$(( waited + 3 ))
  done
  return 1
}
