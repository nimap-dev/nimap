-- name: GetDevice :one
SELECT
  sqlc.embed(d),
  sqlc.embed(dt),
  dm.name AS model_name,
  dm.variant AS model_variant,
  dm.part_number AS model_part_number,
  m.id AS manufacturer_id,
  m.name AS manufacturer_name
FROM devices d
LEFT JOIN device_models dm ON dm.id = d.device_model_id
LEFT JOIN manufacturers m ON m.id = dm.manufacturer_id
JOIN device_types dt ON dt.id = coalesce(dm.device_type_id, d.device_type_id)
WHERE d.id = sqlc.arg(id);

-- name: ListDevices :many
SELECT
  sqlc.embed(d),
  sqlc.embed(dt),
  dm.name AS model_name,
  dm.variant AS model_variant,
  dm.part_number AS model_part_number,
  m.id AS manufacturer_id,
  m.name AS manufacturer_name
FROM devices d
LEFT JOIN device_models dm ON dm.id = d.device_model_id
LEFT JOIN manufacturers m ON m.id = dm.manufacturer_id
JOIN device_types dt ON dt.id = coalesce(dm.device_type_id, d.device_type_id)
WHERE d.status::text = ANY(sqlc.arg(statuses)::text[])
  AND (
    sqlc.narg(device_type_id)::uuid IS NULL
    OR dt.id = sqlc.narg(device_type_id)::uuid
  )
  AND (
    sqlc.narg(device_model_id)::uuid IS NULL
    OR d.device_model_id = sqlc.narg(device_model_id)::uuid
  )
  AND (
    sqlc.narg(manufacturer_id)::uuid IS NULL
    OR m.id = sqlc.narg(manufacturer_id)::uuid
  )
ORDER BY lower(d.code);

-- name: AllocateDeviceCode :one
UPDATE device_types
SET code_next = device_code_first_free(code_prefix, code_next) + 1
WHERE id = coalesce(
  sqlc.narg(device_type_id)::uuid,
  (SELECT device_type_id FROM device_models WHERE id = sqlc.narg(device_model_id)::uuid)
)
RETURNING device_code_format(code_prefix, code_next - 1)::text AS code;

-- name: CreateDevice :one
INSERT INTO devices (
  code,
  name,
  physical_label,
  device_model_id,
  device_type_id,
  serial_number,
  inventory_number,
  management_ip,
  hostname,
  notes,
  status
)
VALUES (
  sqlc.arg(code),
  sqlc.arg(name),
  sqlc.narg(physical_label),
  sqlc.narg(device_model_id),
  sqlc.narg(device_type_id),
  sqlc.narg(serial_number),
  sqlc.narg(inventory_number),
  sqlc.narg(management_ip),
  sqlc.narg(hostname),
  sqlc.narg(notes),
  sqlc.arg(status)
)
RETURNING id;

-- name: UpdateDevice :one
UPDATE devices
SET
  code = sqlc.arg(code),
  name = sqlc.arg(name),
  physical_label = sqlc.narg(physical_label),
  device_model_id = sqlc.narg(device_model_id),
  device_type_id = sqlc.narg(device_type_id),
  serial_number = sqlc.narg(serial_number),
  inventory_number = sqlc.narg(inventory_number),
  management_ip = sqlc.narg(management_ip),
  hostname = sqlc.narg(hostname),
  notes = sqlc.narg(notes),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id;

-- name: UpdateDeviceStatus :one
UPDATE devices
SET
  status = sqlc.arg(status),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id;

-- name: DeleteDevice :execrows
DELETE FROM devices
WHERE id = sqlc.arg(id);

-- name: CountDevicesWithModel :one
SELECT count(*)
FROM devices
WHERE device_model_id = sqlc.arg(device_model_id);
