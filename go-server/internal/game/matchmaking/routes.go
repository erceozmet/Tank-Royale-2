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
		userID := r.Context().Value("userID")
		if userID == nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		err := service.JoinQueue(r.Context(), userID.(string))
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
		userID := r.Context().Value("userID")
		if userID == nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		err := service.LeaveQueue(r.Context(), userID.(string))
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
		queueSize, err := service.GetQueueSize(r.Context())
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to get queue size: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"queueSize":     queueSize,
			"activeMatches": service.GetActiveMatchCount(),
		})
	}
}
