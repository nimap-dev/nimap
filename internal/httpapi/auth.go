package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/httpapi/apitypes"
)

// sessionUserIDKey is the scs session key holding the logged-in user's UUID.
const sessionUserIDKey = "user_id"

// User is the API representation of an account.
type User struct {
	ID          uuid.UUID     `json:"id"`
	Username    string        `json:"username"`
	Email       string        `json:"email"`
	Role        apitypes.Role `json:"role"`
	Permissions []string      `json:"permissions"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
	HasPassword bool          `json:"hasPassword" doc:"Whether the account has a password; single sign-on accounts may have none"`
	Identities  []Identity    `json:"identities" doc:"Single sign-on accounts linked to this user"`
}

// Identity is an account at an OIDC provider that logs in as a user.
type Identity struct {
	ID          uuid.UUID `json:"id"`
	Issuer      string    `json:"issuer" doc:"OIDC issuer the account belongs to"`
	Subject     string    `json:"subject" doc:"The account's stable id at the issuer"`
	Email       *string   `json:"email,omitempty" doc:"Email the issuer reported at the last login"`
	LinkedAt    time.Time `json:"linkedAt" doc:"When the account was first used to log in"`
	LastLoginAt time.Time `json:"lastLoginAt" doc:"When the account last logged in"`
}

// userIdentities loads the identities linked to one user, never nil so the
// field always encodes as a list.
func userIdentities(ctx context.Context, q *gen.Queries, userID uuid.UUID) ([]Identity, error) {
	rows, err := q.ListUserIdentities(ctx, userID)
	if err != nil {
		return nil, err
	}

	out := make([]Identity, 0, len(rows))
	for _, row := range rows {
		out = append(out, Identity{
			ID:          row.ID,
			Issuer:      row.Issuer,
			Subject:     row.Subject,
			Email:       row.Email,
			LinkedAt:    row.CreatedAt,
			LastLoginAt: row.LastLoginAt,
		})
	}
	return out, nil
}

// identitiesByUser loads every identity at once, grouped by user, for lists.
func identitiesByUser(ctx context.Context, q *gen.Queries) (map[uuid.UUID][]Identity, error) {
	rows, err := q.ListAllUserIdentities(ctx)
	if err != nil {
		return nil, err
	}

	out := make(map[uuid.UUID][]Identity)
	for _, row := range rows {
		out[row.UserID] = append(out[row.UserID], Identity{
			ID:          row.ID,
			Issuer:      row.Issuer,
			Subject:     row.Subject,
			Email:       row.Email,
			LinkedAt:    row.CreatedAt,
			LastLoginAt: row.LastLoginAt,
		})
	}
	return out, nil
}

// permissionStrings renders a role's grants for the wire.
func permissionStrings(roleID int16) []string {
	permissions := auth.PermissionsFor(roleID)

	out := make([]string, len(permissions))
	for i, permission := range permissions {
		out[i] = string(permission)
	}

	return out
}

// LoginInput is the request body for POST /api/auth/login.
type LoginInput struct {
	Body struct {
		Username string `json:"username" minLength:"3" example:"admin" doc:"Account username (case-insensitive)"`
		Password string `json:"password" minLength:"1" doc:"Account password"`
	}
}

// UpdatePasswordInput is the request body for PATCH /api/auth/account/password.
type UpdatePasswordInput struct {
	Body struct {
		CurrentPassword string `json:"currentPassword" required:"false" doc:"Current account password; omitted when the account has none yet"`
		NewPassword     string `json:"newPassword" minLength:"8" doc:"New account password"`
	}
}

// UpdateAccountInput is the request body for PUT /api/auth/account. It asks for
// the current password again because changing the email is by itself enough to
// take the account over, and a session left open on an unattended machine
// should not be enough to do that. A single sign-on account without a password
// has nothing to confirm with, so for it the session is enough.
type UpdateAccountInput struct {
	Body struct {
		Username        string `json:"username" minLength:"3" example:"admin" doc:"New account username"`
		Email           string `json:"email" format:"email" doc:"New account email address"`
		CurrentPassword string `json:"currentPassword" required:"false" doc:"Current account password, confirming the change; omitted when the account has none"`
	}
}

// UserOutput wraps a User as an HTTP response body.
type UserOutput struct {
	Body User
}

// Preferences are the current user's display settings. They only shape how the
// interface presents things, so none of them asks for the password again.
type Preferences struct {
	Language   apitypes.Language   `json:"language" doc:"Interface language"`
	Timezone   *apitypes.Timezone  `json:"timezone,omitempty" doc:"Time zone dates and times are shown in; absent follows the browser"`
	DateFormat apitypes.DateFormat `json:"dateFormat" doc:"How calendar dates are written"`
	TimeFormat apitypes.TimeFormat `json:"timeFormat" doc:"Whether times use a 24-hour or a 12-hour clock"`
	Theme      apitypes.Theme      `json:"theme" doc:"Colour scheme of the interface"`
}

// UpdatePreferencesInput is the request body for PUT /api/auth/account/preferences.
// Every preference is sent each time, an absent timezone clearing a chosen one.
type UpdatePreferencesInput struct {
	Body Preferences
}

// PreferencesOutput wraps Preferences as an HTTP response body.
type PreferencesOutput struct {
	Body Preferences
}

// RegisterAuth mounts the authentication operations on the huma API.
func RegisterAuth(api huma.API, q *gen.Queries, sm *scs.SessionManager) {
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

		// Single sign-on users have no password
		if user.PasswordHash == nil {
			return nil, huma.Error401Unauthorized("invalid credentials")
		}

		match, needsRehash, err := auth.VerifyPassword(in.Body.Password, *user.PasswordHash)
		if err != nil || !match {
			return nil, huma.Error401Unauthorized("invalid credentials")
		}

		// Upgrade the stored hash if it predates the current parameters.
		if needsRehash {
			if fresh, herr := auth.HashPassword(in.Body.Password); herr == nil {
				_ = q.UpdateUserPasswordHash(ctx, gen.UpdateUserPasswordHashParams{
					ID:           user.ID,
					PasswordHash: &fresh,
				})
			}
		}

		if err := sm.RenewToken(ctx); err != nil {
			return nil, huma.Error500InternalServerError("could not start session")
		}
		sm.Put(ctx, sessionUserIDKey, user.ID.String())

		identities, err := userIdentities(ctx, q, user.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("could not load user")
		}

		return &UserOutput{Body: User{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        apitypes.Role(user.Role),
			Permissions: permissionStrings(user.RoleID),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
			HasPassword: true,
			Identities:  identities,
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

		identities, err := userIdentities(ctx, q, user.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("could not load user")
		}

		return &UserOutput{Body: User{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        apitypes.Role(user.Role),
			Permissions: permissionStrings(user.RoleID),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
			HasPassword: user.HasPassword,
			Identities:  identities,
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

	huma.Register(api, huma.Operation{
		OperationID:   "update-password",
		Method:        http.MethodPatch,
		Path:          "/api/auth/account/password",
		Summary:       "Change the current user's password",
		Tags:          []string{"auth"},
		Metadata:      map[string]any{requireAuthMetaKey: true},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *UpdatePasswordInput) (*struct{}, error) {
		// The auth middleware guarantees a user id is present on the context
		// for operations marked requireAuth.
		id, _ := UserIDFromContext(ctx)

		if err := verifyCurrentPassword(ctx, q, id, in.Body.CurrentPassword); err != nil {
			return nil, err
		}

		hash, err := auth.HashPassword(in.Body.NewPassword)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"could not change password",
			)
		}

		if err := q.UpdateUserPasswordHash(ctx, gen.UpdateUserPasswordHashParams{
			ID:           id,
			PasswordHash: &hash,
		}); err != nil {
			return nil, huma.Error500InternalServerError(
				"could not change password",
			)
		}

		if err := sm.RenewToken(ctx); err != nil {
			return nil, huma.Error500InternalServerError(
				"could not renew session",
			)
		}

		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-account",
		Method:      http.MethodPut,
		Path:        "/api/auth/account",
		Summary:     "Update the current user's username and email",
		Tags:        []string{"auth"},
		Metadata:    map[string]any{requireAuthMetaKey: true},
	}, func(ctx context.Context, in *UpdateAccountInput) (*UserOutput, error) {
		id, _ := UserIDFromContext(ctx)

		if err := verifyCurrentPassword(ctx, q, id, in.Body.CurrentPassword); err != nil {
			return nil, err
		}

		user, err := q.UpdateUserAccount(ctx, gen.UpdateUserAccountParams{
			ID:       id,
			Username: strings.TrimSpace(in.Body.Username),
			Email:    strings.TrimSpace(in.Body.Email),
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error401Unauthorized("not authenticated")
			}

			if invalid := userConstraintError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"account update failed",
			)
		}

		identities, err := userIdentities(ctx, q, user.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("could not load user")
		}

		return &UserOutput{Body: User{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        apitypes.Role(user.Role),
			Permissions: permissionStrings(user.RoleID),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
			HasPassword: user.HasPassword,
			Identities:  identities,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-account-preferences",
		Method:      http.MethodGet,
		Path:        "/api/auth/account/preferences",
		Summary:     "Return the current user's display preferences",
		Tags:        []string{"auth"},
		Metadata:    map[string]any{requireAuthMetaKey: true},
	}, func(ctx context.Context, _ *struct{}) (*PreferencesOutput, error) {
		id, _ := UserIDFromContext(ctx)

		preferences, err := q.GetUserPreferences(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error401Unauthorized("not authenticated")
			}
			return nil, huma.Error500InternalServerError(
				"could not load preferences",
			)
		}

		return &PreferencesOutput{Body: Preferences{
			Language:   apitypes.Language(preferences.Language),
			Timezone:   timezoneResponse(preferences.Timezone),
			DateFormat: apitypes.DateFormat(preferences.DateFormat),
			TimeFormat: apitypes.TimeFormat(preferences.TimeFormat),
			Theme:      apitypes.Theme(preferences.Theme),
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-account-preferences",
		Method:      http.MethodPut,
		Path:        "/api/auth/account/preferences",
		Summary:     "Update the current user's display preferences",
		Tags:        []string{"auth"},
		Metadata:    map[string]any{requireAuthMetaKey: true},
	}, func(ctx context.Context, in *UpdatePreferencesInput) (*PreferencesOutput, error) {
		id, _ := UserIDFromContext(ctx)

		preferences, err := q.UpdateUserPreferences(ctx, gen.UpdateUserPreferencesParams{
			ID:         id,
			Language:   gen.AuthLanguage(in.Body.Language),
			Timezone:   timezoneParam(in.Body.Timezone),
			DateFormat: gen.AuthDateFormat(in.Body.DateFormat),
			TimeFormat: gen.AuthTimeFormat(in.Body.TimeFormat),
			Theme:      gen.AuthTheme(in.Body.Theme),
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error401Unauthorized("not authenticated")
			}
			return nil, huma.Error500InternalServerError(
				"preferences update failed",
			)
		}

		return &PreferencesOutput{Body: Preferences{
			Language:   apitypes.Language(preferences.Language),
			Timezone:   timezoneResponse(preferences.Timezone),
			DateFormat: apitypes.DateFormat(preferences.DateFormat),
			TimeFormat: apitypes.TimeFormat(preferences.TimeFormat),
			Theme:      apitypes.Theme(preferences.Theme),
		}}, nil
	})
}

// verifyCurrentPassword re-checks the password of the already logged-in user,
// for the operations that will not act on a live session alone. The error it
// returns is ready to hand back to huma.
func verifyCurrentPassword(
	ctx context.Context,
	q *gen.Queries,
	id uuid.UUID,
	password string,
) error {
	hash, err := q.GetUserPasswordHashByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return huma.Error401Unauthorized("not authenticated")
		}
		return huma.Error500InternalServerError("could not load user")
	}

	// A single sign-on account without a password has nothing to re-check;
	// the session it logged in with is all the proof there is.
	if hash == nil {
		return nil
	}

	match, _, err := auth.VerifyPassword(password, *hash)
	if err != nil || !match {
		return huma.Error401Unauthorized("current password is incorrect")
	}

	return nil
}

func timezoneParam(timezone *apitypes.Timezone) gen.NullAuthTimezone {
	if timezone == nil {
		return gen.NullAuthTimezone{}
	}

	return gen.NullAuthTimezone{
		AuthTimezone: gen.AuthTimezone(*timezone),
		Valid:        true,
	}
}

func timezoneResponse(timezone gen.NullAuthTimezone) *apitypes.Timezone {
	if !timezone.Valid {
		return nil
	}

	value := apitypes.Timezone(timezone.AuthTimezone)

	return &value
}

// userConstraintError turns a constraint on `auth.users` that the caller
// violated into a readable error, and returns nil for anything else. The unique
// indexes are case-insensitive, so a name differing only in case still collides.
// The 23503 is the foreign key, which only ever fires on `role_id`.
func userConstraintError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return nil
	}

	switch pgErr.Code {
	case "23503":
		return huma.Error422UnprocessableEntity("unknown role")
	case "23505":
		switch pgErr.ConstraintName {
		case "users_username_unique_ci":
			return huma.Error409Conflict("username is already taken")
		case "users_email_unique_ci":
			return huma.Error409Conflict("email is already in use")
		default:
			return nil
		}
	case "23514":
		switch pgErr.ConstraintName {
		case "users_username_not_blank":
			return huma.Error422UnprocessableEntity(
				"username must be at least 3 characters",
			)
		case "users_email_not_blank":
			return huma.Error422UnprocessableEntity(
				"email must be at least 6 characters",
			)
		default:
			return nil
		}
	default:
		return nil
	}
}
