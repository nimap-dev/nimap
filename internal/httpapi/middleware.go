package httpapi

import (
	"context"
	"net/http"

	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
)

// ctxKey is an unexported context-key type so values stored by this package
// never collide with keys set elsewhere.
type ctxKey string

const (
	// userIDKey holds the authenticated user's uuid.UUID in the request context.
	userIDKey ctxKey = "user_id"

	// roleIDKey holds that user's role id, as auth.Allows takes it.
	roleIDKey ctxKey = "role_id"
)

// Operation metadata driving the auth middleware. Set one of these when
// registering an operation and the middleware answers anonymous callers with
// 401, and under-privileged ones with 403, before the handler runs:
//
//	huma.Register(api, huma.Operation{
//		// ...
//		Metadata: map[string]any{requirePermissionMetaKey: auth.WriteRecords},
//	}, handler)
//
// They say different things. requireAuth asks only for a logged-in user,
// whatever they may do; requirePermission asks for one allowed to do a
// particular thing, and implies being logged in.
const (
	requireAuthMetaKey       = "requireAuth"
	requirePermissionMetaKey = "requirePermission"
)

// sessionUser is who the request is from, as far as the middleware cares.
type sessionUser struct {
	id     uuid.UUID
	roleID int16
}

// NewAuthMiddleware resolves the session user once per request and stores its
// id and role on the context, so handlers can read the id with
// UserIDFromContext without repeating the session lookup or the access check.
func NewAuthMiddleware(api huma.API, sm *scs.SessionManager, q *gen.Queries) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		op := ctx.Operation()
		permission, needsPermission := requiredPermission(op)

		user, ok := resolveUser(ctx.Context(), sm, q)
		if ok {
			ctx = huma.WithValue(ctx, userIDKey, user.id)
			ctx = huma.WithValue(ctx, roleIDKey, user.roleID)
		}

		if needsPermission || requiresAuth(op) {
			if !ok {
				_ = huma.WriteErr(api, ctx, http.StatusUnauthorized, "not authenticated")
				return
			}

			if needsPermission && !auth.Allows(user.roleID, permission) {
				_ = huma.WriteErr(api, ctx, http.StatusForbidden, "not allowed")
				return
			}
		}

		next(ctx)
	}
}

// resolveUser reads the logged-in user from the session and looks up the role
// that decides what they may do. ok is false when nobody is logged in, and also
// when the account behind a live session has since been deleted: the query
// filters those out, so the session stops opening doors on the next request
// rather than at its next login.
func resolveUser(ctx context.Context, sm *scs.SessionManager, q *gen.Queries) (sessionUser, bool) {
	raw := sm.GetString(ctx, sessionUserIDKey)
	if raw == "" {
		return sessionUser{}, false
	}

	id, err := uuid.Parse(raw)
	if err != nil {
		return sessionUser{}, false
	}

	roleID, err := q.GetUserRoleID(ctx, id)
	if err != nil {
		return sessionUser{}, false
	}

	return sessionUser{id: id, roleID: roleID}, true
}

// UserIDFromContext returns the authenticated user's id. ok is false when the
// request has no logged-in user, that cannot happen inside a handler whose
// operation carries either of the metadata keys above.
func UserIDFromContext(ctx context.Context) (id uuid.UUID, ok bool) {
	id, ok = ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

// RoleIDFromContext returns the authenticated user's role id, for a handler
// that has to narrow what it returns rather than refuse the call outright.
func RoleIDFromContext(ctx context.Context) (roleID int16, ok bool) {
	roleID, ok = ctx.Value(roleIDKey).(int16)
	return roleID, ok
}

func requiresAuth(op *huma.Operation) bool {
	if op == nil {
		return false
	}

	required, _ := op.Metadata[requireAuthMetaKey].(bool)
	return required
}

func requiredPermission(op *huma.Operation) (auth.Permission, bool) {
	if op == nil {
		return "", false
	}

	permission, ok := op.Metadata[requirePermissionMetaKey].(auth.Permission)
	return permission, ok
}
