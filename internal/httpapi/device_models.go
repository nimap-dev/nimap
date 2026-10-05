package httpapi

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/httpapi/apitypes"
)

type DeviceModelResponse struct {
	ID            uuid.UUID                `json:"id"`
	DeviceType    DeviceTypeResponse       `json:"deviceType"`
	Manufacturer  ManufacturerResponse     `json:"manufacturer"`
	Name          string                   `json:"name"`
	PartNumber    *string                  `json:"partNumber,omitempty"`
	WidthMm       *int32                   `json:"widthMm,omitempty"`
	HeightMm      *int32                   `json:"heightMm,omitempty"`
	DepthMm       *int32                   `json:"depthMm,omitempty"`
	RackUnits     *int16                   `json:"rackUnits,omitempty"`
	Mounting      *apitypes.MountingType   `json:"mounting,omitempty"`
	PowerWattsMax *int32                   `json:"powerWattsMax,omitempty" doc:"Maximum power draw in watts"`
	PoeIn         bool                     `json:"poeIn" doc:"Can be powered over Ethernet"`
	PoeOut        bool                     `json:"poeOut" doc:"Can power other devices over Ethernet"`
	Notes         *string                  `json:"notes,omitempty"`
	Status        apitypes.LifecycleStatus `json:"status"`
	CreatedAt     time.Time                `json:"createdAt"`
	UpdatedAt     time.Time                `json:"updatedAt"`
}

type GetDeviceModelInput struct {
	ID uuid.UUID `path:"id"`
}

type ListDeviceModelsInput struct {
	Status         []apitypes.LifecycleStatus `query:"status" doc:"Lifecycle statuses to include. Defaults to planned and active, which keeps models that are no longer available/used out of the default lists without hiding them from a direct lookup."`
	DeviceTypeID   uuid.UUID                  `query:"deviceTypeId" doc:"Only return models of this device type. Omit it to list models of every type."`
	ManufacturerID uuid.UUID                  `query:"manufacturerId" doc:"Only return models made by this manufacturer. Omit it to list models of every manufacturer."`
}

type CreateDeviceModelRequest struct {
	DeviceTypeID   uuid.UUID                `json:"deviceTypeId"`
	ManufacturerID uuid.UUID                `json:"manufacturerId"`
	Name           string                   `json:"name" minLength:"1"`
	PartNumber     *string                  `json:"partNumber,omitempty"`
	WidthMm        *int32                   `json:"widthMm,omitempty" minimum:"1"`
	HeightMm       *int32                   `json:"heightMm,omitempty" minimum:"1"`
	DepthMm        *int32                   `json:"depthMm,omitempty" minimum:"1"`
	RackUnits      *int16                   `json:"rackUnits,omitempty" minimum:"1"`
	Mounting       *apitypes.MountingType   `json:"mounting,omitempty"`
	PowerWattsMax  *int32                   `json:"powerWattsMax,omitempty" minimum:"1" doc:"Maximum power draw in watts"`
	PoeIn          bool                     `json:"poeIn,omitempty" doc:"Can be powered over Ethernet"`
	PoeOut         bool                     `json:"poeOut,omitempty" doc:"Can power other devices over Ethernet"`
	Notes          *string                  `json:"notes,omitempty"`
	Status         apitypes.LifecycleStatus `json:"status"`
}

type CreateDeviceModelInput struct {
	Body CreateDeviceModelRequest
}

type UpdateDeviceModelRequest struct {
	DeviceTypeID   uuid.UUID              `json:"deviceTypeId"`
	ManufacturerID uuid.UUID              `json:"manufacturerId"`
	Name           string                 `json:"name" minLength:"1"`
	PartNumber     *string                `json:"partNumber,omitempty"`
	WidthMm        *int32                 `json:"widthMm,omitempty" minimum:"1"`
	HeightMm       *int32                 `json:"heightMm,omitempty" minimum:"1"`
	DepthMm        *int32                 `json:"depthMm,omitempty" minimum:"1"`
	RackUnits      *int16                 `json:"rackUnits,omitempty" minimum:"1"`
	Mounting       *apitypes.MountingType `json:"mounting,omitempty"`
	PowerWattsMax  *int32                 `json:"powerWattsMax,omitempty" minimum:"1" doc:"Maximum power draw in watts"`
	PoeIn          bool                   `json:"poeIn,omitempty" doc:"Can be powered over Ethernet"`
	PoeOut         bool                   `json:"poeOut,omitempty" doc:"Can power other devices over Ethernet"`
	Notes          *string                `json:"notes,omitempty"`
}

type UpdateDeviceModelInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateDeviceModelRequest
}

type DeleteDeviceModelInput struct {
	ID uuid.UUID `path:"id"`
}

type UpdateDeviceModelStatusRequest struct {
	Status apitypes.LifecycleStatus `json:"status"`
}

type UpdateDeviceModelStatusInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateDeviceModelStatusRequest
}

type GetDeviceModelOutput struct {
	Body DeviceModelResponse
}

type ListDeviceModelsOutput struct {
	Body []DeviceModelResponse
}

type CreateDeviceModelOutput struct {
	Body DeviceModelResponse
}

type UpdateDeviceModelOutput struct {
	Body DeviceModelResponse
}

func RegisterDeviceModels(api huma.API, q *gen.Queries) {
	huma.Register(api, huma.Operation{
		OperationID: "get-device-model",
		Method:      http.MethodGet,
		Path:        "/api/device-models/{id}",
		Summary:     "Returns the device model with the provided id",
		Tags:        []string{"device-models"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *GetDeviceModelInput,
	) (*GetDeviceModelOutput, error) {
		body, err := getDeviceModelResponse(ctx, q, in.ID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("device model not found")
			}

			return nil, huma.Error500InternalServerError(
				"device model get failed",
			)
		}

		return &GetDeviceModelOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-device-models",
		Method:      http.MethodGet,
		Path:        "/api/device-models",
		Summary:     "Returns all device models, optionally narrowed to a device type or a manufacturer",
		Tags:        []string{"device-models"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		in *ListDeviceModelsInput,
	) (*ListDeviceModelsOutput, error) {
		statuses := in.Status
		if len(statuses) == 0 {
			statuses = apitypes.ActiveLifecycleStatuses
		}

		var deviceTypeID *uuid.UUID
		if in.DeviceTypeID != uuid.Nil {
			deviceTypeID = &in.DeviceTypeID
		}

		var manufacturerID *uuid.UUID
		if in.ManufacturerID != uuid.Nil {
			manufacturerID = &in.ManufacturerID
		}

		rows, err := q.ListDeviceModels(ctx, gen.ListDeviceModelsParams{
			Statuses:       apitypes.LifecycleStatusStrings(statuses),
			DeviceTypeID:   deviceTypeID,
			ManufacturerID: manufacturerID,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"device model list failed",
			)
		}

		result := make([]DeviceModelResponse, 0, len(rows))
		for _, row := range rows {
			result = append(
				result,
				deviceModelResponse(row.DeviceModel, row.DeviceType, row.Manufacturer),
			)
		}

		return &ListDeviceModelsOutput{Body: result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-device-model-status",
		Method:      http.MethodPatch,
		Path:        "/api/device-models/{id}/status",
		Summary:     "Updates the status of the device model with the provided id",
		Tags:        []string{"device-models"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *UpdateDeviceModelStatusInput,
	) (*UpdateDeviceModelOutput, error) {
		id, err := q.UpdateDeviceModelStatus(
			ctx,
			gen.UpdateDeviceModelStatusParams{
				ID:     in.ID,
				Status: gen.LifecycleStatus(in.Body.Status),
			},
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("device model not found")
			}

			return nil, huma.Error500InternalServerError(
				"device model status update failed",
			)
		}

		body, err := getDeviceModelResponse(ctx, q, id)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"device model status update failed",
			)
		}

		return &UpdateDeviceModelOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-device-model",
		Method:        http.MethodPost,
		Path:          "/api/device-models",
		Summary:       "Creates a device model",
		Tags:          []string{"device-models"},
		DefaultStatus: http.StatusCreated,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *CreateDeviceModelInput,
	) (*CreateDeviceModelOutput, error) {
		id, err := q.CreateDeviceModel(ctx, gen.CreateDeviceModelParams{
			DeviceTypeID:   in.Body.DeviceTypeID,
			ManufacturerID: in.Body.ManufacturerID,
			Name:           in.Body.Name,
			PartNumber:     in.Body.PartNumber,
			WidthMm:        in.Body.WidthMm,
			HeightMm:       in.Body.HeightMm,
			DepthMm:        in.Body.DepthMm,
			RackUnits:      in.Body.RackUnits,
			Mounting:       mountingParam(in.Body.Mounting),
			PowerWattsMax:  in.Body.PowerWattsMax,
			PoeIn:          in.Body.PoeIn,
			PoeOut:         in.Body.PoeOut,
			Notes:          in.Body.Notes,
			Status:         gen.LifecycleStatus(in.Body.Status),
		})
		if err != nil {
			if invalid := deviceModelCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"device model creation failed",
			)
		}

		body, err := getDeviceModelResponse(ctx, q, id)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"device model creation failed",
			)
		}

		return &CreateDeviceModelOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-device-model",
		Method:      http.MethodPut,
		Path:        "/api/device-models/{id}",
		Summary:     "Updates the device model with the provided id",
		Tags:        []string{"device-models"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *UpdateDeviceModelInput,
	) (*UpdateDeviceModelOutput, error) {
		id, err := q.UpdateDeviceModel(ctx, gen.UpdateDeviceModelParams{
			ID:             in.ID,
			DeviceTypeID:   in.Body.DeviceTypeID,
			ManufacturerID: in.Body.ManufacturerID,
			Name:           in.Body.Name,
			PartNumber:     in.Body.PartNumber,
			WidthMm:        in.Body.WidthMm,
			HeightMm:       in.Body.HeightMm,
			DepthMm:        in.Body.DepthMm,
			RackUnits:      in.Body.RackUnits,
			Mounting:       mountingParam(in.Body.Mounting),
			PowerWattsMax:  in.Body.PowerWattsMax,
			PoeIn:          in.Body.PoeIn,
			PoeOut:         in.Body.PoeOut,
			Notes:          in.Body.Notes,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("device model not found")
			}

			if invalid := deviceModelCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError(
				"device model update failed",
			)
		}

		body, err := getDeviceModelResponse(ctx, q, id)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"device model update failed",
			)
		}

		return &UpdateDeviceModelOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-device-model",
		Method:        http.MethodDelete,
		Path:          "/api/device-models/{id}",
		Summary:       "Deletes the device model with the provided id",
		Tags:          []string{"device-models"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(
		ctx context.Context,
		in *DeleteDeviceModelInput,
	) (*struct{}, error) {
		affected, err := q.DeleteDeviceModel(ctx, in.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"device model deletion failed",
			)
		}

		if affected == 0 {
			return nil, huma.Error404NotFound("device model not found")
		}

		return nil, nil
	})
}

