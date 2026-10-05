package httpapi

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/text"
)

type ManufacturerResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Website   *string   `json:"website,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ManufacturerRequest struct {
	Name    string  `json:"name" minLength:"1"`
	Website *string `json:"website,omitempty"`
	Notes   *string `json:"notes,omitempty"`
}

type GetManufacturerInput struct {
	ID uuid.UUID `path:"id"`
}

type CreateManufacturerInput struct {
	Body ManufacturerRequest
}

type UpdateManufacturerInput struct {
	ID   uuid.UUID `path:"id"`
	Body ManufacturerRequest
}

type DeleteManufacturerInput struct {
	ID uuid.UUID `path:"id"`
}

type GetManufacturerOutput struct {
	Body ManufacturerResponse
}

type ListManufacturersOutput struct {
	Body []ManufacturerResponse
}

type CreateManufacturerOutput struct {
	Body ManufacturerResponse
}

type UpdateManufacturerOutput struct {
	Body ManufacturerResponse
}

func RegisterManufacturers(api huma.API, q *gen.Queries) {
	huma.Register(api, huma.Operation{
		OperationID: "get-manufacturer",
		Method:      http.MethodGet,
		Path:        "/api/manufacturers/{id}",
		Summary:     "Returns the manufacturer with the provided id",
		Tags:        []string{"manufacturers"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *GetManufacturerInput,
	) (*GetManufacturerOutput, error) {
		manufacturer, err := q.GetManufacturer(ctx, in.ID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("manufacturer not found")
			}

			return nil, huma.Error500InternalServerError(
				"manufacturer get failed",
			)
		}

		return &GetManufacturerOutput{
			Body: manufacturerResponse(manufacturer),
		}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-manufacturers",
		Method:      http.MethodGet,
		Path:        "/api/manufacturers",
		Summary:     "Returns all manufacturers",
		Tags:        []string{"manufacturers"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		_ *struct{},
	) (*ListManufacturersOutput, error) {
		rows, err := q.ListManufacturers(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"manufacturer list failed",
			)
		}

		result := make([]ManufacturerResponse, 0, len(rows))
		for _, row := range rows {
			result = append(result, manufacturerResponse(row))
		}

		return &ListManufacturersOutput{Body: result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-manufacturer",
		Method:        http.MethodPost,
		Path:          "/api/manufacturers",
		Summary:       "Creates a manufacturer",
		Tags:          []string{"manufacturers"},
		DefaultStatus: http.StatusCreated,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *CreateManufacturerInput,
	) (*CreateManufacturerOutput, error) {
		manufacturer, err := q.CreateManufacturer(ctx, gen.CreateManufacturerParams{
			Name:    in.Body.Name,
			Website: in.Body.Website,
			Notes:   in.Body.Notes,
		})
		if err != nil {
			if invalid := manufacturerCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"manufacturer creation failed",
			)
		}

		return &CreateManufacturerOutput{
			Body: manufacturerResponse(manufacturer),
		}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-manufacturer",
		Method:      http.MethodPut,
		Path:        "/api/manufacturers/{id}",
		Summary:     "Updates the manufacturer with the provided id",
		Tags:        []string{"manufacturers"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *UpdateManufacturerInput,
	) (*UpdateManufacturerOutput, error) {
		manufacturer, err := q.UpdateManufacturer(ctx, gen.UpdateManufacturerParams{
			ID:      in.ID,
			Name:    in.Body.Name,
			Website: in.Body.Website,
			Notes:   in.Body.Notes,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("manufacturer not found")
			}

			if invalid := manufacturerCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"manufacturer update failed",
			)
		}

		return &UpdateManufacturerOutput{
			Body: manufacturerResponse(manufacturer),
		}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-manufacturer",
		Method:        http.MethodDelete,
		Path:          "/api/manufacturers/{id}",
		Summary:       "Deletes the manufacturer with the provided id",
		Description:   "Refused while any device model is made by the manufacturer.",
		Tags:          []string{"manufacturers"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *DeleteManufacturerInput,
	) (*struct{}, error) {
		affected, err := q.DeleteManufacturer(ctx, in.ID)
		if err != nil {
			var pgErr *pgconn.PgError
			if !errors.As(err, &pgErr) ||
				(pgErr.Code != "23001" && pgErr.Code != "23503") {
				return nil, huma.Error500InternalServerError(
					"manufacturer deletion failed",
				)
			}

			models, err := q.CountDeviceModelsWithManufacturer(ctx, in.ID)
			if err != nil {
				return nil, huma.Error500InternalServerError(
					"manufacturer deletion failed",
				)
			}

			return nil, huma.Error409Conflict(fmt.Sprintf(
				"manufacturer still has %s and cannot be deleted",
				text.Plural(models, "device model", "device models"),
			))
		}

		if affected == 0 {
			return nil, huma.Error404NotFound("manufacturer not found")
		}

		return nil, nil
	})
}

// manufacturerCheckError turns a constraint on `manufacturers` that the caller
// violated into a readable 4xx, and returns nil for anything else.
func manufacturerCheckError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return nil
	}

	switch pgErr.Code {
	case "23505":
		return huma.Error409Conflict("a manufacturer with that name already exists")
	case "23514":
		switch pgErr.ConstraintName {
		case "manufacturer_name_not_blank":
			return huma.Error422UnprocessableEntity("name cannot be blank")
		case "manufacturer_website_not_blank":
			return huma.Error422UnprocessableEntity("website cannot be blank")
		default:
			return huma.Error422UnprocessableEntity("manufacturer is not valid")
		}
	default:
		return nil
	}
}

// manufacturerResponse is shared with the device models, which nest their
// manufacturer.
func manufacturerResponse(manufacturer gen.Manufacturer) ManufacturerResponse {
	return ManufacturerResponse{
		ID:        manufacturer.ID,
		Name:      manufacturer.Name,
		Website:   manufacturer.Website,
		Notes:     manufacturer.Notes,
		CreatedAt: manufacturer.CreatedAt,
		UpdatedAt: manufacturer.UpdatedAt,
	}
}
