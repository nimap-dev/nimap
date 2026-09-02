package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
)

type UserIDInput struct {
	ID uuid.UUID `path:"id"`
}

type CreateUserInput struct {
	Body struct {
		Username string `json:"username" minLength:"3" example:"admin" doc:"Account username"`
		Email    string `json:"email" format:"email" doc:"Account email address"`
		Password string `json:"password" minLength:"8" doc:"Initial account password"`
		Role     Role   `json:"role" doc:"Role the account starts with"`
	}
}

type UpdateUserInput struct {
	ID   uuid.UUID `path:"id"`
	Body struct {
		Username string `json:"username" minLength:"3" doc:"New account username"`
		Email    string `json:"email" format:"email" doc:"New account email address"`
	}
}

type UpdateUserRoleInput struct {
	ID   uuid.UUID `path:"id"`
	Body struct {
		Role Role `json:"role" doc:"Role to move the account to"`
	}
}

type ResetUserPasswordInput struct {
	ID   uuid.UUID `path:"id"`
	Body struct {
		NewPassword string `json:"newPassword" minLength:"8" doc:"New account password"`
	}
}

type ListUsersOutput struct {
	Body []User
}

// RegisterAdmin mounts the account-administration operations on the huma API.s
func RegisterAdmin(api huma.API, q *gen.Queries) {
	huma.Register(api, huma.Operation{
		OperationID: "list-users",
		Method:      http.MethodGet,
		Path:        "/api/admin/users",
		Summary:     "Returns all user accounts",
		Tags:        []string{"admin"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ManageUsers},
	}, func(ctx context.Context, _ *struct{}) (*ListUsersOutput, error) {
		users, err := q.ListUsers(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError("user list failed")
		}

		result := make([]User, 0, len(users))
		for _, user := range users {
			result = append(result, User{
				ID:          user.ID,
				Username:    user.Username,
				Email:       user.Email,
				Role:        user.Role,
				Permissions: permissionStrings(user.RoleID),
				CreatedAt:   user.CreatedAt,
				UpdatedAt:   user.UpdatedAt,
			})
		}

		return &ListUsersOutput{Body: result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-user",
		Method:      http.MethodGet,
		Path:        "/api/admin/users/{id}",
		Summary:     "Returns the user account with the provided id",
		Tags:        []string{"admin"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ManageUsers},
	}, func(ctx context.Context, in *UserIDInput) (*UserOutput, error) {
		user, err := q.GetUserByID(ctx, in.ID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("user not found")
			}
			return nil, huma.Error500InternalServerError("could not load user")
		}

		return &UserOutput{Body: User{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        user.Role,
			Permissions: permissionStrings(user.RoleID),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-user",
		Method:        http.MethodPost,
		Path:          "/api/admin/users",
		Summary:       "Creates a user account",
		Tags:          []string{"admin"},
		DefaultStatus: http.StatusCreated,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.ManageUsers},
	}, func(ctx context.Context, in *CreateUserInput) (*UserOutput, error) {
		roleID, ok := auth.RoleID(string(in.Body.Role))
		if !ok {
			return nil, huma.Error422UnprocessableEntity("unknown role")
		}

		hash, err := auth.HashPassword(in.Body.Password)
		if err != nil {
			return nil, huma.Error500InternalServerError("user creation failed")
		}

		user, err := q.CreateUser(ctx, gen.CreateUserParams{
			Username:     strings.TrimSpace(in.Body.Username),
			Email:        strings.TrimSpace(in.Body.Email),
			PasswordHash: hash,
			RoleID:       roleID,
		})
		if err != nil {
			if invalid := userConstraintError(err); invalid != nil {
				return nil, invalid
			}
			return nil, huma.Error500InternalServerError("user creation failed")
		}

		role, _ := auth.RoleName(user.RoleID)

		return &UserOutput{Body: User{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        role,
			Permissions: permissionStrings(user.RoleID),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-user",
		Method:      http.MethodPut,
		Path:        "/api/admin/users/{id}",
		Summary:     "Updates the username and email of the account with the provided id",
		Tags:        []string{"admin"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ManageUsers},
	}, func(ctx context.Context, in *UpdateUserInput) (*UserOutput, error) {
		if err := forbidSelf(ctx, in.ID); err != nil {
			return nil, err
		}

		user, err := q.UpdateUserAccount(ctx, gen.UpdateUserAccountParams{
			ID:       in.ID,
			Username: strings.TrimSpace(in.Body.Username),
			Email:    strings.TrimSpace(in.Body.Email),
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("user not found")
			}

			if invalid := userConstraintError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError("user update failed")
		}

		return &UserOutput{Body: User{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        user.Role,
			Permissions: permissionStrings(user.RoleID),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-user-role",
		Method:      http.MethodPatch,
		Path:        "/api/admin/users/{id}/role",
		Summary:     "Changes the role of the account with the provided id",
		Tags:        []string{"admin"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ManageUsers},
	}, func(ctx context.Context, in *UpdateUserRoleInput) (*UserOutput, error) {
		if err := forbidSelf(ctx, in.ID); err != nil {
			return nil, err
		}

		roleID, ok := auth.RoleID(string(in.Body.Role))
		if !ok {
			return nil, huma.Error422UnprocessableEntity("unknown role")
		}

		if roleID != auth.RoleAdminID {
			if err := keepLastAdmin(ctx, q, in.ID); err != nil {
				return nil, err
			}
		}

		user, err := q.UpdateUserRole(ctx, gen.UpdateUserRoleParams{
			ID:     in.ID,
			RoleID: roleID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("user not found")
			}

			if invalid := userConstraintError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError("role change failed")
		}

		return &UserOutput{Body: User{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        user.Role,
			Permissions: permissionStrings(user.RoleID),
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "reset-user-password",
		Method:        http.MethodPatch,
		Path:          "/api/admin/users/{id}/password",
		Summary:       "Sets a new password on the account with the provided id",
		Tags:          []string{"admin"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.ManageUsers},
	}, func(ctx context.Context, in *ResetUserPasswordInput) (*struct{}, error) {
		if err := forbidSelf(ctx, in.ID); err != nil {
			return nil, err
		}

		if _, err := q.GetUserRoleID(ctx, in.ID); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("user not found")
			}
			return nil, huma.Error500InternalServerError("password reset failed")
		}

		hash, err := auth.HashPassword(in.Body.NewPassword)
		if err != nil {
			return nil, huma.Error500InternalServerError("password reset failed")
		}

		if err := q.UpdateUserPasswordHash(ctx, gen.UpdateUserPasswordHashParams{
			ID:           in.ID,
			PasswordHash: hash,
		}); err != nil {
			return nil, huma.Error500InternalServerError("password reset failed")
		}

		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-user",
		Method:        http.MethodDelete,
		Path:          "/api/admin/users/{id}",
		Summary:       "Deletes the user account with the provided id",
		Tags:          []string{"admin"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.ManageUsers},
	}, func(ctx context.Context, in *UserIDInput) (*struct{}, error) {
		if err := forbidSelf(ctx, in.ID); err != nil {
			return nil, err
		}

		if err := keepLastAdmin(ctx, q, in.ID); err != nil {
			return nil, err
		}

		affected, err := q.DeleteUser(ctx, in.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("user deletion failed")
		}

		if affected == 0 {
			return nil, huma.Error404NotFound("user not found")
		}

		return nil, nil
	})
}

// forbidSelf refuses an admin action aimed at the admin's own account.
func forbidSelf(ctx context.Context, target uuid.UUID) error {
	actor, ok := UserIDFromContext(ctx)
	if ok && actor == target {
		return huma.Error403Forbidden(
			"an admin cannot change their own account here, use account settings",
		)
	}

	return nil
}

// keepLastAdmin refuses to demote or delete the only remaining admin.
func keepLastAdmin(ctx context.Context, q *gen.Queries, target uuid.UUID) error {
	roleID, err := q.GetUserRoleID(ctx, target)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return huma.Error404NotFound("user not found")
		}
		return huma.Error500InternalServerError("could not load user")
	}

	if roleID != auth.RoleAdminID {
		return nil
	}

	admins, err := q.CountUsersWithRole(ctx, auth.RoleAdminID)
	if err != nil {
		return huma.Error500InternalServerError("could not count admins")
	}

	if admins <= 1 {
		return huma.Error409Conflict(
			"this is the last admin account, promote another before changing it",
		)
	}

	return nil
}
