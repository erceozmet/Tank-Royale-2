package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/config"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
	appMiddleware "github.com/erceozmet/tank-royale-2/go-server/internal/middleware"
	"github.com/erceozmet/tank-royale-2/go-server/pkg/logger"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		fmt.Printf("Warning: .env file not found, using environment variables\n")
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	logger.Init(cfg.Logging.Level, cfg.Logging.Format)
	logger.Logger.Info().Msg("Starting Tank Royale Game Server")

	// Connect to PostgreSQL
	logger.Logger.Info().Msg("Connecting to PostgreSQL...")
	pgDB, err := postgres.Connect(cfg.Database.Postgres)
	if err != nil {
		logger.Logger.Fatal().Err(err).Msg("Failed to connect to PostgreSQL")
	}
	defer pgDB.Close()
	logger.Logger.Info().Msg("Connected to PostgreSQL")

	// Connect to Redis
	logger.Logger.Info().Msg("Connecting to Redis...")
	redisDB, err := redis.Connect(cfg.Database.Redis)
	if err != nil {
		logger.Logger.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer redisDB.Close()
	logger.Logger.Info().Msg("Connected to Redis")

	// Initialize router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(appMiddleware.Metrics)

	// Prometheus metrics endpoint
	r.Handle("/metrics", promhttp.Handler())

	// Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{
			"status": "healthy",
			"timestamp": "%s",
			"service": "game-server"
		}`, time.Now().Format(time.RFC3339))
	})

	// WebSocket endpoint (TODO: implement in Phase 3)
	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotImplemented)
		fmt.Fprint(w, `{"error": "WebSocket not implemented yet"}`)
	})

	// Create HTTP server
	addr := fmt.Sprintf(":%d", cfg.Server.GamePort)
	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Setup graceful shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		logger.Logger.Info().
			Str("address", addr).
			Int("tick_rate", cfg.Game.TickRate).
			Int("max_players_per_room", cfg.Game.MaxPlayersPerRoom).
			Msg("Game server listening")
		
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Logger.Fatal().Err(err).Msg("Server failed to start")
		}
	}()

	// Start metrics updater in a goroutine
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				pgDB.UpdatePoolMetrics()
				redisDB.UpdatePoolMetrics()
			case <-quit:
				return
			}
		}
	}()

	// TODO: Start matchmaking service (Phase 5)
	// TODO: Start game room manager (Phase 4)

	// Wait for interrupt signal to gracefully shutdown the server
	<-quit

	logger.Logger.Info().Msg("Shutting down game server...")

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Logger.Error().Err(err).Msg("Server forced to shutdown")
	}

	logger.Logger.Info().Msg("Game server exited")
}
