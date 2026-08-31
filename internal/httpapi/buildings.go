package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
)

type CreateBuildingRequest struct {
	Name      string          `json:"name" minLength:"1"`
	Address   *Address        `json:"address,omitempty"`
	Footprint MultiPolygon    `json:"footprint"`
	Notes     *string         `json:"notes,omitempty"`
	Status    LifecycleStatus `json:"status"`
}

type CreateBuildingInput struct {
	Body CreateBuildingRequest
}

type UpdateBuildingRequest struct {
	Name      string       `json:"name" minLength:"1"`
	Address   *Address     `json:"address,omitempty"`
	Footprint MultiPolygon `json:"footprint"`
	Notes     *string      `json:"notes,omitempty"`
}

type UpdateBuildingStatusRequest struct {
	Status LifecycleStatus `json:"status"`
}

type UpdateBuildingInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateBuildingRequest
}

type UpdateBuildingStatusInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateBuildingStatusRequest
}

type GetBuildingInput struct {
	ID uuid.UUID `path:"id"`
}

type ListBuildingsInput struct {
	Status []LifecycleStatus `query:"status" doc:"Lifecycle statuses to include. Defaults to planned and active, which keeps decommissioned and archived buildings off the map and out of the default lists without hiding them from a direct lookup."`
}

type DeleteBuildingInput struct {
	ID uuid.UUID `path:"id"`
}

type BuildingResponse struct {
	ID                  uuid.UUID       `json:"id"`
	Name                string          `json:"name"`
	Address             *Address        `json:"address,omitempty"`
	Footprint           MultiPolygon    `json:"footprint"`
	RepresentativePoint Point           `json:"representativePoint"`
	Notes               *string         `json:"notes,omitempty"`
	Status              LifecycleStatus `json:"status"`
	CreatedAt           time.Time       `json:"createdAt"`
	UpdatedAt           time.Time       `json:"updatedAt"`
}

type GetBuildingOutput struct {
	Body BuildingResponse
}

type ListBuildingsOutput struct {
	Body []BuildingResponse
}

type CreateBuildingOutput struct {
	Body BuildingResponse
}

type UpdateBuildingOutput struct {
	Body BuildingResponse
}

