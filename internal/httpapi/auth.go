package httpapi

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
)

// sessionUserIDKey is the scs session key holding the logged-in user's UUID.
const sessionUserIDKey = "user_id"

// User is the API representation of an account.
type User struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// LoginInput is the request body for POST /api/auth/login.
type LoginInput struct {
	Body struct {
		Username string `json:"username" minLength:"3" example:"admin" doc:"Account username (case-insensitive)"`
		Password string `json:"password" minLength:"1" doc:"Account password"`
	}
}

// UserOutput wraps a User as an HTTP response body.
type UserOutput struct {
	Body User
}

// RegisterAuth mounts the authentication operations on the huma API.
func RegisterAuth(api huma.API, pool *pgxpool.Pool, sm *scs.SessionManager) {
	q := gen.New(pool)

	huma.Register(api, huma.Operation{
		OperationID: "login",
		Method:      http.MethodPost,
		Path:        "/api/auth/login",
		Summary:     "Log in with username and password",
		Tags:        []string{"auth"},
	}, func(ctx context.Context, in *LoginInput) (*UserOutput, error) {
		user, err := q.GetUserByUsername(ctx, in.Body.Username)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error401Unauthorized("invalid credentials")
			}
			return nil, huma.Error500InternalServerError("login failed")
		}

		match, needsRehash, err := auth.VerifyPassword(in.Body.Password, user.PasswordHash)
		if err != nil || !match {
			return nil, huma.Error401Unauthorized("invalid credentials")
		}

		// Upgrade the stored hash if it predates the current parameters.
		if needsRehash {
			if fresh, herr := auth.HashPassword(in.Body.Password); herr == nil {
				_ = q.UpdateUserPasswordHash(ctx, gen.UpdateUserPasswordHashParams{
					ID:           user.ID,
					PasswordHash: fresh,
				})
			}
		}

		if err := sm.RenewToken(ctx); err != nil {
			return nil, huma.Error500InternalServerError("could not start session")
		}
		sm.Put(ctx, sessionUserIDKey, user.ID.String())

		return &UserOutput{Body: User{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-current-user",
		Method:      http.MethodGet,
		Path:        "/api/auth/me",
		Summary:     "Return the currently authenticated user",
		Tags:        []string{"auth"},
		Metadata:    map[string]any{requireAuthMetaKey: true},
	}, func(ctx context.Context, _ *struct{}) (*UserOutput, error) {
		// The auth middleware guarantees a user id is present on the context
		// for operations marked requireAuth.
		id, _ := UserIDFromContext(ctx)

		user, err := q.GetUserByID(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error401Unauthorized("not authenticated")
			}
			return nil, huma.Error500InternalServerError("could not load user")
		}

		return &UserOutput{Body: User{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "logout",
		Method:        http.MethodPost,
		Path:          "/api/auth/logout",
		Summary:       "Log out and end the current session",
		Tags:          []string{"auth"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, _ *struct{}) (*struct{}, error) {
		// Destroy is idempotent: logging out without a session is a no-op, so
		// this stays safe to call and returns 204 either way.
		if err := sm.Destroy(ctx); err != nil {
			return nil, huma.Error500InternalServerError("could not end session")
		}
		return nil, nil
	})
}
