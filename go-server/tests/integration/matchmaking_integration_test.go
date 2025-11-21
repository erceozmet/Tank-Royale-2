package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/config"
	"github.com/erceozmet/tank-royale-2/go-server/internal/db/redis"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMatchmakingToGameFlow tests the complete matchmaking to game flow
// This is an integration test that requires Redis and optionally PostgreSQL
func TestMatchmakingToGameFlow(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Setup
	ctx := context.Background()
	redisDB := setupRedisConnection(t)
	defer redisDB.Close()

	// Clean up any existing test data
	cleanupRedisTestData(t, redisDB)

	// Test: 2 players join matchmaking and get matched
	t.Run("TwoPlayersMatch", func(t *testing.T) {
		player1ID := "test-player-1"
		player2ID := "test-player-2"

		// Simulate matchmaking assignment in Redis
		matchID := fmt.Sprintf("test-match-%d", time.Now().Unix())
		assignment := map[string]interface{}{
			"matchId":     matchID,
			"playerCount": 2,
			"createdAt":   time.Now().Unix(),
		}

		assignmentJSON, err := json.Marshal(assignment)
		require.NoError(t, err)

		// Set assignments in Redis (simulating matchmaking service)
		err = redisDB.Client.Set(ctx, fmt.Sprintf("match:assignment:%s", player1ID), assignmentJSON, 5*time.Minute).Err()
		require.NoError(t, err)

		err = redisDB.Client.Set(ctx, fmt.Sprintf("match:assignment:%s", player2ID), assignmentJSON, 5*time.Minute).Err()
		require.NoError(t, err)

		// Verify assignments were created
		val1, err := redisDB.Client.Get(ctx, fmt.Sprintf("match:assignment:%s", player1ID)).Result()
		require.NoError(t, err)
		assert.Contains(t, val1, matchID)

		val2, err := redisDB.Client.Get(ctx, fmt.Sprintf("match:assignment:%s", player2ID)).Result()
		require.NoError(t, err)
		assert.Contains(t, val2, matchID)

		// Both players should have the same match assignment
		assert.Equal(t, val1, val2)

		// Cleanup
		redisDB.Client.Del(ctx, fmt.Sprintf("match:assignment:%s", player1ID))
		redisDB.Client.Del(ctx, fmt.Sprintf("match:assignment:%s", player2ID))
	})

	// Test: Player with no assignment gets error
	t.Run("PlayerWithoutAssignment", func(t *testing.T) {
		playerID := "test-player-no-match"

		// Try to get assignment (should not exist)
		_, err := redisDB.Client.Get(ctx, fmt.Sprintf("match:assignment:%s", playerID)).Result()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "redis: nil")
	})

	// Test: Assignment expires after TTL
	t.Run("AssignmentExpires", func(t *testing.T) {
		playerID := "test-player-expire"
		matchID := fmt.Sprintf("test-match-expire-%d", time.Now().Unix())

		assignment := map[string]interface{}{
			"matchId":     matchID,
			"playerCount": 2,
			"createdAt":   time.Now().Unix(),
		}

		assignmentJSON, err := json.Marshal(assignment)
		require.NoError(t, err)

		// Set with very short TTL (2 seconds)
		err = redisDB.Client.Set(ctx, fmt.Sprintf("match:assignment:%s", playerID), assignmentJSON, 2*time.Second).Err()
		require.NoError(t, err)

		// Should exist immediately
		val, err := redisDB.Client.Get(ctx, fmt.Sprintf("match:assignment:%s", playerID)).Result()
		require.NoError(t, err)
		assert.Contains(t, val, matchID)

		// Wait for expiration
		time.Sleep(3 * time.Second)

		// Should not exist after expiration
		_, err = redisDB.Client.Get(ctx, fmt.Sprintf("match:assignment:%s", playerID)).Result()
		assert.Error(t, err)
	})
}

