package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration
type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	JWT         JWTConfig
	Game        GameConfig
	Logging     LoggingConfig
	Monitoring  MonitoringConfig
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	APIPort  int
	GamePort int
	Env      string
}

// DatabaseConfig holds all database connections
type DatabaseConfig struct {
	Postgres  PostgresConfig
	Redis     RedisConfig
	Cassandra CassandraConfig
}

// PostgresConfig holds PostgreSQL configuration
type PostgresConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

// CassandraConfig holds Cassandra configuration
type CassandraConfig struct {
	Hosts    []string
	Port     int
	Keyspace string
}

// JWTConfig holds JWT authentication configuration
type JWTConfig struct {
	Secret     string
	Expiration time.Duration
}

// GameConfig holds game-related configuration
type GameConfig struct {
	TickRate            int
	MaxPlayersPerRoom   int
	MatchmakingInterval time.Duration
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string
	Format string
}

// MonitoringConfig holds monitoring configuration
type MonitoringConfig struct {
	EnableMetrics bool
	MetricsPort   int
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			APIPort:  getEnvAsInt("API_PORT", 8080),
			GamePort: getEnvAsInt("GAME_PORT", 8081),
			Env:      getEnv("ENV", "development"),
		},
		Database: DatabaseConfig{
			Postgres: PostgresConfig{
				Host:     getEnv("POSTGRES_HOST", "localhost"),
				Port:     getEnvAsInt("POSTGRES_PORT", 5432),
				User:     getEnv("POSTGRES_USER", "tankroyale"),
				Password: getEnv("POSTGRES_PASSWORD", "tankroyale"),
				Database: getEnv("POSTGRES_DB", "tankroyale"),
				SSLMode:  getEnv("POSTGRES_SSL_MODE", "disable"),
			},
			Redis: RedisConfig{
				Host:     getEnv("REDIS_HOST", "localhost"),
				Port:     getEnvAsInt("REDIS_PORT", 6379),
				Password: getEnv("REDIS_PASSWORD", ""),
				DB:       getEnvAsInt("REDIS_DB", 0),
			},
			Cassandra: CassandraConfig{
				Hosts:    []string{getEnv("CASSANDRA_HOSTS", "localhost")},
				Port:     getEnvAsInt("CASSANDRA_PORT", 9042),
				Keyspace: getEnv("CASSANDRA_KEYSPACE", "tankroyale"),
			},
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "change-me-in-production"),
			Expiration: getEnvAsDuration("JWT_EXPIRATION", 24*time.Hour),
		},
		Game: GameConfig{
			TickRate:            getEnvAsInt("GAME_TICK_RATE", 60),
			MaxPlayersPerRoom:   getEnvAsInt("MAX_PLAYERS_PER_ROOM", 10),
			MatchmakingInterval: getEnvAsDuration("MATCHMAKING_INTERVAL", 1*time.Second),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
		Monitoring: MonitoringConfig{
			EnableMetrics: getEnvAsBool("ENABLE_METRICS", true),
			MetricsPort:   getEnvAsInt("METRICS_PORT", 9090),
		},
	}

	// Validate critical configuration
	if cfg.JWT.Secret == "change-me-in-production" && cfg.Server.Env == "production" {
		return nil, fmt.Errorf("JWT_SECRET must be set in production")
	}

	return cfg, nil
}

// Helper functions to read environment variables with defaults

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

// PostgresConnectionString returns the PostgreSQL connection string
func (p PostgresConfig) ConnectionString() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		p.Host, p.Port, p.User, p.Password, p.Database, p.SSLMode,
	)
}

// RedisAddress returns the Redis address
func (r RedisConfig) Address() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}