// deviceModelCheckError turns a constraint on `device_models` that the caller
// violated into a readable 4xx, and returns nil for anything else. The CHECK
// constraints all report 23514, so the constraint name tells them apart.
func deviceModelCheckError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return nil
	}

	switch pgErr.Code {
	case "23503":
		switch pgErr.ConstraintName {
		case "device_model_manufacturer_fk":
			return huma.Error422UnprocessableEntity("manufacturer not found")
		default:
			return huma.Error422UnprocessableEntity("device type not found")
		}
	case "23505":
		return huma.Error409Conflict(
			"this manufacturer already has a model with that name",
		)
	case "23514":
		switch pgErr.ConstraintName {
		case "device_model_name_not_blank":
			return huma.Error422UnprocessableEntity("name cannot be blank")
		case "device_model_part_number_not_blank":
			return huma.Error422UnprocessableEntity("part number cannot be blank")
		case "device_model_dimensions_positive":
			return huma.Error422UnprocessableEntity("dimensions must be positive")
		case "device_model_rack_units_positive":
			return huma.Error422UnprocessableEntity("rack units must be positive")
		case "device_model_power_positive":
			return huma.Error422UnprocessableEntity("maximum power must be positive")
		default:
			return huma.Error422UnprocessableEntity("device model is not valid")
		}
	default:
		return nil
	}
}

// mountingParam turns the optional mounting from a request into the nullable
// enum the generated queries take.
func mountingParam(mounting *apitypes.MountingType) gen.NullMountingType {
	if mounting == nil {
		return gen.NullMountingType{}
	}

	return gen.NullMountingType{
		MountingType: gen.MountingType(*mounting),
		Valid:        true,
	}
}

// getDeviceModelResponse reads a model together with its type and manufacturer.
// The writes only return the id, so they come through here too and answer in
// the same shape.
func getDeviceModelResponse(
	ctx context.Context,
	q *gen.Queries,
	id uuid.UUID,
) (DeviceModelResponse, error) {
	row, err := q.GetDeviceModel(ctx, id)
	if err != nil {
		return DeviceModelResponse{}, err
	}

	return deviceModelResponse(row.DeviceModel, row.DeviceType, row.Manufacturer), nil
}

func deviceModelResponse(
	model gen.DeviceModel,
	deviceType gen.DeviceType,
	manufacturer gen.Manufacturer,
) DeviceModelResponse {
	var mounting *apitypes.MountingType
	if model.Mounting.Valid {
		value := apitypes.MountingType(model.Mounting.MountingType)
		mounting = &value
	}

	return DeviceModelResponse{
		ID:            model.ID,
		DeviceType:    deviceTypeResponse(deviceType),
		Manufacturer:  manufacturerResponse(manufacturer),
		Name:          model.Name,
		PartNumber:    model.PartNumber,
		WidthMm:       model.WidthMm,
		HeightMm:      model.HeightMm,
		DepthMm:       model.DepthMm,
		RackUnits:     model.RackUnits,
		Mounting:      mounting,
		PowerWattsMax: model.PowerWattsMax,
		PoeIn:         model.PoeIn,
		PoeOut:        model.PoeOut,
		Notes:         model.Notes,
		Status:        apitypes.LifecycleStatus(model.Status),
		CreatedAt:     model.CreatedAt,
		UpdatedAt:     model.UpdatedAt,
	}
}