// TestWebSocketMatchJoinFlow tests WebSocket connection and match:join flow
func TestWebSocketMatchJoinFlow(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Setup Redis
	ctx := context.Background()
	redisDB := setupRedisConnection(t)
	defer redisDB.Close()

	// Setup test HTTP server for WebSocket upgrade
	server := setupTestGameServer(t, redisDB)
	defer server.Close()

	t.Run("SuccessfulMatchJoin", func(t *testing.T) {
		playerID := "ws-test-player-1"
		matchID := fmt.Sprintf("ws-test-match-%d", time.Now().Unix())

		// Create match assignment in Redis
		assignment := map[string]interface{}{
			"matchId":     matchID,
			"playerCount": 2,
			"createdAt":   time.Now().Unix(),
		}
		assignmentJSON, err := json.Marshal(assignment)
		require.NoError(t, err)

		err = redisDB.Client.Set(ctx, fmt.Sprintf("match:assignment:%s", playerID), assignmentJSON, 5*time.Minute).Err()
		require.NoError(t, err)

		// Connect WebSocket
		wsURL := "ws" + server.URL[4:] + "/ws"
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, http.Header{
			"X-User-ID": []string{playerID},
		})
		require.NoError(t, err)
		defer ws.Close()

		// Send match:join message
		joinMsg := map[string]interface{}{
			"type":    "match:join",
			"matchId": matchID,
		}
		err = ws.WriteJSON(joinMsg)
		require.NoError(t, err)

		// Wait for response (with timeout)
		ws.SetReadDeadline(time.Now().Add(5 * time.Second))
		var response map[string]interface{}
		err = ws.ReadJSON(&response)
		require.NoError(t, err)

		// Verify response
		assert.Equal(t, "match:joined", response["type"])
		assert.Equal(t, matchID, response["matchId"])

		// Cleanup
		redisDB.Client.Del(ctx, fmt.Sprintf("match:assignment:%s", playerID))
	})

	t.Run("MatchJoinWithoutAssignment", func(t *testing.T) {
		playerID := "ws-test-player-no-assignment"
		matchID := "nonexistent-match"

		// Connect WebSocket (no Redis assignment created)
		wsURL := "ws" + server.URL[4:] + "/ws"
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, http.Header{
			"X-User-ID": []string{playerID},
		})
		require.NoError(t, err)
		defer ws.Close()

		// Send match:join message
		joinMsg := map[string]interface{}{
			"type":    "match:join",
			"matchId": matchID,
		}
		err = ws.WriteJSON(joinMsg)
		require.NoError(t, err)

		// Wait for error response
		ws.SetReadDeadline(time.Now().Add(5 * time.Second))
		var response map[string]interface{}
		err = ws.ReadJSON(&response)
		require.NoError(t, err)

		// Verify error response
		assert.Equal(t, "error", response["type"])
		assert.Contains(t, response["message"], "no assignment")
	})
}

// TestConcurrentMatchJoins tests multiple players joining matches concurrently
func TestConcurrentMatchJoins(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()
	redisDB := setupRedisConnection(t)
	defer redisDB.Close()

	numPlayers := 10
	matchID := fmt.Sprintf("concurrent-test-match-%d", time.Now().Unix())

	// Create assignments for all players
	var wg sync.WaitGroup
	errors := make(chan error, numPlayers)

	for i := 0; i < numPlayers; i++ {
		wg.Add(1)
		go func(playerIndex int) {
			defer wg.Done()

			playerID := fmt.Sprintf("concurrent-player-%d", playerIndex)
			assignment := map[string]interface{}{
				"matchId":     matchID,
				"playerCount": numPlayers,
				"createdAt":   time.Now().Unix(),
			}

			assignmentJSON, err := json.Marshal(assignment)
			if err != nil {
				errors <- err
				return
			}

			err = redisDB.Client.Set(ctx, fmt.Sprintf("match:assignment:%s", playerID), assignmentJSON, 5*time.Minute).Err()
			if err != nil {
				errors <- err
				return
			}
		}(i)
	}

	wg.Wait()
	close(errors)

	// Check for errors
	errorCount := 0
	for err := range errors {
		if err != nil {
			t.Errorf("Error creating assignment: %v", err)
			errorCount++
		}
	}

	assert.Equal(t, 0, errorCount, "All concurrent assignments should succeed")

	// Verify all assignments
	for i := 0; i < numPlayers; i++ {
		playerID := fmt.Sprintf("concurrent-player-%d", i)
		val, err := redisDB.Client.Get(ctx, fmt.Sprintf("match:assignment:%s", playerID)).Result()
		require.NoError(t, err)
		assert.Contains(t, val, matchID)

		// Cleanup
		redisDB.Client.Del(ctx, fmt.Sprintf("match:assignment:%s", playerID))
	}
}

