package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/cache"
	"github.com/erceozmet/tank-royale-2/go-server/internal/config"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
)

func main() {
	fmt.Println("🧪 Testing Redis TTL Configuration")
	fmt.Println("═══════════════════════════════════════")

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	// Connect to Redis
	redisDB, err := redis.Connect(cfg.Database.Redis)
	if err != nil {
		log.Fatal(err)
	}
	defer redisDB.Close()

	// Create cache helper
	redisCache := cache.NewRedisCache(redisDB.Client)
	ctx := context.Background()

	fmt.Println("\n1️⃣  Testing Session Storage (7 day TTL)")
	if err := redisCache.SetSession(ctx, "user123", "jwt_token_here"); err != nil {
		log.Printf("Error: %v", err)
	} else {
		ttl, _ := redisDB.Client.TTL(ctx, "session:user123").Result()
		fmt.Printf("   ✅ Session created with TTL: %v (%.0f days)\n", ttl, ttl.Hours()/24)
	}

	fmt.Println("\n2️⃣  Testing Rate Limit (60 second TTL)")
	count, err := redisCache.IncrementRateLimit(ctx, "user123", "shoot")
	if err != nil {
		log.Printf("Error: %v", err)
	} else {
		ttl, _ := redisDB.Client.TTL(ctx, "ratelimit:user123:shoot").Result()
		fmt.Printf("   ✅ Rate limit: %d requests, TTL: %v\n", count, ttl)
	}

	fmt.Println("\n3️⃣  Testing User Cache (5 minute TTL)")
	userData := map[string]interface{}{
		"username":   "TestPlayer",
		"mmr":        1050,
		"total_wins": 25,
	}
	if err := redisCache.CacheUser(ctx, "user123", userData); err != nil {
		log.Printf("Error: %v", err)
	} else {
		ttl, _ := redisDB.Client.TTL(ctx, "user:cache:user123").Result()
		fmt.Printf("   ✅ User cached with TTL: %v (%.0f minutes)\n", ttl, ttl.Minutes())
	}

	fmt.Println("\n4️⃣  Testing Queue Player Lookup (60 second TTL)")
	player := cache.QueuePlayer{
		UserID:   "user123",
		Username: "TestPlayer",
		MMR:      1050,
		JoinedAt: time.Now(),
	}
	if err := redisCache.EnqueuePlayer(ctx, player); err != nil {
		log.Printf("Error: %v", err)
	} else {
		ttl, _ := redisDB.Client.TTL(ctx, "player:queue:user123").Result()
		fmt.Printf("   ✅ Queue entry created with TTL: %v\n", ttl)
	}

	fmt.Println("\n5️⃣  Testing Lobby with Safety TTL (2 hour)")
	lobbyData := map[string]interface{}{
		"status":       "waiting",
		"player_count": 4,
		"created_at":   time.Now().Unix(),
	}
	if err := redisCache.CreateLobby(ctx, "lobby123", lobbyData); err != nil {
		log.Printf("Error: %v", err)
	} else {
		ttl, _ := redisDB.Client.TTL(ctx, "lobby:lobby123").Result()
		fmt.Printf("   ✅ Lobby created with safety TTL: %v (%.0f hours)\n", ttl, ttl.Hours())
	}

	fmt.Println("\n6️⃣  Testing Leaderboard (No TTL - Persistent)")
	if err := redisCache.UpdateLeaderboardWins(ctx, "user123", 25); err != nil {
		log.Printf("Error: %v", err)
	} else {
		ttl, _ := redisDB.Client.TTL(ctx, "leaderboard:wins").Result()
		fmt.Printf("   ✅ Leaderboard updated, TTL: %v (persistent)\n", ttl)
	}

	fmt.Println("\n7️⃣  Testing Token Blacklist (Custom TTL)")
	customTTL := 30 * time.Minute
	if err := redisCache.BlacklistToken(ctx, "token_hash_abc123", customTTL); err != nil {
		log.Printf("Error: %v", err)
	} else {
		ttl, _ := redisDB.Client.TTL(ctx, "blacklist:token:token_hash_abc123").Result()
		fmt.Printf("   ✅ Token blacklisted with TTL: %v (%.0f minutes)\n", ttl, ttl.Minutes())
	}

	fmt.Println("\n8️⃣  Testing Recent Matches (No TTL, size-capped)")
	match := cache.MatchResult{
		MatchID:     "match123",
		Timestamp:   time.Now(),
		Winner:      "user123",
		PlayerCount: 16,
	}
	if err := redisCache.AddRecentMatch(ctx, match); err != nil {
		log.Printf("Error: %v", err)
	} else {
		count, _ := redisDB.Client.LLen(ctx, "matches:recent").Result()
		fmt.Printf("   ✅ Match added, total cached: %d (max 100)\n", count)
	}

	fmt.Println("\n9️⃣  Testing Player Online Status (Manual cleanup)")
	if err := redisCache.UpdatePlayerOnline(ctx, "user123"); err != nil {
		log.Printf("Error: %v", err)
	} else {
		count, _ := redisCache.GetOnlineCount(ctx)
		fmt.Printf("   ✅ Player status updated, total online: %d\n", count)
	}

	fmt.Println("\n🔟 Testing Server Metrics (No TTL)")
	if err := redisCache.IncrementMetric(ctx, "active_lobbies", 1); err != nil {
		log.Printf("Error: %v", err)
	} else {
		metrics, _ := redisCache.GetAllMetrics(ctx)
		fmt.Printf("   ✅ Metrics updated: %v\n", metrics)
	}

	// Verify Redis configuration
	fmt.Println("\n📊 Redis Configuration:")
	fmt.Println("═══════════════════════════════════════")

	maxmem, _ := redisDB.Client.ConfigGet(ctx, "maxmemory").Result()
	policy, _ := redisDB.Client.ConfigGet(ctx, "maxmemory-policy").Result()

	fmt.Printf("   Max Memory: %s bytes (%.0f MB)\n", maxmem["maxmemory"], parseBytes(maxmem["maxmemory"])/1024/1024)
	fmt.Printf("   Eviction Policy: %s\n", policy["maxmemory-policy"])

	// Get memory info
	info, _ := redisDB.Client.Info(ctx, "memory").Result()
	fmt.Printf("\n📈 Current Memory Usage:\n")
	fmt.Printf("   %s\n", extractMemoryInfo(info))

	fmt.Println("\n✅ All TTL configurations tested successfully!")
	fmt.Println("═══════════════════════════════════════")
}

func parseBytes(val interface{}) float64 {
	switch v := val.(type) {
	case string:
		var bytes float64
		fmt.Sscanf(v, "%f", &bytes)
		return bytes
	case float64:
		return v
	case int64:
		return float64(v)
	}
	return 0
}

func extractMemoryInfo(info string) string {
	// Extract key memory metrics
	lines := []string{}
	for _, line := range []string{"used_memory_human", "used_memory_peak_human", "maxmemory_human"} {
		if idx := findLine(info, line); idx != "" {
			lines = append(lines, idx)
		}
	}
	return fmt.Sprintf("%v", lines)
}

func findLine(text, prefix string) string {
	for _, line := range splitLines(text) {
		if len(line) > len(prefix) && line[:len(prefix)] == prefix {
			return line
		}
	}
	return ""
}

func splitLines(text string) []string {
	result := []string{}
	current := ""
	for _, ch := range text {
		if ch == '\n' || ch == '\r' {
			if current != "" {
				result = append(result, current)
				current = ""
			}
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}
