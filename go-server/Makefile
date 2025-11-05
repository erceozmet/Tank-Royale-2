.PHONY: build run-api run-game test clean docker-build

# Build both servers
build:
	@echo "Building servers..."
	@mkdir -p bin
	go build -o bin/api cmd/api/main.go
	go build -o bin/game cmd/game/main.go
	@echo "Build complete!"

# Run API server
run-api:
	go run cmd/api/main.go

# Run game server
run-game:
	go run cmd/game/main.go

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

# Run benchmarks
bench:
	go test -bench=. -benchmem ./...

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out

# Install dependencies
deps:
	go mod download
	go mod tidy

# Docker build
docker-build:
	docker build -t tank-royale-api -f docker/Dockerfile.api .
	docker build -t tank-royale-game -f docker/Dockerfile.game .

# Development mode with hot reload (requires air)
dev-api:
	air -c .air.api.toml

dev-game:
	air -c .air.game.toml
