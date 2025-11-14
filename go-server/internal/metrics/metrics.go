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
			Help: "Number of active database connections (executing queries)",
		},
	)

	DBConnectionsIdle = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_idle",
			Help: "Number of idle database connections in pool",
		},
	)

	DBConnectionsTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_total",
			Help: "Total number of database connections (active + idle)",
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

	// Authentication Metrics
	AuthAttempts = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "auth_attempts_total",
			Help: "Total number of authentication attempts",
		},
		[]string{"status"}, // success or failure
	)

	// Cache Metrics
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"cache_type"}, // user, session, leaderboard, etc.
	)

	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"cache_type"},
	)

	CacheOperationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "cache_operation_duration_seconds",
			Help:    "Duration of cache operations in seconds",
			Buckets: []float64{.001, .005, .01, .025, .05, .1},
		},
		[]string{"operation", "cache_type"}, // get, set, delete
	)

	// Game Logic Metrics
	GameTickDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "game_tick_duration_seconds",
			Help:    "Duration of game tick processing in seconds",
			Buckets: []float64{.001, .005, .01, .02, .033, .05, .1}, // 30 TPS = 33ms target
		},
	)

	PlayerMovementsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_player_movements_total",
			Help: "Total number of player movement updates processed",
		},
		[]string{"movement_type"}, // walk, sprint, dash
	)

	MovementValidationDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "game_movement_validation_duration_seconds",
			Help:    "Duration of movement validation (collision detection) in seconds",
			Buckets: []float64{.0001, .0005, .001, .005, .01},
		},
	)

	CollisionChecksTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "game_collision_checks_total",
			Help: "Total number of collision checks performed",
		},
	)

	CollisionsDetectedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_collisions_detected_total",
			Help: "Total number of collisions detected",
		},
		[]string{"collision_type"}, // player_obstacle, player_projectile, player_boundary
	)

	HitboxChecksTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "game_hitbox_checks_total",
			Help: "Total number of hitbox checks performed",
		},
	)

	HitboxHitsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_hitbox_hits_total",
			Help: "Total number of successful hitbox hits",
		},
		[]string{"hit_type"}, // projectile, melee, explosion
	)

	WeaponPickupsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_weapon_pickups_total",
			Help: "Total number of weapon pickups",
		},
		[]string{"weapon_type"}, // pistol, rifle, shotgun, sniper
	)

	LootSpawned = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_loot_spawned_total",
			Help: "Total number of loot items spawned",
		},
		[]string{"loot_type"}, // weapon, health, armor, ammo
	)

	LootCollected = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_loot_collected_total",
			Help: "Total number of loot items collected",
		},
		[]string{"loot_type"},
	)

	LootSpawnDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "game_loot_spawn_duration_seconds",
			Help:    "Duration of loot spawn operations in seconds",
			Buckets: []float64{.0001, .0005, .001, .005, .01},
		},
	)

	ActiveLootItems = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "game_active_loot_items",
			Help: "Current number of active loot items in all games",
		},
	)

	ProjectilesFired = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_projectiles_fired_total",
			Help: "Total number of projectiles fired",
		},
		[]string{"weapon_type"},
	)

	ProjectilesActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "game_projectiles_active",
			Help: "Current number of active projectiles",
		},
	)

	DamageDealt = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "game_damage_dealt",
			Help:    "Amount of damage dealt by weapon type",
			Buckets: []float64{5, 10, 20, 30, 50, 75, 100, 150},
		},
		[]string{"weapon_type"},
	)

	PlayerDeaths = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "game_player_deaths_total",
			Help: "Total number of player deaths",
		},
		[]string{"death_cause"}, // weapon, safezone, fall
	)

	PhysicsUpdateDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "game_physics_update_duration_seconds",
			Help:    "Duration of physics updates in seconds",
			Buckets: []float64{.0001, .0005, .001, .005, .01, .02},
		},
	)
)
