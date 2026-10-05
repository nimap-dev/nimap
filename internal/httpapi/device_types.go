package httpapi

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
)

type DeviceTypeResponse struct {
	ID        uuid.UUID `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon" doc:"A lucide icon name"`
	Color     string    `json:"color"`
	SortOrder int16     `json:"sortOrder"`
}

type ListDeviceTypesOutput struct {
	Body []DeviceTypeResponse
}

func RegisterDeviceTypes(api huma.API, q *gen.Queries) {
	huma.Register(api, huma.Operation{
		OperationID: "list-device-types",
		Method:      http.MethodGet,
		Path:        "/api/device-types",
		Summary:     "Returns all device types.",
		Tags:        []string{"device-types"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(
		ctx context.Context,
		_ *struct{},
	) (*ListDeviceTypesOutput, error) {
		device_types, err := q.ListDeviceTypes(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError(
				"device type list failed",
			)
		}

		out := make([]DeviceTypeResponse, 0, len(device_types))

		for _, dt := range device_types {
			out = append(out, deviceTypeResponse(dt))
		}
		return &ListDeviceTypesOutput{
			Body: out,
		}, nil
	})
}

// deviceTypeResponse is shared with the device models, which nest their type.
func deviceTypeResponse(deviceType gen.DeviceType) DeviceTypeResponse {
	return DeviceTypeResponse{
		ID:        deviceType.ID,
		Code:      deviceType.Code,
		Name:      deviceType.Name,
		Icon:      deviceType.Icon,
		Color:     deviceType.Color,
		SortOrder: deviceType.SortOrder,
	}
}