func RegisterBuildings(api huma.API, q *gen.Queries) {
	huma.Register(api, huma.Operation{
		OperationID: "get-building",
		Method:      http.MethodGet,
		Path:        "/api/buildings/{id}",
		Summary:     "Returns building with the provided id",
		Tags:        []string{"buildings"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *GetBuildingInput,
	) (*GetBuildingOutput, error) {
		building, err := q.GetBuilding(ctx, in.ID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("building not found")
			}

			return nil, huma.Error500InternalServerError(
				"building get failed",
			)
		}

		body, err := buildingResponse(
			building.ID,
			building.Name,
			Address{
				Street:  building.AddressStreet,
				City:    building.AddressCity,
				Zip:     building.AddressZip,
				Country: building.AddressCountry,
			},
			building.Footprint,
			building.RepresentativePoint,
			building.Notes,
			LifecycleStatus(building.Status),
			building.CreatedAt,
			building.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building get failed",
			)
		}

		return &GetBuildingOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-buildings",
		Method:      http.MethodGet,
		Path:        "/api/buildings",
		Summary:     "Returns all buildings",
		Tags:        []string{"buildings"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *ListBuildingsInput,
	) (*ListBuildingsOutput, error) {
		statuses := in.Status
		if len(statuses) == 0 {
			statuses = ActiveLifecycleStatuses
		}

		buildings, err := q.ListBuildings(ctx, lifecycleStatusStrings(statuses))
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building list failed",
			)
		}

		result := make([]BuildingResponse, 0, len(buildings))

		for _, building := range buildings {
			body, err := buildingResponse(
				building.ID,
				building.Name,
				Address{
					Street:  building.AddressStreet,
					City:    building.AddressCity,
					Zip:     building.AddressZip,
					Country: building.AddressCountry,
				},
				building.Footprint,
				building.RepresentativePoint,
				building.Notes,
				LifecycleStatus(building.Status),
				building.CreatedAt,
				building.UpdatedAt,
			)
			if err != nil {
				return nil, huma.Error500InternalServerError(
					"building list failed",
				)
			}

			result = append(result, body)
		}

		return &ListBuildingsOutput{
			Body: result,
		}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-building",
		Method:        http.MethodPost,
		Path:          "/api/buildings",
		Summary:       "Creates a building",
		Tags:          []string{"buildings"},
		DefaultStatus: http.StatusCreated,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *CreateBuildingInput,
	) (*CreateBuildingOutput, error) {
		footprint, err := json.Marshal(in.Body.Footprint)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building creation failed",
			)
		}

		address := in.Body.Address.Normalized()

		building, err := q.CreateBuilding(
			ctx,
			gen.CreateBuildingParams{
				Name:           in.Body.Name,
				AddressStreet:  address.Street,
				AddressCity:    address.City,
				AddressZip:     address.Zip,
				AddressCountry: address.Country,
				Footprint:      string(footprint),
				Notes:          in.Body.Notes,
				Status:         gen.LifecycleStatus(in.Body.Status),
			},
		)
		if err != nil {
			if invalid := buildingCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"building creation failed",
			)
		}

		body, err := buildingResponse(
			building.ID,
			building.Name,
			Address{
				Street:  building.AddressStreet,
				City:    building.AddressCity,
				Zip:     building.AddressZip,
				Country: building.AddressCountry,
			},
			building.Footprint,
			building.RepresentativePoint,
			building.Notes,
			LifecycleStatus(building.Status),
			building.CreatedAt,
			building.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building creation failed",
			)
		}

		return &CreateBuildingOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-building",
		Method:      http.MethodPut,
		Path:        "/api/buildings/{id}",
		Summary:     "Updates the building with the provided id",
		Tags:        []string{"buildings"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *UpdateBuildingInput,
	) (*UpdateBuildingOutput, error) {
		footprint, err := json.Marshal(in.Body.Footprint)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building update failed",
			)
		}

		address := in.Body.Address.Normalized()

		building, err := q.UpdateBuilding(
			ctx,
			gen.UpdateBuildingParams{
				ID:             in.ID,
				Name:           in.Body.Name,
				AddressStreet:  address.Street,
				AddressCity:    address.City,
				AddressZip:     address.Zip,
				AddressCountry: address.Country,
				Footprint:      string(footprint),
				Notes:          in.Body.Notes,
			},
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("building not found")
			}

			if invalid := buildingCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"building update failed",
			)
		}

		body, err := buildingResponse(
			building.ID,
			building.Name,
			Address{
				Street:  building.AddressStreet,
				City:    building.AddressCity,
				Zip:     building.AddressZip,
				Country: building.AddressCountry,
			},
			building.Footprint,
			building.RepresentativePoint,
			building.Notes,
			LifecycleStatus(building.Status),
			building.CreatedAt,
			building.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building update failed",
			)
		}

		return &UpdateBuildingOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-building-status",
		Method:      http.MethodPatch,
		Path:        "/api/buildings/{id}/status",
		Summary:     "Updates the building status of the building with provided id",
		Tags:        []string{"buildings"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *UpdateBuildingStatusInput,
	) (*UpdateBuildingOutput, error) {
		building, err := q.UpdateBuildingStatus(
			ctx,
			gen.UpdateBuildingStatusParams{
				ID:     in.ID,
				Status: gen.LifecycleStatus(in.Body.Status),
			},
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("building not found")
			}

			return nil, huma.Error500InternalServerError(
				"building status update failed",
			)
		}

		body, err := buildingResponse(
			building.ID,
			building.Name,
			Address{
				Street:  building.AddressStreet,
				City:    building.AddressCity,
				Zip:     building.AddressZip,
				Country: building.AddressCountry,
			},
			building.Footprint,
			building.RepresentativePoint,
			building.Notes,
			LifecycleStatus(building.Status),
			building.CreatedAt,
			building.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building status update failed",
			)
		}

		return &UpdateBuildingOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-building",
		Method:        http.MethodDelete,
		Path:          "/api/buildings/{id}",
		Summary:       "Deletes the building with the provided id",
		Tags:          []string{"buildings"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *DeleteBuildingInput,
	) (*struct{}, error) {
		affected, err := q.DeleteBuilding(ctx, in.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"building deletion failed",
			)
		}

		if affected == 0 {
			return nil, huma.Error404NotFound("building not found")
		}

		return nil, nil
	})
}

// buildingCheckError turns a violated CHECK constraint on `buildings` into a
// readable 422, and returns nil for anything else. They all report SQLSTATE
// 23514, so the constraint name is the only thing that tells them apart,
// reporting every one of them as a bad footprint would be a lie as soon as the
// address is what the caller got wrong.
func buildingCheckError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23514" {
		return nil
	}

	switch pgErr.ConstraintName {
	case "building_country_code":
		return huma.Error422UnprocessableEntity(
			"address country must be a two-letter ISO 3166-1 code",
		)
	default:
		return huma.Error422UnprocessableEntity(
			"footprint is not a valid multipolygon",
		)
	}
}

func buildingResponse(
	id uuid.UUID,
	name string,
	address Address,
	footprint string,
	representativePoint string,
	notes *string,
	status LifecycleStatus,
	createdAt time.Time,
	updatedAt time.Time,
) (BuildingResponse, error) {
	var fp MultiPolygon
	if err := json.Unmarshal([]byte(footprint), &fp); err != nil {
		return BuildingResponse{}, err
	}

	var rp Point
	if err := json.Unmarshal([]byte(representativePoint), &rp); err != nil {
		return BuildingResponse{}, err
	}

	return BuildingResponse{
		ID:                  id,
		Name:                name,
		Address:             address.orNil(),
		Footprint:           fp,
		RepresentativePoint: rp,
		Notes:               notes,
		Status:              status,
		CreatedAt:           createdAt,
		UpdatedAt:           updatedAt,
	}, nil
}
