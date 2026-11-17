package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/netip"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/httpapi/apitypes"
)

const codeAllocationAttempts = 5

type DeviceModelRef struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	Variant    *string   `json:"variant,omitempty"`
	PartNumber *string   `json:"partNumber,omitempty"`
}

type ManufacturerRef struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type DeviceResponse struct {
	ID              uuid.UUID                `json:"id"`
	Code            string                   `json:"code" doc:"Short code such as SW-001, unique regardless of case"`
	Name            string                   `json:"name"`
	PhysicalLabel   *string                  `json:"physicalLabel,omitempty" doc:"What is actually written on the device"`
	DeviceType      DeviceTypeResponse       `json:"deviceType" doc:"The model's type for a device with a model, the device's own otherwise"`
	Model           *DeviceModelRef          `json:"model,omitempty"`
	Manufacturer    *ManufacturerRef         `json:"manufacturer,omitempty" doc:"The model's manufacturer; a device without a model has none"`
	SerialNumber    *string                  `json:"serialNumber,omitempty"`
	InventoryNumber *string                  `json:"inventoryNumber,omitempty"`
	ManagementIP    *string                  `json:"managementIp,omitempty" doc:"The address the device is managed on, IPv4 or IPv6"`
	Hostname        *string                  `json:"hostname,omitempty"`
	Notes           *string                  `json:"notes,omitempty"`
	Status          apitypes.LifecycleStatus `json:"status"`
	CreatedAt       time.Time                `json:"createdAt"`
	UpdatedAt       time.Time                `json:"updatedAt"`
}

type GetDeviceInput struct {
	ID uuid.UUID `path:"id"`
}

type ListDevicesInput struct {
	Status         []apitypes.LifecycleStatus `query:"status" doc:"Lifecycle statuses to include. Defaults to planned and active."`
	DeviceTypeID   uuid.UUID                  `query:"deviceTypeId" doc:"Only return devices of this type, whether it comes from their model or not."`
	DeviceModelID  uuid.UUID                  `query:"deviceModelId" doc:"Only return devices of this model."`
	ManufacturerID uuid.UUID                  `query:"manufacturerId" doc:"Only return devices whose model this manufacturer makes."`
}

type CreateDeviceRequest struct {
	Code            *string                  `json:"code,omitempty" doc:"Leave it out or empty to get the next code of the device's type, such as SW-004. A code given here is used as is and does not move the type's counter."`
	Name            string                   `json:"name" minLength:"1"`
	PhysicalLabel   *string                  `json:"physicalLabel,omitempty" doc:"What is actually written on the device"`
	DeviceModelID   *uuid.UUID               `json:"deviceModelId,omitempty" doc:"Exactly one of deviceModelId and deviceTypeId; the type then comes from the model"`
	DeviceTypeID    *uuid.UUID               `json:"deviceTypeId,omitempty" doc:"Exactly one of deviceModelId and deviceTypeId; for a device without a model"`
	SerialNumber    *string                  `json:"serialNumber,omitempty"`
	InventoryNumber *string                  `json:"inventoryNumber,omitempty"`
	ManagementIP    *string                  `json:"managementIp,omitempty" doc:"One IPv4 or IPv6 address, not a network"`
	Hostname        *string                  `json:"hostname,omitempty" doc:"DNS name; stored in lowercase"`
	Notes           *string                  `json:"notes,omitempty"`
	Status          apitypes.LifecycleStatus `json:"status"`
}

type CreateDeviceInput struct {
	Body CreateDeviceRequest
}

type UpdateDeviceRequest struct {
	Code            string     `json:"code" minLength:"1" doc:"Changing the model or type never changes the code; only this field does"`
	Name            string     `json:"name" minLength:"1"`
	PhysicalLabel   *string    `json:"physicalLabel,omitempty" doc:"What is actually written on the device"`
	DeviceModelID   *uuid.UUID `json:"deviceModelId,omitempty" doc:"Exactly one of deviceModelId and deviceTypeId; the type then comes from the model"`
	DeviceTypeID    *uuid.UUID `json:"deviceTypeId,omitempty" doc:"Exactly one of deviceModelId and deviceTypeId; for a device without a model"`
	SerialNumber    *string    `json:"serialNumber,omitempty"`
	InventoryNumber *string    `json:"inventoryNumber,omitempty"`
	ManagementIP    *string    `json:"managementIp,omitempty" doc:"One IPv4 or IPv6 address, not a network"`
	Hostname        *string    `json:"hostname,omitempty" doc:"DNS name; stored in lowercase"`
	Notes           *string    `json:"notes,omitempty"`
}

type UpdateDeviceInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateDeviceRequest
}

type UpdateDeviceStatusRequest struct {
	Status apitypes.LifecycleStatus `json:"status"`
}