// TestGameStateBroadcasting tests that game state is broadcast to connected clients
func TestGameStateBroadcasting(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// This test would require a full game server running
	// For now, we'll create a simplified version

	t.Run("MultipleClientsReceiveState", func(t *testing.T) {
		// Setup
		ctx := context.Background()
		redisDB := setupRedisConnection(t)
		defer redisDB.Close()

		server := setupTestGameServer(t, redisDB)
		defer server.Close()

		matchID := fmt.Sprintf("broadcast-test-%d", time.Now().Unix())
		numClients := 3

		// Create match assignments for all clients
		for i := 0; i < numClients; i++ {
			playerID := fmt.Sprintf("broadcast-player-%d", i)
			assignment := map[string]interface{}{
				"matchId":     matchID,
				"playerCount": numClients,
				"createdAt":   time.Now().Unix(),
			}
			assignmentJSON, _ := json.Marshal(assignment)
			redisDB.Client.Set(ctx, fmt.Sprintf("match:assignment:%s", playerID), assignmentJSON, 5*time.Minute)
		}

		// Connect all clients
		clients := make([]*websocket.Conn, numClients)
		for i := 0; i < numClients; i++ {
			playerID := fmt.Sprintf("broadcast-player-%d", i)
			wsURL := "ws" + server.URL[4:] + "/ws"
			ws, _, err := websocket.DefaultDialer.Dial(wsURL, http.Header{
				"X-User-ID": []string{playerID},
			})
			require.NoError(t, err)
			defer ws.Close()

			clients[i] = ws

			// Send match:join
			joinMsg := map[string]interface{}{
				"type":    "match:join",
				"matchId": matchID,
			}
			ws.WriteJSON(joinMsg)
		}

		// Wait briefly for all to join
		time.Sleep(1 * time.Second)

		// Each client should receive game state broadcasts
		// Note: This is a simplified test - full test would verify actual game state
		for i, ws := range clients {
			ws.SetReadDeadline(time.Now().Add(3 * time.Second))
			var msg map[string]interface{}
			err := ws.ReadJSON(&msg)
			if err == nil {
				t.Logf("Client %d received message: %v", i, msg["type"])
			}
		}

		// Cleanup
		for i := 0; i < numClients; i++ {
			playerID := fmt.Sprintf("broadcast-player-%d", i)
			redisDB.Client.Del(ctx, fmt.Sprintf("match:assignment:%s", playerID))
		}
	})
}

// Helper: Setup Redis connection for tests
func setupRedisConnection(t *testing.T) *redis.DB {
	cfg := config.RedisConfig{
		Host:     "localhost",
		Port:     6379,
		Password: "",
		DB:       1, // Use separate DB for tests
	}

	redisDB, err := redis.Connect(cfg)
	require.NoError(t, err, "Failed to connect to Redis")
	return redisDB
}

