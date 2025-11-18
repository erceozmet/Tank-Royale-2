package matchmaking

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/erceozmet/tank-royale-2/go-server/internal/middleware"
	"github.com/go-chi/chi/v5"
)

// RegisterRoutes registers matchmaking routes
func RegisterRoutes(r chi.Router, service *MatchmakingService) {
	r.Route("/matchmaking", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)

		r.Post("/join", joinQueueHandler(service))
		r.Post("/leave", leaveQueueHandler(service))
		r.Get("/status", statusHandler(service))
	})
}

// joinQueueHandler handles requests to join the matchmaking queue
func joinQueueHandler(service *MatchmakingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		err := service.JoinQueue(r.Context(), userID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to join queue: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Joined matchmaking queue",
			"status":  "searching",
		})
	}
}

// leaveQueueHandler handles requests to leave the matchmaking queue
func leaveQueueHandler(service *MatchmakingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		err := service.LeaveQueue(r.Context(), userID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to leave queue: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Left matchmaking queue",
		})
	}
}

// statusHandler handles requests for matchmaking status
func statusHandler(service *MatchmakingService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Check if player has a match assignment in Redis
		matchKey := fmt.Sprintf("match:player:%s", userID)
		matchData, err := service.GetMatchAssignment(r.Context(), matchKey)
		if err == nil && matchData != nil {
			// Player has been matched!
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":      "matched",
				"matchId":     matchData["matchId"],
				"playerCount": matchData["playerCount"],
			})
			return
		}

		// No match yet, return queue status
		queueSize, err := service.GetQueueSize(r.Context())
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to get queue size: %v", err), http.StatusInternalServerError)
			return
		}

		// Calculate estimated wait time based on queue size
		// Assuming ~2 seconds per matchmaking cycle and 2 players needed minimum
		estimatedSeconds := 2
		if queueSize < 2 {
			estimatedSeconds = 10 // Wait for more players
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":            "searching",
			"playersInQueue":    queueSize,
			"estimatedWaitTime": estimatedSeconds,
			"activeMatches":     service.GetActiveMatchCount(),
		})
	}
}
