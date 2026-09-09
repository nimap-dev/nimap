-- name: GetLocation :one
SELECT
  id,
  parent_id,
  name,
  address_street,
  address_city,
  address_zip,
  address_country,
  COALESCE(ST_AsGeoJSON(area)::text, '')::text AS area,
  COALESCE(ST_AsGeoJSON(
    COALESCE(representative_point, ST_PointOnSurface(area))
  )::text, '')::text AS representative_point,
  (representative_point IS NOT NULL)::bool AS representative_point_manual,
  status,
  notes,
  created_at,
  updated_at
FROM locations
WHERE id = sqlc.arg(id);

-- name: ListLocations :many
SELECT
  id,
  parent_id,
  name,
  address_street,
  address_city,
  address_zip,
  address_country,
  COALESCE(ST_AsGeoJSON(area)::text, '')::text AS area,
  COALESCE(ST_AsGeoJSON(
    COALESCE(representative_point, ST_PointOnSurface(area))
  )::text, '')::text AS representative_point,
  (representative_point IS NOT NULL)::bool AS representative_point_manual,
  status,
  notes,
  created_at,
  updated_at
FROM locations
WHERE status::text = ANY(sqlc.arg(statuses)::text[])
ORDER BY name;

-- name: CreateLocation :one
INSERT INTO locations (
  parent_id,
  name,
  address_street,
  address_city,
  address_zip,
  address_country,
  area,
  representative_point,
  status,
  notes
)
VALUES (
  sqlc.narg(parent_id),
  sqlc.arg(name),
  sqlc.narg(address_street),
  sqlc.narg(address_city),
  sqlc.narg(address_zip),
  sqlc.narg(address_country),
  ST_GeomFromGeoJSON(sqlc.narg(area)::text),
  ST_GeomFromGeoJSON(sqlc.narg(representative_point)::text),
  sqlc.arg(status),
  sqlc.narg(notes)
)
RETURNING
  id,
  parent_id,
  name,
  address_street,
  address_city,
  address_zip,
  address_country,
  COALESCE(ST_AsGeoJSON(area)::text, '')::text AS area,
  COALESCE(ST_AsGeoJSON(
    COALESCE(representative_point, ST_PointOnSurface(area))
  )::text, '')::text AS representative_point,
  (representative_point IS NOT NULL)::bool AS representative_point_manual,
  status,
  notes,
  created_at,
  updated_at;

-- Leaves the status alone: taking a location out of service is its own
-- operation, the same split the buildings queries make.
-- name: UpdateLocation :one
UPDATE locations
SET
  parent_id = sqlc.narg(parent_id),
  name = sqlc.arg(name),
  address_street = sqlc.narg(address_street),
  address_city = sqlc.narg(address_city),
  address_zip = sqlc.narg(address_zip),
  address_country = sqlc.narg(address_country),
  area = ST_GeomFromGeoJSON(sqlc.narg(area)::text),
  representative_point = ST_GeomFromGeoJSON(
    sqlc.narg(representative_point)::text
  ),
  notes = sqlc.narg(notes),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  parent_id,
  name,
  address_street,
  address_city,
  address_zip,
  address_country,
  COALESCE(ST_AsGeoJSON(area)::text, '')::text AS area,
  COALESCE(ST_AsGeoJSON(
    COALESCE(representative_point, ST_PointOnSurface(area))
  )::text, '')::text AS representative_point,
  (representative_point IS NOT NULL)::bool AS representative_point_manual,
  status,
  notes,
  created_at,
  updated_at;

-- name: UpdateLocationStatus :one
UPDATE locations
SET
  status = sqlc.arg(status),
  updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING
  id,
  parent_id,
  name,
  address_street,
  address_city,
  address_zip,
  address_country,
  COALESCE(ST_AsGeoJSON(area)::text, '')::text AS area,
  COALESCE(ST_AsGeoJSON(
    COALESCE(representative_point, ST_PointOnSurface(area))
  )::text, '')::text AS representative_point,
  (representative_point IS NOT NULL)::bool AS representative_point_manual,
  status,
  notes,
  created_at,
  updated_at;

-- name: DeleteLocation :execrows
DELETE FROM locations
WHERE id = sqlc.arg(id);

-- name: CountLocationChildren :one
SELECT count(*)
FROM locations
WHERE parent_id = sqlc.arg(id)::uuid;

-- Picks the location whose area a footprint overlaps the most, so a building
-- drawn inside a campus lands in the campus rather than in whichever location
-- happened to be found first. Out-of-service locations are never suggested, and
-- neither are the ones nobody has drawn yet: `area IS NOT NULL` says so up
-- front, where the GIST index can use it, instead of leaving it to
-- ST_Intersects returning NULL.
-- name: SuggestLocationForFootprint :one
SELECT
  id,
  name
FROM locations
WHERE area IS NOT NULL
  AND status IN ('planned', 'active')
  AND ST_Intersects(area, ST_GeomFromGeoJSON(sqlc.arg(footprint)::text))
ORDER BY
  ST_Area(
    ST_Intersection(area, ST_GeomFromGeoJSON(sqlc.arg(footprint)::text))
  ) DESC,
  ST_Area(area) ASC,
  id
LIMIT 1;
