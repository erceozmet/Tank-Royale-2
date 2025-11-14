package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// MatchResult represents a player's result in a match
type MatchResult struct {
	MatchID      string `json:"matchId"`
	UserID       string `json:"userId"`
	Placement    int    `json:"placement"`
	Kills        int    `json:"kills"`
	DamageDealt  int    `json:"damageDealt"`
	SurvivalTime int    `json:"survivalTime"`
	MMRChange    int    `json:"mmrChange"`
}

// CreateMatchParams represents parameters for creating a match
type CreateMatchParams struct {
	MapName     string
	PlayerCount int
	StartTime   time.Time
	EndTime     *time.Time
	Duration    int
}

// Match represents a match from the database
type Match struct {
	MatchID     string     `json:"matchId"`
	MapName     string     `json:"mapName"`
	PlayerCount int        `json:"playerCount"`
	StartTime   time.Time  `json:"startTime"`
	EndTime     *time.Time `json:"endTime"`
	Duration    int        `json:"duration"`
}

// MatchRepository handles match data operations
type MatchRepository struct {
	pgDB *postgres.DB
}

// NewMatchRepository creates a new match repository
func NewMatchRepository(pgDB *postgres.DB) *MatchRepository {
	return &MatchRepository{
		pgDB: pgDB,
	}
}

// Create inserts a new match
func (r *MatchRepository) Create(ctx context.Context, params CreateMatchParams) (string, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("match_create", time.Since(start))
	}()

	query := `
		INSERT INTO matches (match_id, map_name, player_count, start_time, end_time, duration)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING match_id
	`

	matchID := uuid.New().String()

	err := r.pgDB.Pool.QueryRow(ctx, query,
		matchID,
		params.MapName,
		params.PlayerCount,
		params.StartTime,
		params.EndTime,
		params.Duration,
	).Scan(&matchID)

	if err != nil {
		return "", fmt.Errorf("failed to create match: %w", err)
	}

	return matchID, nil
}

// InsertResult inserts a match result for a player
func (r *MatchRepository) InsertResult(ctx context.Context, result MatchResult) error {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("match_insert_result", time.Since(start))
	}()

	query := `
		INSERT INTO match_results (match_id, user_id, placement, kills, damage_dealt, survival_time, mmr_change)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.pgDB.Pool.Exec(ctx, query,
		result.MatchID,
		result.UserID,
		result.Placement,
		result.Kills,
		result.DamageDealt,
		result.SurvivalTime,
		result.MMRChange,
	)

	if err != nil {
		return fmt.Errorf("failed to insert match result: %w", err)
	}

	return nil
}

// FindByID retrieves a match by ID
func (r *MatchRepository) FindByID(ctx context.Context, matchID string) (*Match, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("match_find_by_id", time.Since(start))
	}()

	query := `
		SELECT match_id, map_name, player_count, start_time, end_time, duration
		FROM matches
		WHERE match_id = $1
	`

	var match Match
	err := r.pgDB.Pool.QueryRow(ctx, query, matchID).Scan(
		&match.MatchID,
		&match.MapName,
		&match.PlayerCount,
		&match.StartTime,
		&match.EndTime,
		&match.Duration,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find match by ID: %w", err)
	}

	return &match, nil
}

// GetPlayerResults retrieves all match results for a player
func (r *MatchRepository) GetPlayerResults(ctx context.Context, userID string, limit int) ([]MatchResult, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("match_get_player_results", time.Since(start))
	}()

	query := `
		SELECT mr.match_id, mr.user_id, mr.placement, mr.kills, mr.damage_dealt, 
		       mr.survival_time, mr.mmr_change
		FROM match_results mr
		WHERE mr.user_id = $1
		ORDER BY mr.created_at DESC
		LIMIT $2
	`

	rows, err := r.pgDB.Pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get player results: %w", err)
	}
	defer rows.Close()

	var results []MatchResult
	for rows.Next() {
		var result MatchResult
		err := rows.Scan(
			&result.MatchID,
			&result.UserID,
			&result.Placement,
			&result.Kills,
			&result.DamageDealt,
			&result.SurvivalTime,
			&result.MMRChange,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan match result row: %w", err)
		}
		results = append(results, result)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating match result rows: %w", err)
	}

	return results, nil
}

// UpdateStats updates user statistics after a match
func (r *MatchRepository) UpdateStats(ctx context.Context, userID string, placement int, kills int, deaths int) error {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("match_update_stats", time.Since(start))
	}()

	isWin := placement == 1
	isLoss := !isWin

	query := `
		UPDATE users
		SET 
			total_wins = total_wins + $1,
			total_losses = total_losses + $2,
			total_kills = total_kills + $3,
			total_deaths = total_deaths + $4
		WHERE user_id = $5
	`

	_, err := r.pgDB.Pool.Exec(ctx, query,
		boolToInt(isWin),
		boolToInt(isLoss),
		kills,
		deaths,
		userID,
	)

	if err != nil {
		return fmt.Errorf("failed to update user stats: %w", err)
	}

	return nil
}

// UpdateMMR updates a user's MMR
func (r *MatchRepository) UpdateMMR(ctx context.Context, userID string, mmrChange int) error {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("match_update_mmr", time.Since(start))
	}()

	query := `
		UPDATE users
		SET mmr = GREATEST(0, mmr + $1)
		WHERE user_id = $2
	`

	_, err := r.pgDB.Pool.Exec(ctx, query, mmrChange, userID)
	if err != nil {
		return fmt.Errorf("failed to update MMR: %w", err)
	}

	return nil
}

// boolToInt converts a boolean to an int (1 for true, 0 for false)
func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
