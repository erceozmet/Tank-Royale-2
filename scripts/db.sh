#!/bin/bash

# Script to start/stop/restart Tank Royale databases

case "$1" in
  start)
    echo "🚀 Starting Tank Royale databases..."
    podman start tank-postgres tank-redis tank-cassandra 2>/dev/null || {
      echo "⚠️  Containers don't exist. Run './scripts/setup-databases.sh' first"
      exit 1
    }
    echo "✅ Databases started!"
    podman ps --filter "name=tank-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
    
  stop)
    echo "🛑 Stopping Tank Royale databases..."
    podman stop tank-postgres tank-redis tank-cassandra 2>/dev/null
    echo "✅ Databases stopped!"
    ;;
    
  restart)
    echo "🔄 Restarting Tank Royale databases..."
    podman restart tank-postgres tank-redis tank-cassandra
    echo "✅ Databases restarted!"
    ;;
    
  status)
    echo "📊 Tank Royale Database Status:"
    podman ps -a --filter "name=tank-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
    
  logs)
    if [ -z "$2" ]; then
      echo "Usage: $0 logs [postgres|redis|cassandra]"
      exit 1
    fi
    podman logs -f "tank-$2"
    ;;
    
  *)
    echo "Tank Royale Database Manager"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all database containers"
    echo "  stop    - Stop all database containers"
    echo "  restart - Restart all database containers"
    echo "  status  - Show container status"
    echo "  logs    - View logs (e.g., logs postgres)"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs postgres"
    exit 1
    ;;
esac
