#!/bin/sh
# Fix up volume ownership, then drop privileges and hand over.
#
# The problem
# -----------
# A volume mounted at /data arrives owned by root, whatever the image said when
# it built the directory — Docker creates the mount point on the host and the
# container's own `chown` never applied to it. `mongod` running as an
# unprivileged user then cannot create its data files, and the container dies on
# first boot with a permissions error that looks like a broken image.
#
# So the container starts as root, corrects ownership of the two writable paths,
# and immediately becomes `portal` for everything that follows. Nothing that
# serves a request ever runs as root.
#
# The other case
# --------------
# Some platforms — OpenShift, and anything using a `runAsUser` policy — start
# the container as an arbitrary non-root UID of their choosing. There is no
# privilege to drop and no ownership to correct, so we simply exec. Those
# platforms also put the process in group 0, which is why the image's writable
# directories are group-writable rather than owned by a specific user.

set -e

if [ "$(id -u)" = "0" ]; then
    # `|| true`: on a bind mount from a host filesystem that does not support
    # ownership at all (a Windows or macOS share, or a network filesystem),
    # chown fails and the files are already world-writable anyway. Refusing to
    # start over it would break the most common way of trying this image out.
    chown -R 10001:0 /data /app/backend/uploads 2>/dev/null || true

    if command -v gosu > /dev/null 2>&1; then
        exec gosu portal "$@"
    fi
    if command -v setpriv > /dev/null 2>&1; then
        exec setpriv --reuid=10001 --regid=0 --clear-groups "$@"
    fi

    # Neither tool present. Running as root is worse than not running at all
    # would be unhelpful here — say what happened and carry on, so a deployment
    # is degraded rather than dead.
    echo "[portal] warning: no gosu or setpriv — continuing as root" >&2
fi

exec "$@"
