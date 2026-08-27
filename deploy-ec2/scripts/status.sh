#!/usr/bin/env bash
# What is running, on which ports, and does it answer.
#
#   ./scripts/status.sh
#
# Read-only. Never exits non-zero for a service being down — the point is to
# print the picture, not to gate anything on it.

set -uo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

# ---------------------------------------------------------------- Docker ---

say "Docker application (:${PORTAL_PORT})"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  compose ps || true
else
  info "docker is not available from this shell"
fi

# --------------------------------------------------------------- website ---

say "Website (:${WEBSITE_PORT})"
if website_unit_installed; then
  systemctl is-active "${WEBSITE_SERVICE}" >/dev/null 2>&1 \
    && info "${WEBSITE_SERVICE}: active" \
    || info "${WEBSITE_SERVICE}: NOT active"
  systemctl status "${WEBSITE_SERVICE}" --no-pager --lines 0 2>/dev/null | sed -n '1,6p' || true
else
  info "${WEBSITE_SERVICE}.service is not installed"
fi

# ----------------------------------------------------------------- ports ---

say "Listening sockets"
# `ss` is on Ubuntu by default; `netstat` is not. Process names need root, so
# this is run under sudo when it is available without a password prompt.
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep -E "LISTEN|:${WEBSITE_PORT}\b|:${PORTAL_PORT}\b" \
    | grep -E ":${WEBSITE_PORT}\b|:${PORTAL_PORT}\b" \
    || info "nothing listening on :${WEBSITE_PORT} or :${PORTAL_PORT}"
  info ""
  info "Expect 0.0.0.0:${WEBSITE_PORT} (next start) and 0.0.0.0:${PORTAL_PORT} (docker-proxy)."
  info "MongoDB is on 127.0.0.1:27017 INSIDE the container and must not appear here."
else
  info "ss not available"
fi

# ------------------------------------------------------------ does it work -

say "Local checks"
check() {
  local url="$1" label="$2"
  if curl -fsS --max-time 5 -o /dev/null -w '%{http_code}' "${url}" 2>/dev/null | grep -qE '^(2|3)'; then
    info "OK    ${label}  ${url}"
  else
    info "DOWN  ${label}  ${url}"
  fi
}
check "http://127.0.0.1:${PORTAL_PORT}/v1/health" "Portal API health"
check "http://127.0.0.1:${PORTAL_PORT}/"          "Portal admin CMS "
check "http://127.0.0.1:${WEBSITE_PORT}/"         "Website          "

say "Public URLs"
info "Website : http://${PUBLIC_IP}:${WEBSITE_PORT}"
info "Portal  : http://${PUBLIC_IP}:${PORTAL_PORT}"
info ""
info "Reachable locally but not from a browser? That is the EC2 Security Group."
info "It must allow inbound TCP 22, ${WEBSITE_PORT} and ${PORTAL_PORT}."

exit 0
