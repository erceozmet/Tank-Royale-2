package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/erceozmet/tank-royale-2/go-server/internal/metrics"
	"github.com/go-chi/chi/v5"
)

// Metrics middleware to track HTTP requests
func Metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a response wrapper to capture status code
		wrapper := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Call next handler
		next.ServeHTTP(wrapper, r)

		// Record metrics
		duration := time.Since(start).Seconds()
		endpoint := chi.RouteContext(r.Context()).RoutePattern()
		if endpoint == "" {
			endpoint = r.URL.Path
		}

		// Record request count
		metrics.HTTPRequestsTotal.WithLabelValues(
			r.Method,
			endpoint,
			strconv.Itoa(wrapper.statusCode),
		).Inc()

		// Record request duration
		metrics.HTTPRequestDuration.WithLabelValues(
			r.Method,
			endpoint,
		).Observe(duration)
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
