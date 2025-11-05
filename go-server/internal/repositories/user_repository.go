package repositories

import (
	"context"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
	"github.com/erceozmet/tank-royale-2/go-server/internal/models"
)

// UserRepository handles user data operations
type UserRepository struct {
	pgDB    *postgres.DB
	redisDB *redis.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(pgDB *postgres.DB, redisDB *redis.DB) *UserRepository {
	return &UserRepository{
		pgDB:    pgDB,
		redisDB: redisDB,
	}
}

// GetByID retrieves a user by ID from PostgreSQL
func (r *UserRepository) GetByID(ctx context.Context, userID string) (*models.User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_get_by_id", time.Since(start))
	}()

	query := `
		SELECT id, username, email, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	err := r.pgDB.Pool.QueryRow(ctx, query, userID).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetByUsername retrieves a user by username
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_get_by_username", time.Since(start))
	}()

	query := `
		SELECT id, username, email, created_at, updated_at
		FROM users
		WHERE username = $1
	`

	var user models.User
	err := r.pgDB.Pool.QueryRow(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// Create inserts a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_create", time.Since(start))
	}()

	query := `
		INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.pgDB.Pool.Exec(ctx, query,
		user.ID,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.CreatedAt,
		user.UpdatedAt,
	)

	return err
}

// GetUserStats retrieves user statistics
func (r *UserRepository) GetUserStats(ctx context.Context, userID string) (*models.UserStats, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_get_stats", time.Since(start))
	}()

	query := `
		SELECT user_id, games_played, wins, losses, kills, deaths, 
		       damage_dealt, damage_taken, accuracy, avg_survival_time
		FROM user_stats
		WHERE user_id = $1
	`

	var stats models.UserStats
	err := r.pgDB.Pool.QueryRow(ctx, query, userID).Scan(
		&stats.UserID,
		&stats.GamesPlayed,
		&stats.Wins,
		&stats.Losses,
		&stats.Kills,
		&stats.Deaths,
		&stats.DamageDealt,
		&stats.DamageTaken,
		&stats.Accuracy,
		&stats.AvgSurvivalTime,
	)

	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// CacheSession stores a user session in Redis
func (r *UserRepository) CacheSession(ctx context.Context, sessionID string, userID string, duration time.Duration) error {
	start := time.Now()
	defer func() {
		r.redisDB.RecordQuery("session_cache", time.Since(start))
	}()

	key := "session:" + sessionID
	return r.redisDB.Client.Set(ctx, key, userID, duration).Err()
}

// GetSessionUserID retrieves user ID from session cache
func (r *UserRepository) GetSessionUserID(ctx context.Context, sessionID string) (string, error) {
	start := time.Now()
	defer func() {
		r.redisDB.RecordQuery("session_get", time.Since(start))
	}()

	key := "session:" + sessionID
	return r.redisDB.Client.Get(ctx, key).Result()
}

// DeleteSession removes a session from cache
func (r *UserRepository) DeleteSession(ctx context.Context, sessionID string) error {
	start := time.Now()
	defer func() {
		r.redisDB.RecordQuery("session_delete", time.Since(start))
	}()

	key := "session:" + sessionID
	return r.redisDB.Client.Del(ctx, key).Err()
}

// GetLeaderboard retrieves top players
func (r *UserRepository) GetLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("leaderboard_get", time.Since(start))
	}()

	query := `
		SELECT u.id, u.username, s.wins, s.kills, s.deaths, 
		       (s.wins::float / NULLIF(s.games_played, 0)) as win_rate
		FROM users u
		JOIN user_stats s ON u.id = s.user_id
		ORDER BY s.wins DESC, s.kills DESC
		LIMIT $1
	`

	rows, err := r.pgDB.Pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.LeaderboardEntry
	for rows.Next() {
		var entry models.LeaderboardEntry
		err := rows.Scan(
			&entry.PlayerID,
			&entry.Username,
			&entry.Wins,
			&entry.Kills,
			&entry.Deaths,
			&entry.WinRate,
		)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, rows.Err()
}
