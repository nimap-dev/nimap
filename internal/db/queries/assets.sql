-- name: GetAsset :one
SELECT
  id,
  storage_path,
  title,
  original_filename,
  content_type,
  type,
  byte_size,
  checksum,
  width,
  height,
  created_at,
  updated_at
FROM assets
WHERE id = sqlc.arg(id);

-- name: CreateAsset :one
INSERT INTO assets (
  storage_path,
  title,
  original_filename,
  content_type,
  type,
  byte_size,
  checksum,
  width,
  height
)
VALUES (
  sqlc.arg(storage_path),
  sqlc.arg(title),
  sqlc.arg(original_filename),
  sqlc.arg(content_type),
  sqlc.arg(type),
  sqlc.arg(byte_size),
  sqlc.arg(checksum),
  sqlc.narg(width),
  sqlc.narg(height)
)
RETURNING
  id,
  storage_path,
  title,
  original_filename,
  content_type,
  type,
  byte_size,
  checksum,
  width,
  height,
  created_at,
  updated_at;

-- name: DeleteAsset :one
DELETE FROM assets
WHERE id = sqlc.arg(id)
RETURNING storage_path;

-- name: ListLocationAssets :many
SELECT
  aa.id,
  aa.position,
  aa.caption,
  a.id AS asset_id,
  a.storage_path,
  a.title,
  a.original_filename,
  a.content_type,
  a.type,
  a.byte_size,
  a.checksum,
  a.width,
  a.height,
  a.created_at,
  a.updated_at
FROM asset_attachments aa
JOIN assets a ON a.id = aa.asset_id
WHERE aa.location_id = sqlc.arg(location_id)
ORDER BY aa.position, aa.created_at;

-- name: ListBuildingAssets :many
SELECT
  aa.id,
  aa.position,
  aa.caption,
  a.id AS asset_id,
  a.storage_path,
  a.title,
  a.original_filename,
  a.content_type,
  a.type,
  a.byte_size,
  a.checksum,
  a.width,
  a.height,
  a.created_at,
  a.updated_at
FROM asset_attachments aa
JOIN assets a ON a.id = aa.asset_id
WHERE aa.building_id = sqlc.arg(building_id)
ORDER BY aa.position, aa.created_at;

-- name: CreateLocationAssetAttachment :one
INSERT INTO asset_attachments (asset_id, location_id)
VALUES (sqlc.arg(asset_id), sqlc.arg(location_id))
RETURNING
  id,
  asset_id,
  location_id,
  building_id,
  position,
  caption,
  created_at,
  updated_at;

-- name: CreateBuildingAssetAttachment :one
INSERT INTO asset_attachments (asset_id, building_id)
VALUES (sqlc.arg(asset_id), sqlc.arg(building_id))
RETURNING
  id,
  asset_id,
  location_id,
  building_id,
  position,
  caption,
  created_at,
  updated_at;

-- name: DeleteAssetAttachment :one
DELETE FROM asset_attachments
WHERE id = sqlc.arg(id)
RETURNING asset_id;

-- name: ListAssetStoragePaths :many
SELECT storage_path
FROM assets
ORDER BY storage_path;

-- name: ListImageAssets :many
SELECT id, storage_path, width
FROM assets
WHERE type = 'image'
ORDER BY storage_path;

-- name: UpdateAssetDimensions :exec
UPDATE assets
SET width = sqlc.narg(width),
    height = sqlc.narg(height),
    updated_at = now()
WHERE id = sqlc.arg(id);

-- name: ListUnreferencedAssets :many
SELECT a.id, a.storage_path, a.title, a.byte_size, a.created_at
FROM assets a
WHERE NOT EXISTS (
  SELECT 1 FROM asset_attachments aa WHERE aa.asset_id = a.id
)
ORDER BY a.created_at;