type UpdateDeviceStatusInput struct {
	ID   uuid.UUID `path:"id"`
	Body UpdateDeviceStatusRequest
}

type DeleteDeviceInput struct {
	ID uuid.UUID `path:"id"`
}

type DeviceOutput struct {
	Body DeviceResponse
}

type ListDevicesOutput struct {
	Body []DeviceResponse
}

func RegisterDevices(api huma.API, q *gen.Queries, pool *pgxpool.Pool) {
	huma.Register(api, huma.Operation{
		OperationID: "get-device",
		Method:      http.MethodGet,
		Path:        "/api/devices/{id}",
		Summary:     "Returns the device with the provided id",
		Tags:        []string{"devices"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(ctx context.Context, in *GetDeviceInput) (*DeviceOutput, error) {
		body, err := getDeviceResponse(ctx, q, in.ID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("device not found")
			}

			return nil, huma.Error500InternalServerError("device get failed")
		}

		return &DeviceOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-devices",
		Method:      http.MethodGet,
		Path:        "/api/devices",
		Summary:     "Returns all devices, optionally narrowed to a type, model or manufacturer",
		Tags:        []string{"devices"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.ReadRecords},
	}, func(ctx context.Context, in *ListDevicesInput) (*ListDevicesOutput, error) {
		statuses := in.Status
		if len(statuses) == 0 {
			statuses = apitypes.ActiveLifecycleStatuses
		}

		rows, err := q.ListDevices(ctx, gen.ListDevicesParams{
			Statuses:       apitypes.LifecycleStatusStrings(statuses),
			DeviceTypeID:   uuidFilter(in.DeviceTypeID),
			DeviceModelID:  uuidFilter(in.DeviceModelID),
			ManufacturerID: uuidFilter(in.ManufacturerID),
		})
		if err != nil {
			return nil, huma.Error500InternalServerError("device list failed")
		}

		result := make([]DeviceResponse, 0, len(rows))
		for _, row := range rows {
			result = append(result, deviceResponse(gen.GetDeviceRow(row)))
		}

		return &ListDevicesOutput{Body: result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-device",
		Method:        http.MethodPost,
		Path:          "/api/devices",
		Summary:       "Creates a device",
		Description:   "Without a code, the device gets the next free code of its type.",
		Tags:          []string{"devices"},
		DefaultStatus: http.StatusCreated,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(ctx context.Context, in *CreateDeviceInput) (*DeviceOutput, error) {
		fields, err := normalizeDeviceFields(deviceFields{
			Name:            in.Body.Name,
			PhysicalLabel:   in.Body.PhysicalLabel,
			DeviceModelID:   in.Body.DeviceModelID,
			DeviceTypeID:    in.Body.DeviceTypeID,
			SerialNumber:    in.Body.SerialNumber,
			InventoryNumber: in.Body.InventoryNumber,
			ManagementIP:    in.Body.ManagementIP,
			Hostname:        in.Body.Hostname,
			Notes:           in.Body.Notes,
		})
		if err != nil {
			return nil, err
		}

		params := gen.CreateDeviceParams{
			Name:            fields.Name,
			PhysicalLabel:   fields.PhysicalLabel,
			DeviceModelID:   fields.DeviceModelID,
			DeviceTypeID:    fields.DeviceTypeID,
			SerialNumber:    fields.SerialNumber,
			InventoryNumber: fields.InventoryNumber,
			ManagementIp:    fields.managementIP,
			Hostname:        fields.Hostname,
			Notes:           fields.Notes,
			Status:          gen.LifecycleStatus(in.Body.Status),
		}
		if in.Body.Code != nil {
			params.Code = strings.TrimSpace(*in.Body.Code)
		}

		var id uuid.UUID
		if params.Code != "" {
			id, err = q.CreateDevice(ctx, params)
		} else {
			for range codeAllocationAttempts {
				id, err = createDeviceWithGeneratedCode(ctx, q, pool, params)

				var pgErr *pgconn.PgError
				if err == nil || !errors.As(err, &pgErr) ||
					pgErr.Code != "23505" || pgErr.ConstraintName != "device_code_unique" {
					break
				}
			}
		}
		if err != nil {
			if invalid := deviceCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError("device creation failed")
		}

		body, err := getDeviceResponse(ctx, q, id)
		if err != nil {
			return nil, huma.Error500InternalServerError("device creation failed")
		}

		return &DeviceOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-device",
		Method:      http.MethodPut,
		Path:        "/api/devices/{id}",
		Summary:     "Updates the device with the provided id",
		Tags:        []string{"devices"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(ctx context.Context, in *UpdateDeviceInput) (*DeviceOutput, error) {
		fields, err := normalizeDeviceFields(deviceFields{
			Name:            in.Body.Name,
			PhysicalLabel:   in.Body.PhysicalLabel,
			DeviceModelID:   in.Body.DeviceModelID,
			DeviceTypeID:    in.Body.DeviceTypeID,
			SerialNumber:    in.Body.SerialNumber,
			InventoryNumber: in.Body.InventoryNumber,
			ManagementIP:    in.Body.ManagementIP,
			Hostname:        in.Body.Hostname,
			Notes:           in.Body.Notes,
		})
		if err != nil {
			return nil, err
		}

		id, err := q.UpdateDevice(ctx, gen.UpdateDeviceParams{
			ID:              in.ID,
			Code:            strings.TrimSpace(in.Body.Code),
			Name:            fields.Name,
			PhysicalLabel:   fields.PhysicalLabel,
			DeviceModelID:   fields.DeviceModelID,
			DeviceTypeID:    fields.DeviceTypeID,
			SerialNumber:    fields.SerialNumber,
			InventoryNumber: fields.InventoryNumber,
			ManagementIp:    fields.managementIP,
			Hostname:        fields.Hostname,
			Notes:           fields.Notes,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("device not found")
			}

			if invalid := deviceCheckError(err); invalid != nil {
				return nil, invalid
			}

			return nil, huma.Error500InternalServerError("device update failed")
		}

		body, err := getDeviceResponse(ctx, q, id)
		if err != nil {
			return nil, huma.Error500InternalServerError("device update failed")
		}

		return &DeviceOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-device-status",
		Method:      http.MethodPatch,
		Path:        "/api/devices/{id}/status",
		Summary:     "Updates the status of the device with the provided id",
		Tags:        []string{"devices"},
		Metadata:    map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(ctx context.Context, in *UpdateDeviceStatusInput) (*DeviceOutput, error) {
		id, err := q.UpdateDeviceStatus(ctx, gen.UpdateDeviceStatusParams{
			ID:     in.ID,
			Status: gen.LifecycleStatus(in.Body.Status),
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, huma.Error404NotFound("device not found")
			}

			return nil, huma.Error500InternalServerError("device status update failed")
		}

		body, err := getDeviceResponse(ctx, q, id)
		if err != nil {
			return nil, huma.Error500InternalServerError("device status update failed")
		}

		return &DeviceOutput{Body: body}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-device",
		Method:        http.MethodDelete,
		Path:          "/api/devices/{id}",
		Summary:       "Deletes the device with the provided id",
		Description:   "Its code is not handed out again.",
		Tags:          []string{"devices"},
		DefaultStatus: http.StatusNoContent,
		Metadata:      map[string]any{requirePermissionMetaKey: auth.WriteRecords},
	}, func(ctx context.Context, in *DeleteDeviceInput) (*struct{}, error) {
		affected, err := q.DeleteDevice(ctx, in.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("device deletion failed")
		}

		if affected == 0 {
			return nil, huma.Error404NotFound("device not found")
		}

		return nil, nil
	})
}

// deviceFields are the fields create and update share, after normalizing.
type deviceFields struct {
	Name            string
	PhysicalLabel   *string
	DeviceModelID   *uuid.UUID
	DeviceTypeID    *uuid.UUID
	SerialNumber    *string
	InventoryNumber *string
	ManagementIP    *string
	Hostname        *string
	Notes           *string

	managementIP *netip.Addr
}

// normalizeDeviceFields checks what the database cannot word well and puts the
// rest into the shape it stores: one of model and type, a parsed host address
// and a lowercase hostname without the root dot.
func normalizeDeviceFields(f deviceFields) (deviceFields, error) {
	if (f.DeviceModelID == nil) == (f.DeviceTypeID == nil) {
		return f, huma.Error422UnprocessableEntity(
			"give exactly one of deviceModelId and deviceTypeId",
			&huma.ErrorDetail{Location: "body.deviceModelId", Message: "give a model, or a type for a device without one"},
		)
	}

	if f.ManagementIP != nil {
		addr, err := netip.ParseAddr(strings.TrimSpace(*f.ManagementIP))
		if err != nil || addr.Zone() != "" {
			return f, huma.Error422UnprocessableEntity(
				"management IP is not a valid IPv4 or IPv6 address",
				&huma.ErrorDetail{Location: "body.managementIp", Message: "not a single IPv4 or IPv6 address", Value: *f.ManagementIP},
			)
		}

		addr = addr.Unmap()
		f.managementIP = &addr
	}

	if f.Hostname != nil {
		hostname := strings.TrimSuffix(strings.ToLower(strings.TrimSpace(*f.Hostname)), ".")
		f.Hostname = &hostname
	}

	return f, nil
}

// createDeviceWithGeneratedCode takes the next free code of the device's type
// in the same transaction as the insert, so a failed insert does not use up a
// number.
func createDeviceWithGeneratedCode(
	ctx context.Context,
	q *gen.Queries,
	pool *pgxpool.Pool,
	params gen.CreateDeviceParams,
) (uuid.UUID, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	qtx := q.WithTx(tx)

	params.Code, err = qtx.AllocateDeviceCode(ctx, gen.AllocateDeviceCodeParams{
		DeviceTypeID:  params.DeviceTypeID,
		DeviceModelID: params.DeviceModelID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, errDeviceTypeUnknown
		}

		return uuid.Nil, err
	}

	id, err := qtx.CreateDevice(ctx, params)
	if err != nil {
		return uuid.Nil, err
	}

	return id, tx.Commit(ctx)
}

// errDeviceTypeUnknown is returned when code allocation finds neither the
// given type nor the given model.
var errDeviceTypeUnknown = errors.New("device type or model not found")

// deviceCheckError turns a constraint on `devices` that the caller violated
// into a readable 4xx, and returns nil for anything else.
func deviceCheckError(err error) error {
	if errors.Is(err, errDeviceTypeUnknown) {
		return huma.Error422UnprocessableEntity("device model or type not found")
	}

	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return nil
	}

	switch pgErr.Code {
	case "23503":
		switch pgErr.ConstraintName {
		case "device_device_model_fk":
			return huma.Error422UnprocessableEntity("device model not found")
		default:
			return huma.Error422UnprocessableEntity("device type not found")
		}
	case "23505":
		return huma.Error409Conflict(
			"another device already has this code",
			&huma.ErrorDetail{Location: "body.code", Message: "code is taken"},
		)
	case "23514":
		switch pgErr.ConstraintName {
		case "device_code_not_blank":
			return huma.Error422UnprocessableEntity("code cannot be blank")
		case "device_name_not_blank":
			return huma.Error422UnprocessableEntity("name cannot be blank")
		case "device_physical_label_not_blank":
			return huma.Error422UnprocessableEntity("physical label cannot be blank")
		case "device_serial_number_not_blank":
			return huma.Error422UnprocessableEntity("serial number cannot be blank")
		case "device_inventory_number_not_blank":
			return huma.Error422UnprocessableEntity("inventory number cannot be blank")
		case "device_model_xor_type":
			return huma.Error422UnprocessableEntity(
				"give exactly one of deviceModelId and deviceTypeId",
			)
		case "device_management_ip_host":
			return huma.Error422UnprocessableEntity("management IP must be a single address")
		case "device_hostname_format":
			return huma.Error422UnprocessableEntity(
				"hostname is not a valid DNS name",
				&huma.ErrorDetail{Location: "body.hostname", Message: "not a valid DNS name"},
			)
		default:
			return huma.Error422UnprocessableEntity("device is not valid")
		}
	default:
		return nil
	}
}

// uuidFilter turns an optional uuid query parameter, the nil uuid when it was
// left out, into the nullable argument the list queries take.
func uuidFilter(id uuid.UUID) *uuid.UUID {
	if id == uuid.Nil {
		return nil
	}

	return &id
}

// getDeviceResponse reads a device together with its type, model and
// manufacturer. The writes only return the id, so they come through here too
// and answer in the same shape.
func getDeviceResponse(ctx context.Context, q *gen.Queries, id uuid.UUID) (DeviceResponse, error) {
	row, err := q.GetDevice(ctx, id)
	if err != nil {
		return DeviceResponse{}, err
	}

	return deviceResponse(row), nil
}

func deviceResponse(row gen.GetDeviceRow) DeviceResponse {
	d := row.Device

	var model *DeviceModelRef
	if d.DeviceModelID != nil && row.ModelName != nil {
		model = &DeviceModelRef{
			ID:         *d.DeviceModelID,
			Name:       *row.ModelName,
			Variant:    row.ModelVariant,
			PartNumber: row.ModelPartNumber,
		}
	}

	var manufacturer *ManufacturerRef
	if row.ManufacturerID != nil && row.ManufacturerName != nil {
		manufacturer = &ManufacturerRef{
			ID:   *row.ManufacturerID,
			Name: *row.ManufacturerName,
		}
	}

	var managementIP *string
	if d.ManagementIp != nil {
		value := d.ManagementIp.String()
		managementIP = &value
	}

	return DeviceResponse{
		ID:              d.ID,
		Code:            d.Code,
		Name:            d.Name,
		PhysicalLabel:   d.PhysicalLabel,
		DeviceType:      deviceTypeResponse(row.DeviceType),
		Model:           model,
		Manufacturer:    manufacturer,
		SerialNumber:    d.SerialNumber,
		InventoryNumber: d.InventoryNumber,
		ManagementIP:    managementIP,
		Hostname:        d.Hostname,
		Notes:           d.Notes,
		Status:          apitypes.LifecycleStatus(d.Status),
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
	}
}
