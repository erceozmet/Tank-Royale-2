.PHONY: help setup start stop restart status clean logs test build dev

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

##@ General

help: ## Show this help message
	@echo "$(BLUE)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║              Tank Royale 2 - Task Runner                    ║$(NC)"
	@echo "$(BLUE)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make $(YELLOW)<target>$(NC)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

##@ Setup & Installation

setup: ## First-time setup (creates all containers)
	@echo "$(BLUE)Setting up Tank Royale 2...$(NC)"
	@./scripts/setup-podman.sh

install: ## Install dependencies for all projects
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@cd go-server && go mod download && go mod tidy
	@echo "$(GREEN)✓ Go dependencies installed$(NC)"

##@ Container Management

containers-start: ## Start all containers only
	@echo "$(BLUE)Starting containers...$(NC)"
	@./scripts/start-all.sh

containers-stop: ## Stop all containers
	@echo "$(YELLOW)Stopping containers...$(NC)"
	@./scripts/stop-all.sh

containers-restart: ## Restart all containers
	@$(MAKE) containers-stop
	@$(MAKE) containers-start

containers-status: ## Check container status
	@echo "$(BLUE)Container Status:$(NC)"
	@podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

containers-logs: ## View container logs (usage: make containers-logs SERVICE=postgres)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: Please specify SERVICE (e.g., make containers-logs SERVICE=postgres)$(NC)"; \
		exit 1; \
	fi
	@podman logs -f tank-$(SERVICE)

containers-clean: ## Remove all containers and volumes (CAUTION: deletes data)
	@echo "$(RED)⚠️  WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	@podman compose down -v
	@echo "$(GREEN)✓ All containers and volumes removed$(NC)"

##@ Database Management

db-start: ## Start databases only (PostgreSQL, Redis, Cassandra)
	@echo "$(BLUE)Starting databases...$(NC)"
	@./scripts/start-databases.sh

db-status: ## Check database connection status
	@echo "$(BLUE)Database Status:$(NC)"
	@echo -n "PostgreSQL: "
	@podman exec tank-postgres pg_isready -U tank_user -d tank_royale > /dev/null 2>&1 && echo "$(GREEN)✓ Ready$(NC)" || echo "$(RED)✗ Not Ready$(NC)"
	@echo -n "Redis: "
	@podman exec tank-redis redis-cli ping > /dev/null 2>&1 && echo "$(GREEN)✓ Ready$(NC)" || echo "$(RED)✗ Not Ready$(NC)"
	@echo -n "Cassandra: "
	@podman exec tank-cassandra cqlsh -e "describe keyspaces" > /dev/null 2>&1 && echo "$(GREEN)✓ Ready$(NC)" || echo "$(RED)✗ Not Ready$(NC)"

db-shell-postgres: ## Open PostgreSQL shell
	@podman exec -it tank-postgres psql -U tank_user -d tank_royale

db-shell-redis: ## Open Redis CLI
	@podman exec -it tank-redis redis-cli

db-shell-cassandra: ## Open Cassandra CQL shell
	@podman exec -it tank-cassandra cqlsh

db-reset-postgres: ## Reset PostgreSQL database (CAUTION: deletes data)
	@echo "$(RED)⚠️  WARNING: This will delete all PostgreSQL data!$(NC)"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	@podman exec tank-postgres psql -U tank_user -d postgres -c "DROP DATABASE IF EXISTS tank_royale;"
	@podman exec tank-postgres psql -U tank_user -d postgres -c "CREATE DATABASE tank_royale;"
	@echo "$(GREEN)✓ PostgreSQL database reset$(NC)"

##@ Go Server Management

go-build: ## Build Go servers (API + Game)
	@echo "$(BLUE)Building Go servers...$(NC)"
	@cd go-server && make build
	@echo "$(GREEN)✓ Go servers built$(NC)"

go-start: ## Start Go servers (API + Game)
	@echo "$(BLUE)Starting Go servers...$(NC)"
	@./scripts/start-go-servers.sh

go-stop: ## Stop Go servers
	@echo "$(YELLOW)Stopping Go servers...$(NC)"
	@./scripts/stop-go-servers.sh

