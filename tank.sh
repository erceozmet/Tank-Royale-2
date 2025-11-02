#!/bin/bash

# Tank Royale 2 - Main Script Launcher
# This script provides easy access to all management scripts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/scripts" && pwd)"

case "$1" in
    setup)
        "$SCRIPT_DIR/setup-podman.sh"
        ;;
    start)
        "$SCRIPT_DIR/start-all.sh"
        ;;
    stop)
        "$SCRIPT_DIR/stop-all.sh"
        ;;
    databases)
        "$SCRIPT_DIR/start-databases.sh"
        ;;
    monitoring)
        "$SCRIPT_DIR/start-monitoring.sh"
        ;;
    help|commands|"")
        "$SCRIPT_DIR/commands.sh"
        ;;
    *)
        echo "Unknown command: $1"
        echo ""
        "$SCRIPT_DIR/commands.sh"
        exit 1
        ;;
esac
