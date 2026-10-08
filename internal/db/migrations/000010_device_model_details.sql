-- +goose Up

CREATE TYPE poe_standard AS ENUM (
  'af',
  'at',
  'bt',
  'passive'
);

ALTER TABLE device_models
  ADD COLUMN website text,
  ADD COLUMN variant text,
  ADD COLUMN poe_in_standard poe_standard,
  ADD COLUMN poe_out_standard poe_standard,
  ADD COLUMN poe_budget_watts int,

  ADD CONSTRAINT device_model_website_not_blank
    CHECK (website IS NULL OR length(trim(website)) > 0),
  ADD CONSTRAINT device_model_variant_not_blank
    CHECK (variant IS NULL OR length(trim(variant)) > 0),
  ADD CONSTRAINT device_model_poe_in_details
    CHECK (poe_in OR poe_in_standard IS NULL),
  ADD CONSTRAINT device_model_poe_out_details
    CHECK (poe_out OR (poe_out_standard IS NULL AND poe_budget_watts IS NULL)),
  ADD CONSTRAINT device_model_poe_budget_positive
    CHECK (poe_budget_watts IS NULL OR poe_budget_watts > 0);

DROP INDEX device_model_manufacturer_name_unique_ci;
CREATE UNIQUE INDEX device_model_manufacturer_name_unique_ci
  ON device_models (manufacturer_id, lower(name), lower(coalesce(variant, '')));

CREATE INDEX device_model_mounting_idx
  ON device_models (mounting);

-- +goose Down
DROP INDEX IF EXISTS device_model_mounting_idx;

DROP INDEX device_model_manufacturer_name_unique_ci;
CREATE UNIQUE INDEX device_model_manufacturer_name_unique_ci
  ON device_models (manufacturer_id, lower(name));

ALTER TABLE device_models
  DROP CONSTRAINT IF EXISTS device_model_poe_budget_positive,
  DROP CONSTRAINT IF EXISTS device_model_poe_out_details,
  DROP CONSTRAINT IF EXISTS device_model_poe_in_details,
  DROP CONSTRAINT IF EXISTS device_model_variant_not_blank,
  DROP CONSTRAINT IF EXISTS device_model_website_not_blank,
  DROP COLUMN IF EXISTS poe_budget_watts,
  DROP COLUMN IF EXISTS poe_out_standard,
  DROP COLUMN IF EXISTS poe_in_standard,
  DROP COLUMN IF EXISTS variant,
  DROP COLUMN IF EXISTS website;

DROP TYPE IF EXISTS poe_standard;
