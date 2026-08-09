-- name: GetBuilding :one
SELECT
  id,
  name,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  created_at,
  updated_at
FROM building
WHERE id = sqlc.arg(id)
  AND deleted_at IS NULL;

-- name: ListBuildings :many
SELECT
  id,
  name,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  created_at,
  updated_at
FROM building
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- name: CreateBuilding :one
INSERT INTO building (
  name,
  footprint,
  notes
)
VALUES (
  sqlc.arg(name),
  ST_GeomFromGeoJSON(sqlc.arg(footprint)::text),
  sqlc.narg(notes)
)
RETURNING
  id,
  name,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  created_at,
  updated_at;

-- name: UpdateBuilding :one
UPDATE building
SET
  name = sqlc.arg(name),
  footprint = ST_GeomFromGeoJSON(sqlc.arg(footprint)::text),
  notes = sqlc.narg(notes),
  updated_at = now()
WHERE id = sqlc.arg(id)
  AND deleted_at IS NULL
RETURNING
  id,
  name,
  ST_AsGeoJSON(footprint)::text AS footprint,
  ST_AsGeoJSON(representative_point)::text AS representative_point,
  notes,
  created_at,
  updated_at;

-- name: DeleteBuilding :execrows
UPDATE building
SET
  deleted_at = now(),
  updated_at = now()
WHERE id = sqlc.arg(id)
  AND deleted_at IS NULL;