package httpapi

import (
	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nimap-dev/nimap/internal/db/gen"
)

// NewAPI creates the huma API on router and registers every operation.
//
// pool and sessions may be nil when the API is built only to emit the OpenAPI
// document (see the `openapi` command): handlers are registered but never
// invoked during specification generation.
func NewAPI(router chi.Router, version string, pool *pgxpool.Pool, sessions *scs.SessionManager) huma.API {
	huma.DefaultArrayNullable = false

	q := gen.New(pool)

	api := humachi.New(router, huma.DefaultConfig("nimap API", version))
	api.UseMiddleware(NewAuthMiddleware(api, sessions, q))
	RegisterAuth(api, q, sessions)
	RegisterBuildings(api, q)
	RegisterLocations(api, q)
	return api
}
