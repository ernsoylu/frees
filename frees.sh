#!/usr/bin/env bash
# frEES server management. Servers run as Docker containers, so start/stop
# never requires hunting for stray processes.
set -euo pipefail

cd "$(dirname "$0")"

usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|rebuild}"
    echo
    echo "  start    Build (if needed) and start backend + frontend containers"
    echo "  stop     Stop and remove the containers"
    echo "  restart  stop, then start"
    echo "  status   Show container status"
    echo "  logs     Follow container logs (Ctrl-C to detach)"
    echo "  rebuild  Force a clean image rebuild, then start"
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
    rebuild)
        docker compose down
        docker compose build --no-cache
        docker compose up -d
        echo "frEES rebuilt and started: http://localhost:5173"
        ;;
    *)
        usage
        ;;
esac
