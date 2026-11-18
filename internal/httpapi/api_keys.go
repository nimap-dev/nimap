package httpapi

import (
	"context"
	"crypto/sha512"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"

	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/utils"
)

// apiKeyPrefix starts every API key, so a key is recognisable as one wherever
// it ends up, a secret scanner included.
const apiKeyPrefix = "nimap_"

// apiKeyBytes is how much randomness a key carries before encoding.
const apiKeyBytes = 64

// apiKeyShownLength is how much of a key the list shows: the fixed prefix and
// a few random characters, enough to tell keys apart and nowhere near enough to
// guess the rest.
const apiKeyShownLength = len(apiKeyPrefix) + 8

type APIKey struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	Prefix     string     `json:"prefix" doc:"The start of the key, to tell keys apart"`
	CreatedAt  time.Time  `json:"createdAt"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty" doc:"When the key last authenticated a request, to the minute"`
	ExpiresAt  *time.Time `json:"expiresAt,omitempty" doc:"When the key stops working; absent never expires"`
}

type CreatedAPIKey struct {
	APIKey
	Token string `json:"token" doc:"The whole key. It is shown only this once; send it as Authorization: Bearer <token>"`
}

type CreateAPIKeyInput struct {
	Body struct {
		Name      string     `json:"name" minLength:"1" maxLength:"100" doc:"What the key is for, such as Ansible"`
		ExpiresAt *time.Time `json:"expiresAt,omitempty" doc:"When the key stops working, in the future; omit it for a key that never expires"`
	}
}

type APIKeyIDInput struct {
	ID uuid.UUID `path:"id"`
}

type ListAPIKeysOutput struct {
	Body []APIKey
}

type CreateAPIKeyOutput struct {
	Body CreatedAPIKey
}

// RegisterAPIKeys mounts the operations that manage the current user's API
// keys. They all need a session, so a key cannot manage keys.
func RegisterAPIKeys(api huma.API, q *gen.Queries) {
	huma.Register(api, huma.Operation{
		OperationID: "list-api-keys",
		Method:      http.MethodGet,
		Path:        "/api/auth/api-keys",
		Summary:     "Returns the current user's API keys",
		Tags:        []string{"auth"},
		Metadata:    map[string]any{requireSessionMetaKey: true},
	}, func(ctx context.Context, _ *struct{}) (*ListAPIKeysOutput, error) {
		userID, _ := UserIDFromContext(ctx)

		rows, err := q.ListUserAPIKeys(ctx, userID)
		if err != nil {
			return nil, huma.Error500InternalServerError("could not load API keys")
		}

		keys := make([]APIKey, 0, len(rows))
		for _, row := range rows {
			keys = append(keys, APIKey{
				ID:         row.ID,
				Name:       row.Name,
				Prefix:     row.Prefix,
				CreatedAt:  row.CreatedAt,
				LastUsedAt: row.LastUsedAt,
				ExpiresAt:  row.ExpiresAt,
			})
		}

		return &ListAPIKeysOutput{Body: keys}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-api-key",
		Method:        http.MethodPost,
		Path:          "/api/auth/api-keys",
		Summary:       "Creates an API key for the current user",
		Description:   "The key acts as the user, with the user's role, everywhere but the operations that need a session. The response is the only time the whole key is returned.",
		Tags:          []string{"auth"},
		DefaultStatus: http.StatusCreated,
		Metadata:      map[string]any{requireSessionMetaKey: true},
	}, func(ctx context.Context, in *CreateAPIKeyInput) (*CreateAPIKeyOutput, error) {
		userID, _ := UserIDFromContext(ctx)

		name := strings.TrimSpace(in.Body.Name)
		if name == "" {
			return nil, huma.Error422UnprocessableEntity("name cannot be blank")
		}

		if in.Body.ExpiresAt != nil && !in.Body.ExpiresAt.After(time.Now()) {
			return nil, huma.Error422UnprocessableEntity("expiry must be in the future")
		}

		random, err := utils.RandomString(apiKeyBytes)
		if err != nil {
			return nil, huma.Error500InternalServerError("could not create API key")
		}

		token := apiKeyPrefix + random
		hash := sha512.Sum512([]byte(token))

		row, err := q.CreateAPIKey(ctx, gen.CreateAPIKeyParams{
			UserID:    userID,
			Name:      name,
			Prefix:    token[:apiKeyShownLength],
			TokenHash: hash[:],
			ExpiresAt: in.Body.ExpiresAt,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("could not create API key")
		}

		return &CreateAPIKeyOutput{Body: CreatedAPIKey{
			APIKey: APIKey{
				ID:         row.ID,
				Name:       row.Name,
				Prefix:     row.Prefix,
				CreatedAt:  row.CreatedAt,
				LastUsedAt: row.LastUsedAt,
				ExpiresAt:  row.ExpiresAt,
			},
			Token: token,
		}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-api-key",
		Method:        http.MethodDelete,
		Path:          "/api/auth/api-keys/{id}",
		Summary:       "Revokes one of the current user's API keys",
		Tags:          []string{"auth"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requireSessionMetaKey: true},
	}, func(ctx context.Context, in *APIKeyIDInput) (*struct{}, error) {
		userID, _ := UserIDFromContext(ctx)

		affected, err := q.DeleteAPIKey(ctx, gen.DeleteAPIKeyParams{
			ID:     in.ID,
			UserID: userID,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("could not revoke API key")
		}

		if affected == 0 {
			return nil, huma.Error404NotFound("API key not found")
		}

		return nil, nil
	})
}
