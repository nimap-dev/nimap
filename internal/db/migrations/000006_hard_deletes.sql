-- +goose Up

UPDATE locations
SET parent_id = NULL,
    updated_at = now()
WHERE deleted_at IS NULL
  AND parent_id IN (SELECT id FROM locations WHERE deleted_at IS NOT NULL);

-- +goose StatementBegin
DO $$
DECLARE
  removed bigint;
BEGIN
  LOOP
    DELETE FROM locations
    WHERE deleted_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM locations AS child WHERE child.parent_id = locations.id
      );

    GET DIAGNOSTICS removed = ROW_COUNT;
    EXIT WHEN removed = 0;
  END LOOP;
END;
$$;
-- +goose StatementEnd

DELETE FROM buildings WHERE deleted_at IS NOT NULL;
DELETE FROM auth.users WHERE deleted_at IS NOT NULL;

-- A partial index cannot have its predicate altered, so every index that
-- carried `WHERE deleted_at IS NULL` is rebuilt without it.
DROP INDEX auth.users_username_unique_ci;
DROP INDEX auth.users_email_unique_ci;
DROP INDEX auth.users_deleted_at_idx;

CREATE UNIQUE INDEX users_username_unique_ci
  ON auth.users (lower(username));

CREATE UNIQUE INDEX users_email_unique_ci
  ON auth.users (lower(email));

DROP INDEX building_footprint_gix;
DROP INDEX building_repr_point_gix;
DROP INDEX building_status_idx;

CREATE INDEX building_footprint_gix
  ON buildings USING GIST (footprint);
CREATE INDEX building_repr_point_gix
  ON buildings USING GIST (representative_point);
CREATE INDEX building_status_idx
  ON buildings (status);

DROP INDEX location_area_gix;
DROP INDEX location_repr_point_gix;
DROP INDEX location_parent_id_idx;

CREATE INDEX location_area_gix
  ON locations USING GIST (area);
CREATE INDEX location_repr_point_gix
  ON locations USING GIST (representative_point);
CREATE INDEX location_parent_id_idx
  ON locations (parent_id);

ALTER TABLE auth.users DROP COLUMN deleted_at;
ALTER TABLE buildings DROP COLUMN deleted_at;
ALTER TABLE locations DROP COLUMN deleted_at;

-- +goose Down

-- The columns come back empty: the rows purged above are not recoverable.

ALTER TABLE auth.users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE buildings ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE locations ADD COLUMN deleted_at TIMESTAMPTZ;

DROP INDEX auth.users_username_unique_ci;
DROP INDEX auth.users_email_unique_ci;

CREATE UNIQUE INDEX users_username_unique_ci
  ON auth.users (lower(username))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX users_email_unique_ci
  ON auth.users (lower(email))
  WHERE deleted_at IS NULL;

CREATE INDEX users_deleted_at_idx
  ON auth.users (deleted_at);

DROP INDEX building_footprint_gix;
DROP INDEX building_repr_point_gix;
DROP INDEX building_status_idx;

CREATE INDEX building_footprint_gix
  ON buildings USING GIST (footprint) WHERE deleted_at IS NULL;
CREATE INDEX building_repr_point_gix
  ON buildings USING GIST (representative_point) WHERE deleted_at IS NULL;
CREATE INDEX building_status_idx
  ON buildings (status) WHERE deleted_at IS NULL;

DROP INDEX location_area_gix;
DROP INDEX location_repr_point_gix;
DROP INDEX location_parent_id_idx;

CREATE INDEX location_area_gix
  ON locations USING GIST (area) WHERE deleted_at IS NULL;
CREATE INDEX location_repr_point_gix
  ON locations USING GIST (representative_point) WHERE deleted_at IS NULL;
CREATE INDEX location_parent_id_idx
  ON locations (parent_id) WHERE deleted_at IS NULL;
