package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/db/postgres"
)

// LeaderboardEntry represents a single leaderboard entry
type LeaderboardEntry struct {
	Rank        int     `json:"rank"`
	UserID      string  `json:"userId"`
	Username    string  `json:"username"`
	MMR         int     `json:"mmr"`
	TotalWins   int     `json:"totalWins"`
	TotalLosses int     `json:"totalLosses"`
	TotalKills  int     `json:"totalKills"`
	TotalDeaths int     `json:"totalDeaths"`
	WinRate     float64 `json:"winRate"`
}

// PlayerRanks represents a player's ranks on different leaderboards
type PlayerRanks struct {
	MMRRank  int `json:"mmr"`
	WinsRank int `json:"wins"`
}

// LeaderboardRepository handles leaderboard data operations
type LeaderboardRepository struct {
	pgDB *postgres.DB
}

// NewLeaderboardRepository creates a new leaderboard repository
func NewLeaderboardRepository(pgDB *postgres.DB) *LeaderboardRepository {
	return &LeaderboardRepository{
		pgDB: pgDB,
	}
}

// GetTopByWins retrieves top players by wins with pagination
func (r *LeaderboardRepository) GetTopByWins(ctx context.Context, limit, offset int) ([]*LeaderboardEntry, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("leaderboard_get_top_by_wins", time.Since(start))
	}()

	query := `
		SELECT 
			user_id,
			username,
			mmr,
			total_wins,
			total_losses,
			total_kills,
			total_deaths,
			CASE 
				WHEN (total_wins + total_losses) > 0 
				THEN ROUND((total_wins::numeric / (total_wins + total_losses)) * 100, 2)
				ELSE 0
			END as win_rate
		FROM users
		ORDER BY total_wins DESC, total_kills DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.pgDB.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get top players by wins: %w", err)
	}
	defer rows.Close()

	var entries []*LeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		var entry LeaderboardEntry
		entry.Rank = rank
		err := rows.Scan(
			&entry.UserID,
			&entry.Username,
			&entry.MMR,
			&entry.TotalWins,
			&entry.TotalLosses,
			&entry.TotalKills,
			&entry.TotalDeaths,
			&entry.WinRate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan leaderboard entry: %w", err)
		}
		entries = append(entries, &entry)
		rank++
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating leaderboard rows: %w", err)
	}

	return entries, nil
}

// GetTopByMMR retrieves top players by MMR with pagination
func (r *LeaderboardRepository) GetTopByMMR(ctx context.Context, limit, offset int) ([]*LeaderboardEntry, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("leaderboard_get_top_by_mmr", time.Since(start))
	}()

	query := `
		SELECT 
			user_id,
			username,
			mmr,
			total_wins,
			total_losses,
			total_kills,
			total_deaths,
			CASE 
				WHEN (total_wins + total_losses) > 0 
				THEN ROUND((total_wins::numeric / (total_wins + total_losses)) * 100, 2)
				ELSE 0
			END as win_rate
		FROM users
		ORDER BY mmr DESC, total_wins DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.pgDB.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get top players by MMR: %w", err)
	}
	defer rows.Close()

	var entries []*LeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		var entry LeaderboardEntry
		entry.Rank = rank
		err := rows.Scan(
			&entry.UserID,
			&entry.Username,
			&entry.MMR,
			&entry.TotalWins,
			&entry.TotalLosses,
			&entry.TotalKills,
			&entry.TotalDeaths,
			&entry.WinRate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan leaderboard entry: %w", err)
		}
		entries = append(entries, &entry)
		rank++
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating leaderboard rows: %w", err)
	}

	return entries, nil
}

// GetPlayerMMRRank gets a player's rank on the MMR leaderboard
func (r *LeaderboardRepository) GetPlayerMMRRank(ctx context.Context, userID string) (int, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("leaderboard_get_player_mmr_rank", time.Since(start))
	}()

	query := `
		SELECT COUNT(*) + 1 as rank
		FROM users u1
		JOIN users u2 ON u2.user_id = $1
		WHERE u1.mmr > u2.mmr 
		   OR (u1.mmr = u2.mmr AND u1.total_wins > u2.total_wins)
	`

	var rank int
	err := r.pgDB.Pool.QueryRow(ctx, query, userID).Scan(&rank)
	if err != nil {
		return 0, fmt.Errorf("failed to get player MMR rank: %w", err)
	}

	return rank, nil
}

// GetPlayerWinsRank gets a player's rank on the wins leaderboard
func (r *LeaderboardRepository) GetPlayerWinsRank(ctx context.Context, userID string) (int, error) {
	start := time.Now()
	defer func() {
		r.pgDB.RecordQuery("leaderboard_get_player_wins_rank", time.Since(start))
	}()

	query := `
		SELECT COUNT(*) + 1 as rank
		FROM users u1
		JOIN users u2 ON u2.user_id = $1
		WHERE u1.total_wins > u2.total_wins 
		   OR (u1.total_wins = u2.total_wins AND u1.total_kills > u2.total_kills)
	`

	var rank int
	err := r.pgDB.Pool.QueryRow(ctx, query, userID).Scan(&rank)
	if err != nil {
		return 0, fmt.Errorf("failed to get player wins rank: %w", err)
	}

	return rank, nil
}

// GetPlayerRanks gets both MMR and wins ranks for a player
func (r *LeaderboardRepository) GetPlayerRanks(ctx context.Context, userID string) (*PlayerRanks, error) {
	// Get both ranks concurrently using goroutines
	type result struct {
		mmrRank  int
		winsRank int
		mmrErr   error
		winsErr  error
	}

	resultChan := make(chan result, 1)

	go func() {
		mmrRank, mmrErr := r.GetPlayerMMRRank(ctx, userID)
		winsRank, winsErr := r.GetPlayerWinsRank(ctx, userID)
		resultChan <- result{
			mmrRank:  mmrRank,
			winsRank: winsRank,
			mmrErr:   mmrErr,
			winsErr:  winsErr,
		}
	}()

	res := <-resultChan

	if res.mmrErr != nil {
		return nil, res.mmrErr
	}
	if res.winsErr != nil {
		return nil, res.winsErr
	}

	return &PlayerRanks{
		MMRRank:  res.mmrRank,
		WinsRank: res.winsRank,
	}, nil
}
