#!/bin/sh
# Bake the deploy's git commit into a static file the SPA reads, so the About
# dialog shows the exact running revision. Platforms expose the commit at
# RUNTIME (Render sets RENDER_GIT_COMMIT), which build args can't capture — so
# we write it here, on container start, before nginx serves. Falls back to the
# build-time stamp baked by Vite when no runtime commit is present (e.g. local).
set -e
commit="${RENDER_GIT_COMMIT:-${BUILD_COMMIT:-}}"
target="/usr/share/nginx/html/build-info.js"
if [ -n "$commit" ]; then
  printf 'window.__BUILD_COMMIT__=%s;\n' "\"$commit\"" > "$target"
fi
