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
WHERE id = sqlc.arg(id)
  AND deleted_at IS NULL;

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
WHERE deleted_at IS NULL
  AND status::text = ANY(sqlc.arg(statuses)::text[])
ORDER BY name;

-- The tree is walked over every location that is not deleted, and the status
-- filter is applied only to what comes out: filtering inside the recursion
-- would drop the children of a hidden parent along with it. A location whose
-- parent is filtered out therefore arrives with its depth intact but without a
-- visible ancestor, which the caller should fall back to rendering flat.
--
-- `path` never leaves the query. It orders the rows into tree order, and the
-- caller indents by `depth` from there.
-- name: ListLocationTree :many
WITH RECURSIVE tree AS (
  SELECT
    location.id,
    location.parent_id,
    0 AS depth,
    ARRAY[location.name] AS path
  FROM locations AS location
  WHERE location.deleted_at IS NULL
    AND location.parent_id IS NULL

  UNION ALL

  SELECT
    child.id,
    child.parent_id,
    parent.depth + 1,
    parent.path || child.name
  FROM locations AS child
  JOIN tree AS parent ON child.parent_id = parent.id
  WHERE child.deleted_at IS NULL
)
SELECT
  location.id,
  location.parent_id,
  location.name,
  location.address_street,
  location.address_city,
  location.address_zip,
  location.address_country,
  COALESCE(ST_AsGeoJSON(location.area)::text, '')::text AS area,
  COALESCE(ST_AsGeoJSON(
    COALESCE(location.representative_point, ST_PointOnSurface(location.area))
  )::text, '')::text AS representative_point,
  (location.representative_point IS NOT NULL)::bool AS representative_point_manual,
  location.status,
  location.notes,
  location.created_at,
  location.updated_at,
  tree.depth
FROM tree
JOIN locations AS location ON location.id = tree.id
WHERE location.status::text = ANY(sqlc.arg(statuses)::text[])
ORDER BY tree.path;

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
  AND deleted_at IS NULL
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
  AND deleted_at IS NULL
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

-- Refuses in one statement rather than checking first and deleting after, so
-- a child added in between cannot slip past the guard. Zero rows affected means
-- either "not found" or "still has children" — CountLocationChildren tells the
-- two apart for the error message.
-- name: DeleteLocation :execrows
UPDATE locations
SET
  deleted_at = now(),
  updated_at = now()
WHERE locations.id = sqlc.arg(id)
  AND locations.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM locations AS child
    WHERE child.parent_id = locations.id
      AND child.deleted_at IS NULL
  );

-- name: CountLocationChildren :one
SELECT count(*)
FROM locations
WHERE parent_id = sqlc.arg(id)::uuid
  AND deleted_at IS NULL;

-- Picks the location whose area a footprint overlaps the most, so a building
-- drawn inside a campus lands in the campus rather than in whichever location
-- happened to be found first. Out-of-service locations are never suggested, and
-- neither are the ones nobody has drawn yet: `area IS NOT NULL` says so up
-- front, where the partial GIST index can use it, instead of leaving it to
-- ST_Intersects returning NULL.
-- name: SuggestLocationForFootprint :one
SELECT
  id,
  name
FROM locations
WHERE deleted_at IS NULL
  AND area IS NOT NULL
  AND status IN ('planned', 'active')
  AND ST_Intersects(area, ST_GeomFromGeoJSON(sqlc.arg(footprint)::text))
ORDER BY
  ST_Area(
    ST_Intersection(area, ST_GeomFromGeoJSON(sqlc.arg(footprint)::text))
  ) DESC
LIMIT 1;
