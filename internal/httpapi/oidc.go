package httpapi

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/config"
	"github.com/nimap-dev/nimap/internal/db/gen"
)

const OIDCLoginPath = "/api/auth/oidc/login"

const (
	oidcStateKey    = "oidc_state"
	oidcNonceKey    = "oidc_nonce"
	oidcVerifierKey = "oidc_verifier"
	oidcNextKey     = "oidc_next"
)

// Error codes the login page receives as ?error= after a failed single
// sign-on. The details only go to the log.
const (
	// oidcErrorFailed is anything that went wrong on the way.
	oidcErrorFailed = "oidc"
	// oidcErrorNoAccount means the login worked at the provider, but nimap
	// will not let that account in: sign-up is closed to its email domain,
	// or its email belongs to a user it may not be linked to.
	oidcErrorNoAccount = "oidc_no_account"
)

const oidcExchangeTimeout = 15 * time.Second

const maxUsernameSuffix = 100

var (
	errSignupNotAllowed = errors.New("email domain may not sign up")
	errEmailInUse       = errors.New("email belongs to a user that may not be linked")
)

// RegisterOIDC mounts the single sign-on endpoints on plain chi: they answer
// with redirects, not JSON, so they stay out of the huma API. It does nothing
// when provider is nil, i.e. when single sign-on is disabled.
func RegisterOIDC(r chi.Router, provider *auth.OIDCProvider, pool *pgxpool.Pool, sm *scs.SessionManager) {
	if provider == nil {
		return
	}

	h := &oidcHandler{provider: provider, pool: pool, q: gen.New(pool), sm: sm}
	r.Get(OIDCLoginPath, h.login)
	r.Get(config.OIDCCallbackPath, h.callback)
}

type oidcHandler struct {
	provider *auth.OIDCProvider
	pool     *pgxpool.Pool
	q        *gen.Queries
	sm       *scs.SessionManager
}

// login redirects the browser to the identity provider, keeping the state,
// nonce, PKCE verifier and ?next= target in the session for the callback.
func (h *oidcHandler) login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	req, err := h.provider.NewAuthRequest()
	if err != nil {
		h.fail(w, r, oidcErrorFailed, "could not start login", err)
		return
	}

	h.sm.Put(ctx, oidcStateKey, req.State)
	h.sm.Put(ctx, oidcNonceKey, req.Nonce)
	h.sm.Put(ctx, oidcVerifierKey, req.Verifier)
	h.sm.Put(ctx, oidcNextKey, safeNext(r.URL.Query().Get("next")))

	http.Redirect(w, r, h.provider.AuthCodeURL(req), http.StatusFound)
}

// callback finishes the login started by login: it checks the state,
// exchanges the code, finds or creates the user and starts their session the
// same way the password login does.
func (h *oidcHandler) callback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()

	// Pop first: an auth request is good for a single callback, failed or not.
	req := auth.OIDCAuthRequest{
		State:    h.sm.PopString(ctx, oidcStateKey),
		Nonce:    h.sm.PopString(ctx, oidcNonceKey),
		Verifier: h.sm.PopString(ctx, oidcVerifierKey),
	}
	next := safeNext(h.sm.PopString(ctx, oidcNextKey))

	if req.State == "" {
		h.fail(w, r, oidcErrorFailed, "no login in progress", nil)
		return
	}
	if subtle.ConstantTimeCompare([]byte(req.State), []byte(query.Get("state"))) != 1 {
		h.fail(w, r, oidcErrorFailed, "state does not match", nil)
		return
	}
	if e := query.Get("error"); e != "" {
		h.fail(w, r, oidcErrorFailed, "provider returned an error",
			fmt.Errorf("%s: %s", e, query.Get("error_description")))
		return
	}
	code := query.Get("code")
	if code == "" {
		h.fail(w, r, oidcErrorFailed, "callback has no code", nil)
		return
	}

	exchangeCtx, cancel := context.WithTimeout(ctx, oidcExchangeTimeout)
	defer cancel()

	claims, err := h.provider.Exchange(exchangeCtx, code, req)
	if err != nil {
		h.fail(w, r, oidcErrorFailed, "code exchange failed", err)
		return
	}

	userID, err := h.findOrCreateUser(ctx, claims)
	if err != nil {
		errCode := oidcErrorFailed
		if errors.Is(err, errSignupNotAllowed) || errors.Is(err, errEmailInUse) {
			errCode = oidcErrorNoAccount
		}
		h.fail(w, r, errCode, "no user for this login", err)
		return
	}

	if err := h.sm.RenewToken(ctx); err != nil {
		h.fail(w, r, oidcErrorFailed, "could not start session", err)
		return
	}
	h.sm.Put(ctx, sessionUserIDKey, userID.String())

	http.Redirect(w, r, next, http.StatusFound)
}