go-restart: ## Restart Go servers
	@$(MAKE) go-stop
	@sleep 2
	@$(MAKE) go-start

go-logs-api: ## View API server logs
	@tail -f /tmp/tank-api.log

go-logs-game: ## View Game server logs
	@tail -f /tmp/tank-game.log

go-test: ## Run Go tests
	@echo "$(BLUE)Running Go tests...$(NC)"
	@cd go-server && go test -v ./...

go-test-coverage: ## Run Go tests with coverage
	@echo "$(BLUE)Running Go tests with coverage...$(NC)"
	@cd go-server && go test -coverprofile=coverage.out ./...
	@cd go-server && go tool cover -html=coverage.out -o coverage.html
	@echo "$(GREEN)✓ Coverage report: go-server/coverage.html$(NC)"

go-fmt: ## Format Go code
	@echo "$(BLUE)Formatting Go code...$(NC)"
	@cd go-server && go fmt ./...
	@echo "$(GREEN)✓ Go code formatted$(NC)"

##@ Monitoring

monitoring-start: ## Start monitoring stack (Prometheus + Grafana)
	@echo "$(BLUE)Starting monitoring...$(NC)"
	@./scripts/start-monitoring.sh

monitoring-open-grafana: ## Open Grafana in browser
	@echo "$(BLUE)Opening Grafana...$(NC)"
	@xdg-open http://localhost:3001 || open http://localhost:3001

monitoring-open-prometheus: ## Open Prometheus in browser
	@echo "$(BLUE)Opening Prometheus...$(NC)"
	@xdg-open http://localhost:9090 || open http://localhost:9090

##@ Development Workflows

start: ## 🚀 Start everything (containers + Go servers)
	@echo "$(BLUE)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║          Starting Tank Royale 2 - Everything               ║$(NC)"
	@echo "$(BLUE)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@./scripts/start-all.sh
	@echo ""
	@echo "$(BLUE)Starting Go Servers...$(NC)"
	@./scripts/start-go-servers.sh
	@echo ""
	@$(MAKE) status

stop: ## 🛑 Stop everything (containers + Go servers)
	@echo "$(YELLOW)Stopping everything...$(NC)"
	@./scripts/stop-go-servers.sh
	@./scripts/stop-all.sh

restart: ## 🔄 Restart everything
	@$(MAKE) stop
	@sleep 2
	@$(MAKE) start

status: ## 📊 Show status of all services
	@echo "$(BLUE)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║              Tank Royale 2 - Service Status                 ║$(NC)"
	@echo "$(BLUE)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(BLUE)Containers:$(NC)"
	@podman ps --format "  ✓ {{.Names}}: {{.Status}}" 2>/dev/null || echo "  $(RED)✗ No containers running$(NC)"
	@echo ""
	@echo "$(BLUE)Go Servers:$(NC)"
	@if [ -f /tmp/tank-api.pid ] && kill -0 $$(cat /tmp/tank-api.pid) 2>/dev/null; then \
		echo "  $(GREEN)✓ API Server: Running (PID: $$(cat /tmp/tank-api.pid))$(NC)"; \
	else \
		echo "  $(RED)✗ API Server: Not running$(NC)"; \
	fi
	@if [ -f /tmp/tank-game.pid ] && kill -0 $$(cat /tmp/tank-game.pid) 2>/dev/null; then \
		echo "  $(GREEN)✓ Game Server: Running (PID: $$(cat /tmp/tank-game.pid))$(NC)"; \
	else \
		echo "  $(RED)✗ Game Server: Not running$(NC)"; \
	fi
	@echo ""
	@echo "$(BLUE)Health Checks:$(NC)"
	@curl -s http://localhost:8080/health > /dev/null 2>&1 && echo "  $(GREEN)✓ API Server: Healthy$(NC)" || echo "  $(RED)✗ API Server: Unhealthy$(NC)"
	@curl -s http://localhost:8081/health > /dev/null 2>&1 && echo "  $(GREEN)✓ Game Server: Healthy$(NC)" || echo "  $(RED)✗ Game Server: Unhealthy$(NC)"
	@echo ""

dev: ## 💻 Start development mode (containers + Go servers with rebuild)
	@$(MAKE) go-build
	@$(MAKE) start

