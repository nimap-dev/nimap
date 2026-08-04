package httpapi

import (
	"context"
	"net/http"

	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

// ctxKey is an unexported context-key type so values stored by this package
// never collide with keys set elsewhere.
type ctxKey string

// userIDKey holds the authenticated user's uuid.UUID in the request context.
const userIDKey ctxKey = "user_id"

// requireAuthMetaKey is the huma operation metadata flag marking an operation
// as authenticated-only. Set it when registering an operation and the auth
// middleware rejects anonymous callers with 401 before the handler runs:
//
//	huma.Register(api, huma.Operation{
//		// ...
//		Metadata: map[string]any{requireAuthMetaKey: true},
//	}, handler)
const requireAuthMetaKey = "requireAuth"

// NewAuthMiddleware resolves the session user once per request and stores its
// id on the context. Operations that opt in via Metadata[requireAuthMetaKey]
// are answered with 401 when no user is logged in, so their handlers can read
// the id with UserIDFromContext without repeating the session lookup or the
// unauthorized check.
func NewAuthMiddleware(api huma.API, sm *scs.SessionManager) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		id, ok := currentUserID(ctx.Context(), sm)
		if ok {
			ctx = huma.WithValue(ctx, userIDKey, id)
		}

		if requiresAuth(ctx.Operation()) && !ok {
			_ = huma.WriteErr(api, ctx, http.StatusUnauthorized, "not authenticated")
			return
		}

		next(ctx)
	}
}

// currentUserID reads the authenticated user's id from the session, if any.
func currentUserID(ctx context.Context, sm *scs.SessionManager) (uuid.UUID, bool) {
	raw := sm.GetString(ctx, sessionUserIDKey)
	if raw == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

// UserIDFromContext returns the authenticated user's id. ok is false when the
// request has no logged-in user, that cannot happen inside a handler whose
// operation is marked with Metadata[requireAuthMetaKey].
func UserIDFromContext(ctx context.Context) (id uuid.UUID, ok bool) {
	id, ok = ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

func requiresAuth(op *huma.Operation) bool {
	if op == nil {
		return false
	}
	required, _ := op.Metadata[requireAuthMetaKey].(bool)
	return required
}
