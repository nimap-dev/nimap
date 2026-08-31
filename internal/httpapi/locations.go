package httpapi

import (
	"context"
	"encoding/json"
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
)

type CreateLocationRequest struct {
	ParentID            *uuid.UUID      `json:"parentId,omitempty" doc:"The location this one sits inside; omit for a location that stands on its own"`
	Name                string          `json:"name" minLength:"1"`
	Address             *Address        `json:"address,omitempty"`
	Area                *MultiPolygon   `json:"area,omitempty" doc:"The boundary of the location; omit for one whose extent nobody has established yet"`
	RepresentativePoint *Point          `json:"representativePoint,omitempty"`
	Notes               *string         `json:"notes,omitempty"`
	Status              LifecycleStatus `json:"status"`
}

type CreateLocationInput struct {
	Body CreateLocationRequest
}

type UpdateLocationRequest struct {
	ParentID            *uuid.UUID    `json:"parentId,omitempty" doc:"The location this one sits inside; omit to move it to the top level"`
	Name                string        `json:"name" minLength:"1"`
	Address             *Address      `json:"address,omitempty"`
	Area                *MultiPolygon `json:"area,omitempty" doc:"The boundary of the location; omit for one whose extent nobody has established yet"`
	RepresentativePoint *Point        `json:"representativePoint,omitempty"`
	Notes               *string       `json:"notes,omitempty"`
}

type UpdateLocationStatusRequest struct {
	Status LifecycleStatus `json:"status"`
}

type SuggestLocationRequest struct {
	Area MultiPolygon `json:"area" doc:"The boundary of the place you want to find the best location for"`
}

type UpdateLocationInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateLocationRequest
}

type UpdateLocationStatusInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateLocationStatusRequest
}

type GetLocationInput struct {
	ID uuid.UUID `path:"id"`
}

type ListLocationsInput struct {
	Status []LifecycleStatus `query:"status" doc:"Lifecycle statuses to include. Defaults to planned and active, which keeps decommissioned and archived locations off the map and out of the default lists without hiding them from a direct lookup."`
}

type DeleteLocationInput struct {
	ID uuid.UUID `path:"id"`
}

type SuggestLocationInput struct {
	Body SuggestLocationRequest
}

type LocationResponse struct {
	ID                  uuid.UUID     `json:"id"`
	ParentID            *uuid.UUID    `json:"parentId,omitempty"`
	Name                string        `json:"name"`
	Address             *Address      `json:"address,omitempty"`
	Area                *MultiPolygon `json:"area,omitempty"`
	RepresentativePoint *Point        `json:"representativePoint,omitempty"`
	// RepresentativePointManual says whether the point was placed by hand or
	// derived from the area. Without it a client editing a location cannot tell
	// the two apart, and saving the form would quietly turn a derived point into
	// a stored one that no longer follows the boundary.
	RepresentativePointManual bool            `json:"representativePointManual"`
	Notes                     *string         `json:"notes,omitempty"`
	Status                    LifecycleStatus `json:"status"`
	CreatedAt                 time.Time       `json:"createdAt"`
	UpdatedAt                 time.Time       `json:"updatedAt"`
}

type SuggestLocationResponse struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type GetLocationOutput struct {
	Body LocationResponse
}

type ListLocationsOutput struct {
	Body []LocationResponse
}

type CreateLocationOutput struct {
	Body LocationResponse
}

type UpdateLocationOutput struct {
	Body LocationResponse
}

type SuggestLocationOutput struct {
	Body SuggestLocationResponse
}