// findOrCreateUser maps verified claims to a nimap user:
//  1. a known (issuer, subject) identity -> its user;
//  2. else, with LinkByEmail and a verified email, an existing user with that
//     email -> link a new identity to it;
//  3. else, if DomainAllowed(email), a new viewer without a password;
//  4. else refuse.
func (h *oidcHandler) findOrCreateUser(ctx context.Context, claims auth.OIDCClaims) (uuid.UUID, error) {
	issuer := h.provider.Issuer
	email := claims.Email

	user, err := h.q.GetUserByIdentity(ctx, gen.GetUserByIdentityParams{
		Issuer:  issuer,
		Subject: claims.Subject,
	})
	if err == nil {
		if err := h.q.TouchUserIdentity(ctx, gen.TouchUserIdentityParams{
			Issuer:  issuer,
			Subject: claims.Subject,
			Email:   &email,
		}); err != nil {
			slog.WarnContext(ctx, "could not update oidc identity", "user_id", user.ID, "error", err)
		}
		return user.ID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, fmt.Errorf("look up identity: %w", err)
	}

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx)
	qtx := h.q.WithTx(tx)

	userID, err := h.linkOrCreate(ctx, qtx, claims)
	if err != nil {
		return uuid.Nil, err
	}

	if err := qtx.CreateUserIdentity(ctx, gen.CreateUserIdentityParams{
		UserID:  userID,
		Issuer:  issuer,
		Subject: claims.Subject,
		Email:   &email,
	}); err != nil {
		return uuid.Nil, fmt.Errorf("create identity: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, fmt.Errorf("commit: %w", err)
	}
	return userID, nil
}

// linkOrCreate returns the existing user a first login links to, or creates
// a new one. The identity row is left to the caller.
func (h *oidcHandler) linkOrCreate(ctx context.Context, qtx *gen.Queries, claims auth.OIDCClaims) (uuid.UUID, error) {
	existing, err := qtx.GetUserByEmail(ctx, claims.Email)
	switch {
	case err == nil:
		if h.provider.LinkByEmail && claims.EmailVerified {
			slog.InfoContext(ctx, "linking oidc identity to existing user", "user_id", existing.ID)
			return existing.ID, nil
		}

		return uuid.Nil, errEmailInUse
	case !errors.Is(err, pgx.ErrNoRows):
		return uuid.Nil, fmt.Errorf("look up user by email: %w", err)
	}

	if !h.provider.DomainAllowed(claims.Email) {
		return uuid.Nil, errSignupNotAllowed
	}

	username, err := freeUsername(ctx, qtx, auth.UsernameCandidate(claims))
	if err != nil {
		return uuid.Nil, err
	}

	created, err := qtx.CreateUser(ctx, gen.CreateUserParams{
		Username:     username,
		Email:        claims.Email,
		PasswordHash: nil,
		RoleID:       auth.RoleViewerID,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.ConstraintName == "users_email_unique_ci" {
			return uuid.Nil, errEmailInUse
		}
		return uuid.Nil, fmt.Errorf("create user: %w", err)
	}

	slog.InfoContext(ctx, "created user from oidc login", "user_id", created.ID, "username", username)
	return created.ID, nil
}

// freeUsername returns base, or base with the first free "-N" suffix.
func freeUsername(ctx context.Context, q *gen.Queries, base string) (string, error) {
	candidate := base
	for n := 2; n <= maxUsernameSuffix; n++ {
		taken, err := q.UsernameExists(ctx, candidate)
		if err != nil {
			return "", fmt.Errorf("check username: %w", err)
		}
		if !taken {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", base, n)
	}
	return "", fmt.Errorf("no free username for %q", base)
}

// fail logs why single sign-on failed and sends the browser back to the login
// page with errCode.
func (h *oidcHandler) fail(w http.ResponseWriter, r *http.Request, errCode, reason string, err error) {
	slog.WarnContext(r.Context(), "oidc login failed", "reason", reason, "error", err)
	http.Redirect(w, r, "/auth/login?error="+errCode, http.StatusFound)
}

// safeNext keeps only a same-site path to return to after login, so ?next=
// cannot be used as an open redirect. Anything else becomes "/".
func safeNext(next string) string {
	if next == "" || next[0] != '/' {
		return "/"
	}

	if len(next) > 1 && (next[1] == '/' || next[1] == '\\') {
		return "/"
	}
	if strings.ContainsFunc(next, func(r rune) bool { return r < 0x20 || r == 0x7f }) {
		return "/"
	}
	u, err := url.Parse(next)
	if err != nil || u.Scheme != "" || u.Host != "" {
		return "/"
	}
	return next
}

// AuthProviders tells the login page which ways of logging in exist.
type AuthProviders struct {
	Password bool              `json:"password" doc:"Username and password login is available"`
	OIDC     *OIDCProviderInfo `json:"oidc,omitempty" doc:"Single sign-on, absent when disabled"`
}

// OIDCProviderInfo describes the single sign-on button.
type OIDCProviderInfo struct {
	Name     string `json:"name" doc:"Label for the login button" example:"SSO"`
	LoginURL string `json:"loginUrl" doc:"Path to navigate to, accepts ?next=" example:"/api/auth/oidc/login"`
}

// AuthProvidersOutput wraps AuthProviders as an HTTP response body.
type AuthProvidersOutput struct {
	Body AuthProviders
}

// RegisterAuthProviders mounts the public endpoint the login page reads.
// provider is nil when single sign-on is disabled.
func RegisterAuthProviders(api huma.API, provider *auth.OIDCProvider) {
	huma.Register(api, huma.Operation{
		OperationID: "list-auth-providers",
		Method:      http.MethodGet,
		Path:        "/api/auth/providers",
		Summary:     "List the available login methods",
		Tags:        []string{"auth"},
	}, func(ctx context.Context, _ *struct{}) (*AuthProvidersOutput, error) {
		out := AuthProviders{Password: true}
		if provider != nil {
			out.OIDC = &OIDCProviderInfo{Name: provider.Name, LoginURL: OIDCLoginPath}
		}
		return &AuthProvidersOutput{Body: out}, nil
	})
}
