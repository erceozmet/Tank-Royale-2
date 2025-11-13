package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// User represents a user from the database
type User struct {
	UserID       string     `json:"userId"`
	Username     string     `json:"username"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"`
	TotalWins    int        `json:"totalWins"`
	TotalLosses  int        `json:"totalLosses"`
	TotalKills   int        `json:"totalKills"`
	TotalDeaths  int        `json:"totalDeaths"`
	MMR          int        `json:"mmr"`
	CreatedAt    time.Time  `json:"createdAt"`
	LastLogin    *time.Time `json:"lastLogin"`
}

// UserStats represents user statistics with calculated fields
type UserStats struct {
	MMR         int     `json:"mmr"`
	TotalWins   int     `json:"totalWins"`
	TotalLosses int     `json:"totalLosses"`
	TotalKills  int     `json:"totalKills"`
	TotalDeaths int     `json:"totalDeaths"`
	WinRate     float64 `json:"winRate"`
	KDR         float64 `json:"kdr"`
}

// CreateUserParams represents parameters for creating a user
type CreateUserParams struct {
	Username     string
	Email        string
	PasswordHash string
}

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

// FindByID retrieves a user by ID
func (r *UserRepository) FindByID(ctx context.Context, userID string) (*User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_find_by_id", time.Since(start))
	}()

	query := `
		SELECT user_id, username, email, password_hash, 
		       total_wins, total_losses, total_kills, total_deaths, mmr,
		       created_at, last_login
		FROM users
		WHERE user_id = $1
	`

	var user User
	err := r.pgDB.Pool.QueryRow(ctx, query, userID).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.TotalWins,
		&user.TotalLosses,
		&user.TotalKills,
		&user.TotalDeaths,
		&user.MMR,
		&user.CreatedAt,
		&user.LastLogin,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by ID: %w", err)
	}

	return &user, nil
}

// FindByUsername retrieves a user by username
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_find_by_username", time.Since(start))
	}()

	query := `
		SELECT user_id, username, email, password_hash, 
		       total_wins, total_losses, total_kills, total_deaths, mmr,
		       created_at, last_login
		FROM users
		WHERE username = $1
	`

	var user User
	err := r.pgDB.Pool.QueryRow(ctx, query, username).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.TotalWins,
		&user.TotalLosses,
		&user.TotalKills,
		&user.TotalDeaths,
		&user.MMR,
		&user.CreatedAt,
		&user.LastLogin,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by username: %w", err)
	}

	return &user, nil
}

// FindByEmail retrieves a user by email
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_find_by_email", time.Since(start))
	}()

	query := `
		SELECT user_id, username, email, password_hash, 
		       total_wins, total_losses, total_kills, total_deaths, mmr,
		       created_at, last_login
		FROM users
		WHERE email = $1
	`

	var user User
	err := r.pgDB.Pool.QueryRow(ctx, query, email).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.TotalWins,
		&user.TotalLosses,
		&user.TotalKills,
		&user.TotalDeaths,
		&user.MMR,
		&user.CreatedAt,
		&user.LastLogin,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by email: %w", err)
	}

	return &user, nil
}

// FindByUsernameOrEmail retrieves a user by username or email
func (r *UserRepository) FindByUsernameOrEmail(ctx context.Context, usernameOrEmail string) (*User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_find_by_username_or_email", time.Since(start))
	}()

	query := `
		SELECT user_id, username, email, password_hash, 
		       total_wins, total_losses, total_kills, total_deaths, mmr,
		       created_at, last_login
		FROM users
		WHERE username = $1 OR email = $1
	`

	var user User
	err := r.pgDB.Pool.QueryRow(ctx, query, usernameOrEmail).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.TotalWins,
		&user.TotalLosses,
		&user.TotalKills,
		&user.TotalDeaths,
		&user.MMR,
		&user.CreatedAt,
		&user.LastLogin,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by username or email: %w", err)
	}

	return &user, nil
}

// UsernameOrEmailExists checks if a username or email already exists
func (r *UserRepository) UsernameOrEmailExists(ctx context.Context, username, email string) (bool, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_username_or_email_exists", time.Since(start))
	}()

	query := `
		SELECT EXISTS(
			SELECT 1 FROM users 
			WHERE username = $1 OR email = $2
		)
	`

	var exists bool
	err := r.pgDB.Pool.QueryRow(ctx, query, username, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check if user exists: %w", err)
	}

	return exists, nil
}

// Create inserts a new user
func (r *UserRepository) Create(ctx context.Context, params CreateUserParams) (*User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_create", time.Since(start))
	}()

	query := `
		INSERT INTO users (user_id, username, email, password_hash, mmr, total_wins, total_losses, total_kills, total_deaths, created_at, last_login)
		VALUES ($1, $2, $3, $4, 1000, 0, 0, 0, 0, CURRENT_TIMESTAMP, NULL)
		RETURNING user_id, username, email, password_hash, total_wins, total_losses, total_kills, total_deaths, mmr, created_at, last_login
	`

	userID := uuid.New().String()

	var user User
	err := r.pgDB.Pool.QueryRow(ctx, query,
		userID,
		params.Username,
		params.Email,
		params.PasswordHash,
	).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.TotalWins,
		&user.TotalLosses,
		&user.TotalKills,
		&user.TotalDeaths,
		&user.MMR,
		&user.CreatedAt,
		&user.LastLogin,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// UpdateLastLogin updates the last login timestamp for a user
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_update_last_login", time.Since(start))
	}()

	query := `
		UPDATE users 
		SET last_login = CURRENT_TIMESTAMP
		WHERE user_id = $1
	`

	_, err := r.pgDB.Pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	return nil
}

// GetStats retrieves user stats with calculated fields
func (r *UserRepository) GetStats(ctx context.Context, userID string) (*UserStats, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_get_stats", time.Since(start))
	}()

	query := `
		SELECT 
			mmr,
			total_wins,
			total_losses,
			total_kills,
			total_deaths,
			CASE 
				WHEN (total_wins + total_losses) > 0 
				THEN ROUND((total_wins::numeric / (total_wins + total_losses)) * 100, 2)
				ELSE 0
			END as win_rate,
			CASE 
				WHEN total_deaths > 0 
				THEN ROUND(total_kills::numeric / total_deaths, 2)
				ELSE total_kills::numeric
			END as kdr
		FROM users
		WHERE user_id = $1
	`

	var stats UserStats
	err := r.pgDB.Pool.QueryRow(ctx, query, userID).Scan(
		&stats.MMR,
		&stats.TotalWins,
		&stats.TotalLosses,
		&stats.TotalKills,
		&stats.TotalDeaths,
		&stats.WinRate,
		&stats.KDR,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}

	return &stats, nil
}

// Search searches for users by username pattern
func (r *UserRepository) Search(ctx context.Context, searchQuery string, limit int) ([]*User, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("user_search", time.Since(start))
	}()

	query := `
		SELECT user_id, username, email, password_hash, 
		       total_wins, total_losses, total_kills, total_deaths, mmr,
		       created_at, last_login
		FROM users
		WHERE username ILIKE $1
		ORDER BY total_wins DESC
		LIMIT $2
	`

	rows, err := r.pgDB.Pool.Query(ctx, query, "%"+searchQuery+"%", limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search users: %w", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.TotalWins,
			&user.TotalLosses,
			&user.TotalKills,
			&user.TotalDeaths,
			&user.MMR,
			&user.CreatedAt,
			&user.LastLogin,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		users = append(users, &user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating user rows: %w", err)
	}

	return users, nil
}
