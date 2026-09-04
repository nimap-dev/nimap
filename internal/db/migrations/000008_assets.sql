-- +goose Up
CREATE TYPE asset_type AS ENUM (
  'image',
  'video',
  'audio',
  'document',
  'other'
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  storage_path text NOT NULL,

  title text NOT NULL,
  original_filename text NOT NULL,
  content_type text NOT NULL,
  type asset_type NOT NULL,
  byte_size bigint NOT NULL,

  -- Raw sha256
  checksum bytea NOT NULL,

  width int,
  height int,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT asset_storage_path_shape
    CHECK (storage_path ~ '^[0-9A-Za-z][0-9A-Za-z._/-]*$'),
  CONSTRAINT asset_storage_path_no_traversal
    CHECK (storage_path !~ '(^|/)[.][.]?(/|$)' AND storage_path !~ '//'),
  CONSTRAINT asset_title_not_blank
    CHECK (length(trim(title)) > 0),
  CONSTRAINT asset_original_filename_not_blank
    CHECK (length(trim(original_filename)) > 0),
  CONSTRAINT asset_content_type_format
    CHECK (content_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*$'),
  CONSTRAINT asset_byte_size_positive
    CHECK (byte_size > 0),
  CONSTRAINT asset_checksum_sha256
    CHECK (octet_length(checksum) = 32),
  CONSTRAINT asset_dimensions_paired
    CHECK ((width IS NULL AND height IS NULL) OR (width > 0 AND height > 0))
);

CREATE UNIQUE INDEX asset_storage_path_unique ON assets (storage_path);
CREATE INDEX asset_checksum_idx ON assets (checksum);
CREATE INDEX asset_type_idx ON assets (type);


CREATE TABLE asset_attachments (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,

  position int NOT NULL DEFAULT 0,
  caption text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT asset_attachment_one_owner
    CHECK (num_nonnulls(location_id, building_id) = 1),
  CONSTRAINT asset_attachment_position_not_negative
    CHECK (position >= 0),
  CONSTRAINT asset_attachment_caption_not_blank
    CHECK (caption IS NULL OR length(trim(caption)) > 0)
);

CREATE INDEX asset_attachment_asset_id_idx
  ON asset_attachments (asset_id);

CREATE INDEX asset_attachment_location_id_idx
  ON asset_attachments (location_id, position)
  WHERE location_id IS NOT NULL;
CREATE INDEX asset_attachment_building_id_idx
  ON asset_attachments (building_id, position)
  WHERE building_id IS NOT NULL;

CREATE UNIQUE INDEX asset_attachment_location_asset_unique
  ON asset_attachments (location_id, asset_id)
  WHERE location_id IS NOT NULL;
CREATE UNIQUE INDEX asset_attachment_building_asset_unique
  ON asset_attachments (building_id, asset_id)
  WHERE building_id IS NOT NULL;

-- +goose Down

DROP TABLE IF EXISTS asset_attachments;
DROP TABLE IF EXISTS assets;
DROP TYPE IF EXISTS asset_type;
