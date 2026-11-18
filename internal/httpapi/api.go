package httpapi

import (
	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/media"
)

// NewAPI creates the huma API on router and registers every operation.
//
// pool, sessions and oidc may be nil when the API is built only to emit the OpenAPI
// document (see the `openapi` command): handlers are registered but never
// invoked during specification generation.
func NewAPI(router chi.Router, version string, pool *pgxpool.Pool, sessions *scs.SessionManager, store *media.Store, oidc *auth.OIDCProvider) huma.API {
	huma.DefaultArrayNullable = false

	q := gen.New(pool)

	config := huma.DefaultConfig("nimap API", version)
	config.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"session": {
			Type:        "apiKey",
			In:          "cookie",
			Name:        auth.SessionCookieName,
			Description: "The session cookie set by logging in through the web interface or POST /api/auth/login.",
		},
		"apiKey": {
			Type:        "http",
			Scheme:      "bearer",
			Description: "An API key from the account page, sent as Authorization: Bearer <key>. It acts as its user, except for the operations that need a session.",
		},
	}

	api := humachi.New(router, config)
	api.UseMiddleware(NewAuthMiddleware(api, sessions, q))
	RegisterAuth(api, q, sessions)
	RegisterAuthProviders(api, oidc)
	RegisterAPIKeys(api, q)
	RegisterBuildings(api, q)
	RegisterLocations(api, q)
	RegisterAdmin(api, q)
	RegisterAssets(api, q, pool, store)
	RegisterDeviceTypes(api, q)
	RegisterDeviceModels(api, q)
	RegisterDevices(api, q, pool)
	RegisterManufacturers(api, q)

	// The middleware decides access from each operation's metadata; the
	// document says the same, so a client sees which operations take a key.
	for _, item := range api.OpenAPI().Paths {
		for _, op := range []*huma.Operation{
			item.Get, item.Post, item.Put, item.Patch, item.Delete,
		} {
			if op == nil {
				continue
			}

			_, needsPermission := requiresPermission(op)
			switch {
			case requiresSession(op):
				op.Security = []map[string][]string{{"session": {}}}
			case needsPermission || requiresAuth(op):
				op.Security = []map[string][]string{{"session": {}}, {"apiKey": {}}}
			}
		}
	}

	return api
}
