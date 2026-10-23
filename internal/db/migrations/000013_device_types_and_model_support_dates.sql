-- +goose Up

INSERT INTO device_types (code, name, icon, color, sort_order) VALUES
  ('antenna',        'Antenna',        'antenna',     '#0e7490', 45),
  ('odf',            'ODF',            'rows-3',      '#94a3b8', 72),
  ('network_outlet', 'Network outlet', 'square-dot',  '#a1a1aa', 74),
  ('sensor',         'Sensor',         'thermometer', '#ca8a04', 150),
  ('iot',            'IoT device',     'cpu',         '#16a34a', 160);

ALTER TABLE device_models
  ADD COLUMN end_of_sale date,
  ADD COLUMN end_of_support date,

  -- A model cannot stop being supported before it stops being sold.
  ADD CONSTRAINT device_model_end_of_support_after_sale CHECK (
    end_of_sale IS NULL
    OR end_of_support IS NULL
    OR end_of_support >= end_of_sale
  );

-- +goose Down
ALTER TABLE device_models
  DROP CONSTRAINT IF EXISTS device_model_end_of_support_after_sale,
  DROP COLUMN IF EXISTS end_of_support,
  DROP COLUMN IF EXISTS end_of_sale;


DELETE FROM device_types
WHERE code IN ('antenna', 'odf', 'network_outlet', 'sensor', 'iot');
