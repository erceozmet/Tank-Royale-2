package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/config"
	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
	"github.com/redis/go-redis/v9"
)

// DB holds the Redis client
type DB struct {
	Client *redis.Client
}

// Connect establishes a connection to Redis
func Connect(cfg config.RedisConfig) (*DB, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         cfg.Address(),
		Password:     cfg.Password,
		DB:           cfg.DB,
		DialTimeout:  10 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     100,
		MinIdleConns: 10,
	})

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("unable to connect to redis: %w", err)
	}

	return &DB{Client: client}, nil
}

// Close closes the Redis connection
func (db *DB) Close() error {
	if db.Client != nil {
		return db.Client.Close()
	}
	return nil
}

// Health checks the Redis connection health
func (db *DB) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return db.Client.Ping(ctx).Err()
}

// UpdatePoolMetrics updates Prometheus metrics with current pool stats
func (db *DB) UpdatePoolMetrics() {
	if db.Client != nil {
		stats := db.Client.PoolStats()
		// Track idle connections as a proxy for pool health
		metrics.DBConnectionsActive.Set(float64(stats.TotalConns - stats.IdleConns))
	}
}

// RecordQuery records a Redis operation with metrics
func (db *DB) RecordQuery(operation string, duration time.Duration) {
	metrics.DBQueryDuration.WithLabelValues(operation).Observe(duration.Seconds())
}
