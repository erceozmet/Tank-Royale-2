package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP Metrics
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// Database Metrics
	DBConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_active",
			Help: "Number of active database connections",
		},
	)

	DBQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Duration of database queries in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"query_type"},
	)

	DBQueriesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "db_queries_total",
			Help: "Total number of database queries",
		},
		[]string{"query_type", "status"},
	)

	// WebSocket Metrics (for game server)
	WSConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "websocket_connections_active",
			Help: "Number of active WebSocket connections",
		},
	)

	WSMessagesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "websocket_messages_total",
			Help: "Total number of WebSocket messages",
		},
		[]string{"type", "direction"},
	)

	// Game Metrics
	ActiveRooms = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "game_rooms_active",
			Help: "Number of active game rooms",
		},
	)

	ActivePlayers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "game_players_active",
			Help: "Number of active players",
		},
	)

	GamesTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "games_total",
			Help: "Total number of games played",
		},
	)

	GameDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "game_duration_seconds",
			Help:    "Duration of games in seconds",
			Buckets: []float64{60, 120, 180, 300, 600, 900},
		},
	)

	// System Metrics
	GoRoutinesActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "goroutines_active",
			Help: "Number of active goroutines",
		},
	)
)
