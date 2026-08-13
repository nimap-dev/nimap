-- +goose Up

CREATE TYPE lifecycle_status AS ENUM (
  'planned',
  'active',
  'decommissioned',
  'archived'
);

ALTER TABLE building
  ADD COLUMN status lifecycle_status NOT NULL DEFAULT 'active';


CREATE INDEX building_status_idx
  ON building (status) WHERE deleted_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS building_status_idx;

ALTER TABLE building
  DROP COLUMN IF EXISTS status;

DROP TYPE IF EXISTS lifecycle_status;
