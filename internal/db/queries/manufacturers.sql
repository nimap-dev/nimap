-- name: GetManufacturer :one
SELECT
  id,
  name,
  website,
  notes,
  created_at,
  updated_at
FROM manufacturers
WHERE id = sqlc.arg(id);

-- name: ListManufacturers :many
SELECT
  id,
  name,
  website,
  notes,
  created_at,
  updated_at
FROM manufacturers
ORDER BY lower(name);

-- name: CreateManufacturer :one
INSERT INTO manufacturers (
  name,
  website,
  notes
)
VALUES (
  sqlc.arg(name),
  sqlc.narg(website),
  sqlc.narg(notes)
)
RETURNING
  id,
  name,
  website,
  notes,
  created_at,
  updated_at;

-- name: UpdateManufacturer :one
UPDATE manufacturers
SET
  name = sqlc.arg(name),
  website = sqlc.narg(website),
  notes = sqlc.narg(notes),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  name,
  website,
  notes,
  created_at,
  updated_at;

-- name: DeleteManufacturer :execrows
DELETE FROM manufacturers
WHERE id = sqlc.arg(id);


-- name: CountDeviceModelsWithManufacturer :one
SELECT count(*)
FROM device_models
WHERE manufacturer_id = sqlc.arg(manufacturer_id);
