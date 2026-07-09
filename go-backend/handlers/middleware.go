package handlers

import (
	"log"
	"net/http"
	"time"
	"viewer/analytics"
)

// ResponseWrapper custom interceptor to capture HTTP status metric tracking codes
type ResponseWrapper struct {
	http.ResponseWriter
	StatusCode int
}

func (rw *ResponseWrapper) WriteHeader(code int) {
	rw.StatusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// ApiWrap enforces corporate CORS headers and standard API layout safety rules
func ApiWrap(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Enforce strict JSON output headers
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		start := time.Now()
		wrapper := &ResponseWrapper{ResponseWriter: w, StatusCode: http.StatusOK}

		// Execute endpoint logic
		next.ServeHTTP(wrapper, r)

		// Log traffic directly to terminal metrics ledger window tracking
		log.Printf("[API Engine] Method: %s | Path: %s | Status: %d | Duration: %v",
			r.Method, r.URL.Path, wrapper.StatusCode, time.Since(start))
	}
}

// TrackMetricsMiddleware logs user interface views anonymously into memory indexes
func TrackMetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Log general dashboard categories if selected from routing parameters
		catID := r.URL.Query().Get("category")
		if catID != "" {
			analytics.GlobalMatrix.LogCategoryView(catID)
		}
		next.ServeHTTP(w, r)
	})
}