health: ## 🏥 Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo -n "API Server: "
	@curl -s http://localhost:8080/health | jq -r '.status' 2>/dev/null && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo -n "Game Server: "
	@curl -s http://localhost:8081/health | jq -r '.status' 2>/dev/null && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"

open-api: ## 🌐 Open API documentation
	@xdg-open http://localhost:8080/api/ || open http://localhost:8080/api/

urls: ## 📋 Show all service URLs
	@echo "$(BLUE)Service URLs:$(NC)"
	@echo "  API Server:       http://localhost:8080"
	@echo "  Game Server:      http://localhost:8081"
	@echo "  Grafana:          http://localhost:3001 (admin/admin123)"
	@echo "  Prometheus:       http://localhost:9090"
	@echo "  pgAdmin:          http://localhost:5050 (admin@tankroyale.com/admin123)"
	@echo "  Redis Commander:  http://localhost:8082"

##@ Testing & Quality

test: ## Run all tests
	@$(MAKE) go-test

test-coverage: ## Run tests with coverage report
	@$(MAKE) go-test-coverage

lint: ## Run linters
	@echo "$(BLUE)Running Go linters...$(NC)"
	@cd go-server && golangci-lint run || echo "$(YELLOW)Note: Install golangci-lint for linting$(NC)"

fmt: ## Format all code
	@$(MAKE) go-fmt

##@ Load Testing

load-test-setup: ## Setup load test users
	@echo "$(BLUE)Setting up load test users...$(NC)"
	@cd load-tests && npm install && npm run setup

load-test-api: ## Run API load test
	@echo "$(BLUE)Running API load test...$(NC)"
	@cd load-tests && npm run test:api

load-test-websocket: ## Run WebSocket load test
	@echo "$(BLUE)Running WebSocket load test...$(NC)"
	@cd load-tests && npm run test:websocket

load-test-quick: ## Run quick load test
	@echo "$(BLUE)Running quick load test...$(NC)"
	@cd load-tests && npm run test:quick

load-test-all: ## Run all load tests
	@echo "$(BLUE)Running all load tests...$(NC)"
	@cd load-tests && npm run test:all

##@ Utilities

clean: ## Clean build artifacts and logs
	@echo "$(YELLOW)Cleaning up...$(NC)"
	@rm -rf go-server/bin/
	@rm -f /tmp/tank-*.log
	@rm -f /tmp/tank-*.pid
	@cd go-server && rm -f coverage.out coverage.html
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

logs: ## Show all logs (usage: make logs SERVICE=api|game|postgres|redis|cassandra|grafana)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: Please specify SERVICE$(NC)"; \
		echo "Examples:"; \
		echo "  make logs SERVICE=api"; \
		echo "  make logs SERVICE=game"; \
		echo "  make logs SERVICE=postgres"; \
		exit 1; \
	fi
	@if [ "$(SERVICE)" = "api" ]; then \
		tail -f /tmp/tank-api.log; \
	elif [ "$(SERVICE)" = "game" ]; then \
		tail -f /tmp/tank-game.log; \
	else \
		podman logs -f tank-$(SERVICE); \
	fi

ps: ## Show running processes
	@echo "$(BLUE)Running Processes:$(NC)"
	@ps aux | grep -E "bin/(api|game)" | grep -v grep || echo "No Go servers running"

ports: ## Show ports in use
	@echo "$(BLUE)Ports in use:$(NC)"
	@lsof -i :8080 -i :8081 -i :5432 -i :6379 -i :9042 -i :3001 -i :9090 -i :5050 -i :8082 2>/dev/null || echo "No services using standard ports"

##@ Documentation

docs: ## Open documentation
	@echo "$(BLUE)Available documentation:$(NC)"
	@echo "  - README.md"
	@echo "  - START_HERE.md"
	@echo "  - BOOT_COMMANDS.md"
	@echo "  - QUICK_COMMANDS.md"
	@echo "  - GO_MIGRATION_STRATEGY.md"

quickstart: ## Show quick start guide
	@cat .quickstart

version: ## Show version information
	@echo "$(BLUE)Tank Royale 2$(NC)"
	@echo "Go version: $$(cd go-server && go version)"
	@echo "Podman version: $$(podman --version)"