func RegisterLocations(api huma.API, q *gen.Queries) {
	huma.Register(api, huma.Operation{
		OperationID: "get-location",
		Method:      http.MethodGet,
		Path:        "/api/locations/{id}",
		Summary:     "Returns location with the provided id",
		Tags:        []string{"locations"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *GetLocationInput,
	) (*GetLocationOutput, error) {
		location, err := q.GetLocation(ctx, in.ID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("location not found")
			}

			return nil, huma.Error500InternalServerError(
				"location get failed",
			)
		}

		body, err := locationResponse(
			location.ID,
			location.ParentID,
			location.Name,
			Address{
				Street:  location.AddressStreet,
				City:    location.AddressCity,
				Zip:     location.AddressZip,
				Country: location.AddressCountry,
			},
			location.Area,
			location.RepresentativePoint,
			location.RepresentativePointManual,
			location.Notes,
			LifecycleStatus(location.Status),
			location.CreatedAt,
			location.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location get failed",
			)
		}

		return &GetLocationOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-locations",
		Method:      http.MethodGet,
		Path:        "/api/locations",
		Summary:     "Returns all locations",
		Tags:        []string{"locations"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *ListLocationsInput,
	) (*ListLocationsOutput, error) {
		statuses := in.Status
		if len(statuses) == 0 {
			statuses = ActiveLifecycleStatuses
		}

		locations, err := q.ListLocations(ctx, lifecycleStatusStrings(statuses))
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location list failed",
			)
		}

		result := make([]LocationResponse, 0, len(locations))

		for _, location := range locations {
			body, err := locationResponse(
				location.ID,
				location.ParentID,
				location.Name,
				Address{
					Street:  location.AddressStreet,
					City:    location.AddressCity,
					Zip:     location.AddressZip,
					Country: location.AddressCountry,
				},
				location.Area,
				location.RepresentativePoint,
				location.RepresentativePointManual,
				location.Notes,
				LifecycleStatus(location.Status),
				location.CreatedAt,
				location.UpdatedAt,
			)
			if err != nil {
				return nil, huma.Error500InternalServerError(
					"location list failed",
				)
			}

			result = append(result, body)
		}

		return &ListLocationsOutput{
			Body: result,
		}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-location",
		Method:        http.MethodPost,
		Path:          "/api/locations",
		Summary:       "Creates a location",
		Tags:          []string{"locations"},
		DefaultStatus: http.StatusCreated,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *CreateLocationInput,
	) (*CreateLocationOutput, error) {
		area, err := multiPolygonGeoJSON(in.Body.Area)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location creation failed",
			)
		}

		address := in.Body.Address.Normalized()

		representativePoint, err := pointGeoJSON(in.Body.RepresentativePoint)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location creation failed",
			)
		}

		location, err := q.CreateLocation(
			ctx,
			gen.CreateLocationParams{
				ParentID:            in.Body.ParentID,
				Name:                in.Body.Name,
				AddressStreet:       address.Street,
				AddressCity:         address.City,
				AddressZip:          address.Zip,
				AddressCountry:      address.Country,
				Area:                area,
				RepresentativePoint: representativePoint,
				Notes:               in.Body.Notes,
				Status:              gen.LifecycleStatus(in.Body.Status),
			},
		)
		if err != nil {
			if invalid := locationCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"location creation failed",
			)
		}

		body, err := locationResponse(
			location.ID,
			location.ParentID,
			location.Name,
			Address{
				Street:  location.AddressStreet,
				City:    location.AddressCity,
				Zip:     location.AddressZip,
				Country: location.AddressCountry,
			},
			location.Area,
			location.RepresentativePoint,
			location.RepresentativePointManual,
			location.Notes,
			LifecycleStatus(location.Status),
			location.CreatedAt,
			location.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location creation failed",
			)
		}

		return &CreateLocationOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-location",
		Method:      http.MethodPut,
		Path:        "/api/locations/{id}",
		Summary:     "Updates the location with the provided id",
		Tags:        []string{"locations"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *UpdateLocationInput,
	) (*UpdateLocationOutput, error) {
		area, err := multiPolygonGeoJSON(in.Body.Area)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location update failed",
			)
		}

		address := in.Body.Address.Normalized()

		representativePoint, err := pointGeoJSON(in.Body.RepresentativePoint)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location update failed",
			)
		}

		location, err := q.UpdateLocation(
			ctx,
			gen.UpdateLocationParams{
				ID:                  in.ID,
				ParentID:            in.Body.ParentID,
				Name:                in.Body.Name,
				AddressStreet:       address.Street,
				AddressCity:         address.City,
				AddressZip:          address.Zip,
				AddressCountry:      address.Country,
				Area:                area,
				RepresentativePoint: representativePoint,
				Notes:               in.Body.Notes,
			},
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("location not found")
			}

			if invalid := locationCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"location update failed",
			)
		}

		body, err := locationResponse(
			location.ID,
			location.ParentID,
			location.Name,
			Address{
				Street:  location.AddressStreet,
				City:    location.AddressCity,
				Zip:     location.AddressZip,
				Country: location.AddressCountry,
			},
			location.Area,
			location.RepresentativePoint,
			location.RepresentativePointManual,
			location.Notes,
			LifecycleStatus(location.Status),
			location.CreatedAt,
			location.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location update failed",
			)
		}

		return &UpdateLocationOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-location-status",
		Method:      http.MethodPatch,
		Path:        "/api/locations/{id}/status",
		Summary:     "Updates the location status of the location with provided id",
		Tags:        []string{"locations"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *UpdateLocationStatusInput,
	) (*UpdateLocationOutput, error) {
		location, err := q.UpdateLocationStatus(
			ctx,
			gen.UpdateLocationStatusParams{
				ID:     in.ID,
				Status: gen.LifecycleStatus(in.Body.Status),
			},
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("location not found")
			}

			return nil, huma.Error500InternalServerError(
				"location status update failed",
			)
		}

		body, err := locationResponse(
			location.ID,
			location.ParentID,
			location.Name,
			Address{
				Street:  location.AddressStreet,
				City:    location.AddressCity,
				Zip:     location.AddressZip,
				Country: location.AddressCountry,
			},
			location.Area,
			location.RepresentativePoint,
			location.RepresentativePointManual,
			location.Notes,
			LifecycleStatus(location.Status),
			location.CreatedAt,
			location.UpdatedAt,
		)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location status update failed",
			)
		}

		return &UpdateLocationOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-location",
		Method:        http.MethodDelete,
		Path:          "/api/locations/{id}",
		Summary:       "Deletes the location with the provided id",
		Tags:          []string{"locations"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *DeleteLocationInput,
	) (*struct{}, error) {
		affected, err := q.DeleteLocation(ctx, in.ID)
		if err != nil {
			var pgErr *pgconn.PgError
			if !errors.As(err, &pgErr) ||
				(pgErr.Code != "23001" && pgErr.Code != "23503") {
				return nil, huma.Error500InternalServerError(
					"location deletion failed",
				)
			}

			children, err := q.CountLocationChildren(ctx, in.ID)
			if err != nil {
				return nil, huma.Error500InternalServerError(
					"location deletion failed",
				)
			}

			buildings, err := q.CountBuildingsInLocation(ctx, in.ID)
			if err != nil {
				return nil, huma.Error500InternalServerError(
					"location deletion failed",
				)
			}

			held := fmt.Sprintf(
				"%d %s", children, plural(children, "location", "locations"),
			)
			switch {
			case children > 0 && buildings > 0:
				held += fmt.Sprintf(
					" and %d %s",
					buildings, plural(buildings, "building", "buildings"),
				)
			case buildings > 0:
				held = fmt.Sprintf(
					"%d %s", buildings, plural(buildings, "building", "buildings"),
				)
			}

			return nil, huma.Error409Conflict(fmt.Sprintf(
				"location still holds %s; decommission it instead of deleting it",
				held,
			))
		}

		if affected == 0 {
			return nil, huma.Error404NotFound("location not found")
		}

		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "suggest-location",
		Method:      http.MethodPost,
		Path:        "/api/locations/suggest",
		Summary:     "Suggests a location fitting provided area the best.",
		Tags:        []string{"locations"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *SuggestLocationInput,
	) (*SuggestLocationOutput, error) {
		area, err := multiPolygonGeoJSON(&in.Body.Area)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"location suggestion failed",
			)
		}

		location, err := q.SuggestLocationForFootprint(ctx, *area)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound(
					"no location covers the provided area",
				)
			}

			if invalid := geometryError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"location suggestion failed",
			)
		}

		resp := SuggestLocationOutput{
			Body: SuggestLocationResponse{
				ID:   location.ID,
				Name: location.Name,
			},
		}

		return &resp, nil
	})
}

