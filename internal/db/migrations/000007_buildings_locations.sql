-- +goose Up
ALTER TABLE buildings
  ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE RESTRICT;


CREATE INDEX building_location_id_idx
  ON buildings (location_id);

-- +goose Down
DROP INDEX IF EXISTS building_location_id_idx;

ALTER TABLE buildings
  DROP COLUMN IF EXISTS location_id;
