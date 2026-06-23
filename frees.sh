#!/usr/bin/env bash
# frees server management. Servers run as Docker containers, so start/stop
# never requires hunting for stray processes.
set -euo pipefail

cd "$(dirname "$0")"

# Stamp the frontend build with the current commit so the About dialog can show
# (and link to) the exact revision it was built from. See CLAUDE.md "Build stamping".
export VITE_COMMIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"

usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|build}"
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
