#!/usr/bin/env bash
# frees server management. Servers run as Docker containers, so start/stop
# never requires hunting for stray processes.
set -euo pipefail

cd "$(dirname "$0")"

# On macOS, the Docker CLI config (~/.docker/config.json) typically points
# credsStore at "osxkeychain", whose helper binary is shipped by whichever
# Docker backend is installed (Docker Desktop, Rancher Desktop, ...) rather
# than being preinstalled on PATH. Two ways this bites:
#   1. The helper simply isn't on PATH in the shell that invoked this script.
#   2. The backend app (e.g. Rancher Desktop) hasn't finished starting up yet,
#      so the helper symlink doesn't exist on disk at all.
# Either way `docker compose` fails deep inside a build with:
#   error getting credentials - err: exec: "docker-credential-osxkeychain": executable file not found in $PATH
# This never happens on Linux, where Docker Engine has no credsStore configured
# by default. Check for it up front with a clear, actionable message instead.
preflight_macos_docker() {
    [[ "$(uname -s)" == "Darwin" ]] || return 0

    if ! command -v docker-credential-osxkeychain >/dev/null 2>&1; then
        local candidates=(
            "$HOME/.rd/bin"                                    # Rancher Desktop
            "/Applications/Docker.app/Contents/Resources/bin"  # Docker Desktop
            "/opt/homebrew/bin"                                # brew install docker-credential-helper
            "/usr/local/bin"
        )
        local dir
        for dir in "${candidates[@]}"; do
            if [[ -x "$dir/docker-credential-osxkeychain" ]]; then
                export PATH="$dir:$PATH"
                break
            fi
        done
    fi

    if ! docker info >/dev/null 2>&1; then
        echo "Error: the Docker backend isn't reachable." >&2
        echo "If you're using Rancher Desktop, make sure it's fully started (check the menu bar icon), then retry." >&2
        echo "If you're using Docker Desktop, make sure it's running." >&2
        exit 1
    fi

    if ! command -v docker-credential-osxkeychain >/dev/null 2>&1; then
        cat >&2 <<'EOF'
Warning: ~/.docker/config.json references "docker-credential-osxkeychain" as the
credential store, but that helper isn't on PATH or in any known install location.
`docker compose` may fail with:
  error getting credentials - err: exec: "docker-credential-osxkeychain": executable file not found in $PATH

Fix options:
  1. Make sure your Docker backend (Rancher Desktop / Docker Desktop) is fully
     started — it's the one that provides this helper.
  2. Add it to PATH manually, e.g. (Rancher Desktop):
       export PATH="$HOME/.rd/bin:$PATH"
  3. Or drop the "credsStore" line from ~/.docker/config.json — it's only
     needed for authenticated registries, not the public images frees pulls.
EOF
    fi
}
preflight_macos_docker

# Stamp the frontend build with the current commit so the About dialog can show
# (and link to) the exact revision it was built from. See CLAUDE.md "Build stamping".
export VITE_COMMIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"

usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|build|rebuild}"
    echo
    echo "  start           Build (if needed) and start the full distributed stack:"
    echo "                  redis, rabbitmq, otel-collector, jaeger, api-node,"
    echo "                  compute-node (x3), frontend"
    echo "  stop            Stop and remove the containers"
    echo "  restart         stop, then start"
    echo "  status          Show container status"
    echo "  logs            Follow container logs (Ctrl-C to detach)"
    echo "  build [target]  Build docker images (target: api, compute, frontend,"
    echo "                  infra, or all (default))"
    echo "  rebuild         Force clean image rebuild (no cache)"
    exit 1
}

case "${1:-}" in
    start)
        docker compose up -d --build
        echo
        echo "frees is starting:"
        echo "  Frontend:      http://localhost:5173"
        echo "  API node:      http://localhost:8080/api"
        echo "  RabbitMQ mgmt: http://localhost:15672  (guest/guest)"
        echo "  Jaeger UI:     http://localhost:16686"
        ;;
    stop)
        docker compose down
        echo "frees stopped."
        ;;
    restart)
        docker compose down
        docker compose up -d --build
        echo "frees restarted: http://localhost:5173"
        ;;
    status)
        docker compose ps
        ;;
    logs)
        docker compose logs -f
        ;;
    rebuild)
        docker compose build --no-cache
        echo "Images rebuilt from scratch. Run '$0 start' to start them."
        ;;
    build)
        target="${2:-all}"
        case "$target" in
            api)
                docker compose build api-node
                ;;
            compute)
                docker compose build compute-node
                ;;
            frontend)
                docker compose build frontend
                ;;
            infra)
                docker compose build api-node compute-node frontend
                ;;
            all)
                docker compose build
                ;;
            *)
                echo "Unknown build target: $target. Supported: api, compute, frontend, infra, all"
                exit 1
                ;;
        esac
        ;;
    *)
        usage
        ;;
esac
