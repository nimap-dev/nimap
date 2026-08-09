-- +goose Up
CREATE TABLE building (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  name text NOT NULL,

  footprint geometry(MultiPolygon, 4326) NOT NULL,

  representative_point geometry(Point, 4326)
    GENERATED ALWAYS AS (ST_PointOnSurface(footprint)) STORED,

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT building_footprint_valid CHECK (ST_IsValid(footprint)),
  CONSTRAINT building_footprint_size  CHECK (ST_NPoints(footprint) BETWEEN 4 AND 5000)
);


CREATE INDEX building_footprint_gix
  ON building USING GIST (footprint) WHERE deleted_at IS NULL;
CREATE INDEX building_repr_point_gix
  ON building USING GIST (representative_point) WHERE deleted_at IS NULL;

-- +goose Down
DROP TABLE building;
