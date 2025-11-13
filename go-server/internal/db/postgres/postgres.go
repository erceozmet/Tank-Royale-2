package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/config"
	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB holds the PostgreSQL connection pool
type DB struct {
	Pool *pgxpool.Pool
}

// Connect establishes a connection to PostgreSQL
func Connect(cfg config.PostgresConfig) (*DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	connStr := cfg.ConnectionString()

	poolConfig, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("unable to parse connection string: %w", err)
	}

	// Set connection pool settings
	poolConfig.MaxConns = 25
	poolConfig.MinConns = 5
	poolConfig.MaxConnLifetime = time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Test the connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return &DB{Pool: pool}, nil
}

// Close closes the database connection pool
func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

// Health checks the database connection health
func (db *DB) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return db.Pool.Ping(ctx)
}

// UpdatePoolMetrics updates Prometheus metrics with current pool stats
func (db *DB) UpdatePoolMetrics() {
	if db.Pool != nil {
		stat := db.Pool.Stat()
		// Active connections = connections currently executing queries
		metrics.DBConnectionsActive.Set(float64(stat.AcquiredConns()))
		// Idle connections = connections in pool but not in use
		metrics.DBConnectionsIdle.Set(float64(stat.IdleConns()))
		// Total connections = active + idle
		metrics.DBConnectionsTotal.Set(float64(stat.TotalConns()))
	}
}

// RecordQuery records a database query with metrics
func (db *DB) RecordQuery(operation string, duration time.Duration) {
	metrics.DBQueryDuration.WithLabelValues(operation).Observe(duration.Seconds())
}
