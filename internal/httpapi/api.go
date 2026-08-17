package httpapi

import (
	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewAPI creates the huma API on router and registers every operation.
//
// pool and sessions may be nil when the API is built only to emit the OpenAPI
// document (see the `openapi` command): handlers are registered but never
// invoked during specification generation.
func NewAPI(router chi.Router, version string, pool *pgxpool.Pool, sessions *scs.SessionManager) huma.API {
	huma.DefaultArrayNullable = false

	api := humachi.New(router, huma.DefaultConfig("nimap API", version))
	api.UseMiddleware(NewAuthMiddleware(api, sessions))
	RegisterAuth(api, pool, sessions)
	RegisterBuildings(api, pool, sessions)
	RegisterLocations(api, pool, sessions)
	return api
}
