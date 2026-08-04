package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterHealth mounts liveness and readiness endpoints on plain chi.
//
// These are called by orchestrators and monitoring, never by the UI,
// so they get no schema, no versioning and as few layers as possible.
func RegisterHealth(r chi.Router, pool *pgxpool.Pool, version string) {
	// Liveness: the process is running. Does not touch the database.
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"version": version,
		})
	})

	// Readiness: the instance can serve requests.
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var postgis string
		if err := pool.QueryRow(ctx, "SELECT postgis_lib_version()").Scan(&postgis); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{
				"status":   "degraded",
				"database": "unavailable",
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"status":   "ok",
			"version":  version,
			"database": "ok",
			"postgis":  postgis,
		})
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
