#!/bin/sh
# Bake the deploy's git commit into a static file the SPA reads, so the About
# dialog shows the exact running revision. Platforms expose the commit at
# RUNTIME (Railway sets RAILWAY_GIT_COMMIT_SHA), which build args can't capture — so
# we write it here, on container start, before nginx serves. Falls back to the
# build-time stamp baked by Vite when no runtime commit is present (e.g. local).
set -e
commit="${RAILWAY_GIT_COMMIT_SHA:-${BUILD_COMMIT:-}}"
target="/usr/share/nginx/html/build-info.js"
if [ -n "$commit" ]; then
  printf 'window.__BUILD_COMMIT__=%s;\n' "\"$commit\"" > "$target"
fi
