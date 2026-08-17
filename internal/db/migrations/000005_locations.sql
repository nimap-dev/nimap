-- +goose Up
ALTER TABLE building RENAME TO buildings;

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  parent_id UUID REFERENCES locations(id) ON DELETE RESTRICT,

  name text NOT NULL,

  address_street  text,
  address_city    text,
  address_zip     text,
  address_country text,

  area geometry(MultiPolygon, 4326),

  representative_point geometry(Point, 4326),

  status lifecycle_status NOT NULL DEFAULT 'active',

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT location_parent_not_self CHECK (parent_id <> id),
  CONSTRAINT location_area_valid CHECK (area IS NULL OR ST_IsValid(area)),
  CONSTRAINT location_area_size CHECK (
    area IS NULL OR ST_NPoints(area) BETWEEN 4 AND 5000
  ),
  CONSTRAINT location_country_code CHECK (
    address_country IS NULL OR address_country ~ '^[A-Z]{2}$'
  )
);

-- location_parent_not_self only catches a location pointing at itself. A longer
-- ring (A -> B -> C -> A) needs the ancestors walked.
-- +goose StatementBegin
CREATE FUNCTION location_reject_parent_cycle() RETURNS trigger AS $$
DECLARE
  ancestor UUID := NEW.parent_id;
  steps int := 0;
BEGIN
  WHILE ancestor IS NOT NULL LOOP
    IF ancestor = NEW.id THEN
      RAISE EXCEPTION 'location % cannot be its own ancestor', NEW.id
        USING ERRCODE = '23514', CONSTRAINT = 'location_no_parent_cycle';
    END IF;

    -- Stops the walk rather than the nesting: a ring already in the table would
    -- otherwise spin here forever.
    steps := steps + 1;
    IF steps > 64 THEN
      RAISE EXCEPTION 'location % has an unwalkable ancestor chain', NEW.id
        USING ERRCODE = '23514', CONSTRAINT = 'location_no_parent_cycle';
    END IF;

    SELECT parent_id INTO ancestor FROM locations WHERE id = ancestor;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER location_no_parent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON locations
  FOR EACH ROW
  WHEN (NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION location_reject_parent_cycle();


CREATE INDEX location_area_gix
  ON locations USING GIST (area) WHERE deleted_at IS NULL;
CREATE INDEX location_repr_point_gix
  ON locations USING GIST (representative_point) WHERE deleted_at IS NULL;
CREATE INDEX location_parent_id_idx
  ON locations (parent_id) WHERE deleted_at IS NULL;

ALTER TABLE buildings
  ADD COLUMN address_street text,
  ADD COLUMN address_city text,
  ADD COLUMN address_zip text,
  ADD COLUMN address_country text,
  ADD CONSTRAINT building_country_code CHECK (
    address_country IS NULL OR address_country ~ '^[A-Z]{2}$'
  );

-- +goose Down
ALTER TABLE buildings
  DROP CONSTRAINT IF EXISTS building_country_code,
  DROP COLUMN IF EXISTS address_street,
  DROP COLUMN IF EXISTS address_city,
  DROP COLUMN IF EXISTS address_zip,
  DROP COLUMN IF EXISTS address_country;

DROP TABLE IF EXISTS locations;
DROP FUNCTION IF EXISTS location_reject_parent_cycle();

ALTER TABLE buildings RENAME TO building;
