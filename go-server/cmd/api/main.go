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
	"github.com/go-chi/cors"
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
	logger.Logger.Info().Msg("Starting Tank Royale API Server")

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
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(appMiddleware.Metrics) // Add metrics middleware

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "http://127.0.0.1:*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		// Check database health
		pgHealth := pgDB.Health() == nil
		redisHealth := redisDB.Health() == nil
		
		status := "healthy"
		httpStatus := http.StatusOK
		
		if !pgHealth || !redisHealth {
			status = "unhealthy"
			httpStatus = http.StatusServiceUnavailable
		}
		
		w.WriteHeader(httpStatus)
		fmt.Fprintf(w, `{
			"status": "%s",
			"timestamp": "%s",
			"services": {
				"postgres": %t,
				"redis": %t
			}
		}`, status, time.Now().Format(time.RFC3339), pgHealth, redisHealth)
	})

	// Prometheus metrics endpoint
	r.Handle("/metrics", promhttp.Handler())

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Version info
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{
				"name": "Tank Royale API",
				"version": "2.0.0-go",
				"language": "Go",
				"status": "migrating"
			}`)
		})

		// Test database query endpoint for metrics demonstration
		r.Get("/test/db", func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			
			// Test PostgreSQL query
			var count int
			pgErr := pgDB.Pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM users").Scan(&count)
			pgDB.RecordQuery("test_count_users", time.Since(start))
			
			// Test Redis operation
			redisStart := time.Now()
			redisErr := redisDB.Client.Set(r.Context(), "test:ping", "pong", 10*time.Second).Err()
			redisDB.RecordQuery("test_set", time.Since(redisStart))
			
			w.Header().Set("Content-Type", "application/json")
			if pgErr != nil || redisErr != nil {
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprintf(w, `{"error": "Database error", "postgres": "%v", "redis": "%v"}`, pgErr, redisErr)
				return
			}
			
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"status": "ok", "postgres_users": %d, "redis": "ok"}`, count)
		})

		// Auth routes (TODO: implement in Phase 2)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotImplemented)
				fmt.Fprint(w, `{"error": "Not implemented yet"}`)
			})
			
			r.Post("/login", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotImplemented)
				fmt.Fprint(w, `{"error": "Not implemented yet"}`)
			})
			
			r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotImplemented)
				fmt.Fprint(w, `{"error": "Not implemented yet"}`)
			})
		})

		// Leaderboard routes (TODO: implement in Phase 2)
		r.Get("/leaderboard", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotImplemented)
			fmt.Fprint(w, `{"error": "Not implemented yet"}`)
		})

		// Stats routes (TODO: implement in Phase 2)
		r.Get("/stats/{playerID}", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotImplemented)
			fmt.Fprint(w, `{"error": "Not implemented yet"}`)
		})
	})

	// Create HTTP server
	addr := fmt.Sprintf(":%d", cfg.Server.APIPort)
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
			Msg("API server listening")
		
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

	// Wait for interrupt signal to gracefully shutdown the server
	<-quit

	logger.Logger.Info().Msg("Shutting down server...")

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Logger.Error().Err(err).Msg("Server forced to shutdown")
	}

	logger.Logger.Info().Msg("Server exited")
}