// locationCheckError turns a violated CHECK constraint on `locations` into a
// readable 422, and returns nil for anything else. They all report SQLSTATE
// 23514, so the constraint name is the only thing that tells them apart,
// reporting every one of them as a bad footprint would be a lie as soon as the
// address is what the caller got wrong.
func locationCheckError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23514" {
		return nil
	}

	switch pgErr.ConstraintName {
	case "location_country_code":
		return huma.Error422UnprocessableEntity(
			"address country must be a two-letter ISO 3166-1 code",
		)
	case "location_no_parent_cycle", "location_parent_not_self":
		return huma.Error422UnprocessableEntity(
			"a location cannot be placed inside itself or inside one of its own descendants",
		)
	default:
		return huma.Error422UnprocessableEntity(
			"footprint is not a valid multipolygon",
		)
	}
}

func locationResponse(
	id uuid.UUID,
	parentID *uuid.UUID,
	name string,
	address Address,
	areaGeoJSON string,
	representativePoint string,
	representativePointManual bool,
	notes *string,
	status LifecycleStatus,
	createdAt time.Time,
	updatedAt time.Time,
) (LocationResponse, error) {
	// The queries hand back an empty string for a location with no area, and
	// with no area there is no point to derive from it either.
	var area *MultiPolygon
	if areaGeoJSON != "" {
		area = &MultiPolygon{}
		if err := json.Unmarshal([]byte(areaGeoJSON), area); err != nil {
			return LocationResponse{}, err
		}
	}

	var rp *Point
	if representativePoint != "" {
		rp = &Point{}
		if err := json.Unmarshal([]byte(representativePoint), rp); err != nil {
			return LocationResponse{}, err
		}
	}

	return LocationResponse{
		ID:                        id,
		ParentID:                  parentID,
		Name:                      name,
		Address:                   address.orNil(),
		Area:                      area,
		RepresentativePoint:       rp,
		RepresentativePointManual: representativePointManual,
		Notes:                     notes,
		Status:                    status,
		CreatedAt:                 createdAt,
		UpdatedAt:                 updatedAt,
	}, nil
}
