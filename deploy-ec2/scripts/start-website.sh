#!/usr/bin/env bash
# Build and start the public website on the EC2 host, on 0.0.0.0:3000.
#
#   ./scripts/start-website.sh                build, then start (or restart)
#   ./scripts/start-website.sh --build-only   npm ci + npm run build
#   ./scripts/start-website.sh --start-only   start/restart what is built
#
# The website is NOT a container. This project has no `output: "standalone"`,
# so the production start mechanism is `next start` over the `.next` build in
# WebsiteRT/ — which is what the systemd unit runs.

set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

DO_BUILD=true
DO_START=true
case "${1:-}" in
  --build-only) DO_START=false ;;
  --start-only) DO_BUILD=false ;;
  "")           ;;
  -h|--help)    sed -n '2,10p' "$0"; exit 0 ;;
  *)            die "unknown option: $1" ;;
esac

require_website_dir
command -v node >/dev/null 2>&1 || die "node is not installed. See README.md, 'Node.js'."
command -v npm  >/dev/null 2>&1 || die "npm is not installed. See README.md, 'Node.js'."

# ----------------------------------------------------------------- build ---

if [ "${DO_BUILD}" = true ]; then
  [ -f "${WEBSITE_DIR}/.env.local" ] \
    || die "no ${WEBSITE_DIR}/.env.local. NEXT_PUBLIC_API_URL is inlined at build time, so building without it bakes in the mock content. cp ${DEPLOY_DIR}/website.env.example ${WEBSITE_DIR}/.env.local"

  say "Installing website dependencies"
  # The full tree, devDependencies included: `next build` needs tailwindcss,
  # @tailwindcss/postcss and typescript, all of which live there. `--omit=dev`
  # would install cleanly and then fail the build, which is a confusing way to
  # find out.
  #
  # `npm ci` when there is a lockfile to honour, because it is the reproducible
  # form; `npm install` only as a fallback.
  if [ -f "${WEBSITE_DIR}/package-lock.json" ]; then
    ( cd "${WEBSITE_DIR}" && npm ci --no-audit --no-fund )
  else
    ( cd "${WEBSITE_DIR}" && npm install --no-audit --no-fund )
  fi

  say "Building the website (next build)"
  # A Next build wants around 2 GB. On a 4 GiB instance with the Portal
  # container also running, that is close enough to the ceiling to say so.
  info "this needs ~2 GB of RAM and a few minutes; see README.md if it is OOM-killed"
  ( cd "${WEBSITE_DIR}" && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build )
fi

# ----------------------------------------------------------------- start ---

if [ "${DO_START}" = true ]; then
  [ -d "${WEBSITE_DIR}/.next" ] \
    || die "no build at ${WEBSITE_DIR}/.next — run this without --start-only first."

  if website_unit_installed; then
    say "Restarting ${WEBSITE_SERVICE}"
    sudo systemctl restart "${WEBSITE_SERVICE}"
    if ! wait_for_http "http://127.0.0.1:${WEBSITE_PORT}/" "the website" 90; then
      sudo journalctl -u "${WEBSITE_SERVICE}" -n 50 --no-pager || true
      die "the website did not answer on :${WEBSITE_PORT} within 90s. Logs above."
    fi
  else
    # The unit is the intended way to run this. Without it nothing restarts the
    # site after a crash or a reboot, so say so rather than quietly leaving a
    # demo that dies with the SSH session.
    warn "${WEBSITE_SERVICE}.service is not installed, so the site will not survive a crash or a reboot."
    warn "Install it:  sudo cp ${DEPLOY_DIR}/csistmc-website.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now ${WEBSITE_SERVICE}"
    say "Starting the website in the foreground instead (Ctrl-C to stop)"
    cd "${WEBSITE_DIR}"
    export NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
    exec npm run start -- -H 0.0.0.0 -p "${WEBSITE_PORT}"
  fi
fi
