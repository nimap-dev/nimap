-- name: GetBuilding :one
SELECT
  id,
  name,
  location_id,
  address_street,
  address_city,
  address_zip,
  address_country,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  status,
  created_at,
  updated_at
FROM buildings
WHERE id = sqlc.arg(id);

-- name: ListBuildings :many
SELECT
  id,
  name,
  location_id,
  address_street,
  address_city,
  address_zip,
  address_country,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  status,
  created_at,
  updated_at
FROM buildings
WHERE status::text = ANY(sqlc.arg(statuses)::text[])
  AND (
    sqlc.narg(location_id)::uuid IS NULL
    OR location_id = sqlc.narg(location_id)::uuid
  )
ORDER BY created_at DESC;

-- name: CreateBuilding :one
INSERT INTO buildings (
  name,
  location_id,
  address_street,
  address_city,
  address_zip,
  address_country,
  footprint,
  notes,
  status
)
VALUES (
  sqlc.arg(name),
  sqlc.narg(location_id),
  sqlc.arg(address_street),
  sqlc.arg(address_city),
  sqlc.arg(address_zip),
  sqlc.arg(address_country),
  ST_GeomFromGeoJSON(sqlc.arg(footprint)::text),
  sqlc.narg(notes),
  sqlc.arg(status)
)
RETURNING
  id,
  name,
  location_id,
  address_street,
  address_city,
  address_zip,
  address_country,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  status,
  created_at,
  updated_at;

-- name: UpdateBuilding :one
UPDATE buildings
SET
  name = sqlc.arg(name),
  location_id = sqlc.narg(location_id),
  address_street = sqlc.arg(address_street),
  address_city = sqlc.arg(address_city),
  address_zip = sqlc.arg(address_zip),
  address_country = sqlc.arg(address_country),
  footprint = ST_GeomFromGeoJSON(sqlc.arg(footprint)::text),
  notes = sqlc.narg(notes),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  name,
  location_id,
  address_street,
  address_city,
  address_zip,
  address_country,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  status,
  created_at,
  updated_at;

-- name: UpdateBuildingStatus :one
UPDATE buildings
SET
  status = sqlc.arg(status),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  name,
  location_id,
  address_street,
  address_city,
  address_zip,
  address_country,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  status,
  created_at,
  updated_at;

-- name: DeleteBuilding :execrows
DELETE FROM buildings
WHERE id = sqlc.arg(id);

-- name: CountBuildingsInLocation :one
SELECT count(*)
FROM buildings
WHERE location_id = sqlc.arg(location_id)::uuid;
