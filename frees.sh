#!/usr/bin/env bash
# frEES server management. Servers run as Docker containers, so start/stop
# never requires hunting for stray processes.
set -euo pipefail

cd "$(dirname "$0")"

usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|build}"
    echo
    echo "  start           Build (if needed) and start backend + frontend containers"
    echo "  stop            Stop and remove the containers"
    echo "  restart         stop, then start"
    echo "  status          Show container status"
    echo "  logs            Follow container logs (Ctrl-C to detach)"
    echo "  build [target]  Build docker images (target: backend, frontend, or all (default))"
    exit 1
}

case "${1:-}" in
    start)
        docker compose up -d --build
        echo
        echo "frEES is starting:"
        echo "  Frontend: http://localhost:5173"
        echo "  Backend:  http://localhost:8080/api"
        ;;
    stop)
        docker compose down
        echo "frEES stopped."
        ;;
    restart)
        docker compose down
        docker compose up -d --build
        echo "frEES restarted: http://localhost:5173"
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
            backend)
                docker compose build backend
                ;;
            frontend)
                docker compose build frontend
                ;;
            all)
                docker compose build
                ;;
            *)
                echo "Unknown build target: $target. Supported: backend, frontend, all"
                exit 1
                ;;
        esac
        ;;
    *)
        usage
        ;;
esac
