-- name: GetDeviceModel :one
SELECT
  sqlc.embed(dm),
  sqlc.embed(dt),
  sqlc.embed(m)
FROM device_models dm
JOIN device_types dt ON dt.id = dm.device_type_id
JOIN manufacturers m ON m.id = dm.manufacturer_id
WHERE dm.id = sqlc.arg(id);

-- name: ListDeviceModels :many
SELECT
  sqlc.embed(dm),
  sqlc.embed(dt),
  sqlc.embed(m)
FROM device_models dm
JOIN device_types dt ON dt.id = dm.device_type_id
JOIN manufacturers m ON m.id = dm.manufacturer_id
WHERE dm.status::text = ANY(sqlc.arg(statuses)::text[])
  AND (
    sqlc.narg(device_type_id)::uuid IS NULL
    OR dm.device_type_id = sqlc.narg(device_type_id)::uuid
  )
  AND (
    sqlc.narg(manufacturer_id)::uuid IS NULL
    OR dm.manufacturer_id = sqlc.narg(manufacturer_id)::uuid
  )
ORDER BY lower(m.name), lower(dm.name);

-- name: CreateDeviceModel :one
INSERT INTO device_models (
  device_type_id,
  manufacturer_id,
  name,
  part_number,
  width_mm,
  height_mm,
  depth_mm,
  rack_units,
  mounting,
  power_watts_max,
  poe_in,
  poe_out,
  notes,
  status
)
VALUES (
  sqlc.arg(device_type_id),
  sqlc.arg(manufacturer_id),
  sqlc.arg(name),
  sqlc.narg(part_number),
  sqlc.narg(width_mm),
  sqlc.narg(height_mm),
  sqlc.narg(depth_mm),
  sqlc.narg(rack_units),
  sqlc.narg(mounting),
  sqlc.narg(power_watts_max),
  sqlc.arg(poe_in),
  sqlc.arg(poe_out),
  sqlc.narg(notes),
  sqlc.arg(status)
)
RETURNING id;

-- name: UpdateDeviceModel :one
UPDATE device_models
SET
  device_type_id = sqlc.arg(device_type_id),
  manufacturer_id = sqlc.arg(manufacturer_id),
  name = sqlc.arg(name),
  part_number = sqlc.narg(part_number),
  width_mm = sqlc.narg(width_mm),
  height_mm = sqlc.narg(height_mm),
  depth_mm = sqlc.narg(depth_mm),
  rack_units = sqlc.narg(rack_units),
  mounting = sqlc.narg(mounting),
  power_watts_max = sqlc.narg(power_watts_max),
  poe_in = sqlc.arg(poe_in),
  poe_out = sqlc.arg(poe_out),
  notes = sqlc.narg(notes),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id;

-- name: UpdateDeviceModelStatus :one
UPDATE device_models
SET
  status = sqlc.arg(status),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id;

-- name: DeleteDeviceModel :execrows
DELETE FROM device_models
WHERE id = sqlc.arg(id);
