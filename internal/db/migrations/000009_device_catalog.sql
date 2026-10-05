-- +goose Up

CREATE TYPE mounting_type AS ENUM (
  'rack',
  'wall',
  'desktop',
  'din_rail',
  'ceiling',
  'pole',
  'embedded',
  'other'
);

CREATE TABLE device_types (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  code text NOT NULL,
  name text NOT NULL,
  -- A lucide icon name, as lucide.dev lists it (kebab-case).
  icon text NOT NULL,
  color text NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_type_code_shape
    CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT device_type_name_not_blank
    CHECK (length(trim(name)) > 0),
  CONSTRAINT device_type_icon_shape
    CHECK (icon ~ '^[a-z][a-z0-9-]*$'),
  CONSTRAINT device_type_color_hex
    CHECK (color ~ '^#[0-9a-f]{6}$')
);

CREATE UNIQUE INDEX device_type_code_unique
  ON device_types (code);

INSERT INTO device_types (code, name, icon, color, sort_order) VALUES
  ('switch',          'Switch',          'network',          '#2563eb', 10),
  ('router',          'Router',          'router',           '#7c3aed', 20),
  ('firewall',        'Firewall',        'shield',           '#dc2626', 30),
  ('access_point',    'Access point',    'wifi',             '#0891b2', 40),
  ('server',          'Server',          'server',           '#4b5563', 50),
  ('storage',         'Storage',         'hard-drive',       '#6b7280', 60),
  ('patch_panel',     'Patch panel',     'ethernet-port',    '#9ca3af', 70),
  ('media_converter', 'Media converter', 'cable',            '#8b5cf6', 80),
  ('ups',             'UPS',             'battery-charging', '#d97706', 90),
  ('pdu',             'PDU',             'plug',             '#b45309', 100),
  ('camera',          'Camera',          'camera',           '#059669', 110),
  ('phone',           'Phone',           'phone',            '#0d9488', 120),
  ('printer',         'Printer',         'printer',          '#64748b', 130),
  ('workstation',     'Workstation',     'monitor',          '#475569', 140),
  ('other',           'Other',           'box',              '#71717a', 900);

CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  name text NOT NULL,
  website text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT manufacturer_name_not_blank
    CHECK (length(trim(name)) > 0),
  CONSTRAINT manufacturer_website_not_blank
    CHECK (website IS NULL OR length(trim(website)) > 0)
);

CREATE UNIQUE INDEX manufacturer_name_unique_ci
  ON manufacturers (lower(name));

CREATE TABLE device_models (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  device_type_id UUID NOT NULL
    CONSTRAINT device_model_device_type_fk
    REFERENCES device_types(id) ON DELETE RESTRICT,

  manufacturer_id UUID NOT NULL
    CONSTRAINT device_model_manufacturer_fk
    REFERENCES manufacturers(id) ON DELETE RESTRICT,

  name text NOT NULL,
  part_number text,

  width_mm int,
  height_mm int,
  depth_mm int,
  rack_units smallint,
  mounting mounting_type,

  power_watts_max int,
  poe_in boolean NOT NULL DEFAULT false,
  poe_out boolean NOT NULL DEFAULT false,

  notes text,
  status lifecycle_status NOT NULL DEFAULT 'active',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_model_name_not_blank
    CHECK (length(trim(name)) > 0),
  CONSTRAINT device_model_part_number_not_blank
    CHECK (part_number IS NULL OR length(trim(part_number)) > 0),
  CONSTRAINT device_model_dimensions_positive CHECK (
    (width_mm IS NULL OR width_mm > 0)
    AND (height_mm IS NULL OR height_mm > 0)
    AND (depth_mm IS NULL OR depth_mm > 0)
  ),
  CONSTRAINT device_model_rack_units_positive
    CHECK (rack_units IS NULL OR rack_units > 0),
  CONSTRAINT device_model_power_positive
    CHECK (power_watts_max IS NULL OR power_watts_max > 0)
);

CREATE UNIQUE INDEX device_model_manufacturer_name_unique_ci
  ON device_models (manufacturer_id, lower(name));
CREATE INDEX device_model_manufacturer_id_idx
  ON device_models (manufacturer_id);
CREATE INDEX device_model_device_type_id_idx
  ON device_models (device_type_id);
CREATE INDEX device_model_status_idx
  ON device_models (status);

ALTER TABLE asset_attachments
  ADD COLUMN device_model_id UUID
    CONSTRAINT asset_attachment_device_model_fk
    REFERENCES device_models(id) ON DELETE CASCADE,
  DROP CONSTRAINT asset_attachment_one_owner,
  ADD CONSTRAINT asset_attachment_one_owner CHECK (
    num_nonnulls(location_id, building_id, device_model_id) = 1
  );

CREATE INDEX asset_attachment_device_model_id_idx
  ON asset_attachments (device_model_id, position)
  WHERE device_model_id IS NOT NULL;

CREATE UNIQUE INDEX asset_attachment_device_model_asset_unique
  ON asset_attachments (device_model_id, asset_id)
  WHERE device_model_id IS NOT NULL;

-- +goose Down

DELETE FROM asset_attachments
WHERE device_model_id IS NOT NULL;

ALTER TABLE asset_attachments
  DROP CONSTRAINT asset_attachment_one_owner,
  DROP COLUMN device_model_id,
  ADD CONSTRAINT asset_attachment_one_owner
    CHECK (num_nonnulls(location_id, building_id) = 1);

DROP TABLE IF EXISTS device_models;
DROP TABLE IF EXISTS manufacturers;
DROP TABLE IF EXISTS device_types;

DROP TYPE IF EXISTS mounting_type;
