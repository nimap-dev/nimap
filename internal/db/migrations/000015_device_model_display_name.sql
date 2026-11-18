-- +goose Up

ALTER TABLE device_models
  ADD COLUMN display_name text,

  ADD CONSTRAINT device_model_display_name_not_blank
    CHECK (display_name IS NULL OR length(trim(display_name)) > 0);

-- +goose Down
ALTER TABLE device_models
  DROP CONSTRAINT IF EXISTS device_model_display_name_not_blank,
  DROP COLUMN IF EXISTS display_name;