// Helper: Clean up test data from Redis
func cleanupRedisTestData(t *testing.T, redisDB *redis.DB) {
	ctx := context.Background()

	// Delete all test keys
	iter := redisDB.Client.Scan(ctx, 0, "match:assignment:test-*", 0).Iterator()
	for iter.Next(ctx) {
		redisDB.Client.Del(ctx, iter.Val())
	}

	iter = redisDB.Client.Scan(ctx, 0, "match:assignment:ws-test-*", 0).Iterator()
	for iter.Next(ctx) {
		redisDB.Client.Del(ctx, iter.Val())
	}

	iter = redisDB.Client.Scan(ctx, 0, "match:assignment:concurrent-*", 0).Iterator()
	for iter.Next(ctx) {
		redisDB.Client.Del(ctx, iter.Val())
	}
}

// Helper: Setup test game server with WebSocket support
func setupTestGameServer(t *testing.T, redisDB *redis.DB) *httptest.Server {
	// This is a simplified mock server
	// In a real integration test, you'd start the actual game server

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ws" {
			http.NotFound(w, r)
			return
		}

		// Get userID from header
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, "Missing X-User-ID header", http.StatusBadRequest)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Logf("WebSocket upgrade error: %v", err)
			return
		}
		defer conn.Close()

		// Handle messages
		for {
			var msg map[string]interface{}
			err := conn.ReadJSON(&msg)
			if err != nil {
				break
			}

			if msg["type"] == "match:join" {
				matchID := msg["matchId"].(string)

				// Check Redis for assignment
				ctx := context.Background()
				assignmentKey := fmt.Sprintf("match:assignment:%s", userID)
				val, err := redisDB.Client.Get(ctx, assignmentKey).Result()

				if err != nil {
					// No assignment
					conn.WriteJSON(map[string]interface{}{
						"type":    "error",
						"message": "no assignment found",
					})
					continue
				}

				// Verify match ID matches
				var assignment map[string]interface{}
				json.Unmarshal([]byte(val), &assignment)

				if assignment["matchId"] != matchID {
					conn.WriteJSON(map[string]interface{}{
						"type":    "error",
						"message": "match ID mismatch",
					})
					continue
				}

				// Success
				conn.WriteJSON(map[string]interface{}{
					"type":    "match:joined",
					"matchId": matchID,
					"userId":  userID,
				})

				// Simulate game state broadcast
				go func() {
					ticker := time.NewTicker(33 * time.Millisecond) // 30 TPS
					defer ticker.Stop()

					for i := 0; i < 10; i++ { // Send 10 updates
						<-ticker.C
						conn.WriteJSON(map[string]interface{}{
							"type":    "game:state",
							"matchId": matchID,
							"tick":    i,
							"players": []string{userID},
						})
					}
				}()
			}
		}
	})

	return httptest.NewServer(handler)
}

// Benchmark: Redis assignment operations
func BenchmarkRedisAssignment(b *testing.B) {
	redisDB := setupRedisConnectionBench(b)
	defer redisDB.Close()

	ctx := context.Background()
	matchID := "benchmark-match"

	assignment := map[string]interface{}{
		"matchId":     matchID,
		"playerCount": 2,
		"createdAt":   time.Now().Unix(),
	}
	assignmentJSON, _ := json.Marshal(assignment)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		playerID := fmt.Sprintf("bench-player-%d", i)
		key := fmt.Sprintf("match:assignment:%s", playerID)

		// Set
		redisDB.Client.Set(ctx, key, assignmentJSON, 5*time.Minute)

		// Get
		redisDB.Client.Get(ctx, key)

		// Delete
		redisDB.Client.Del(ctx, key)
	}
}

func setupRedisConnectionBench(b *testing.B) *redis.DB {
	cfg := config.RedisConfig{
		Host:     "localhost",
		Port:     6379,
		Password: "",
		DB:       1,
	}

	redisDB, err := redis.Connect(cfg)
	if err != nil {
		b.Fatalf("Failed to connect to Redis: %v", err)
	}
	return redisDB
}
