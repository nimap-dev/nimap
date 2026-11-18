// Package auth handles users, passwords, sessions and permissions.
package auth

import (
	"net/http"
	"time"

	"github.com/alexedwards/scs/pgxstore"
	"github.com/alexedwards/scs/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SessionCookieName is the cookie that carries the session token.
const SessionCookieName = "nimap_session"

// NewSessionManager builds an scs session manager backed by PostgreSQL
// through pgxstore, storing sessions in the auth.sessions table.
func NewSessionManager(pool *pgxpool.Pool, secure bool) *scs.SessionManager {
	m := scs.New()
	m.Store = pgxstore.NewWithConfig(pool, pgxstore.Config{
		TableName: "auth.sessions",
	})

	m.Lifetime = 30 * 24 * time.Hour    // absolute upper bound
	m.IdleTimeout = 14 * 24 * time.Hour // sliding: expires 14 days after last use

	m.Cookie.Name = SessionCookieName
	m.Cookie.HttpOnly = true
	m.Cookie.Secure = secure
	m.Cookie.SameSite = http.SameSiteLaxMode
	m.Cookie.Path = "/"
	m.Cookie.Persist = true

	return m
}
