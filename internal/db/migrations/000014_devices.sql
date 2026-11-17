-- +goose Up

-- Every device type carries the fixed prefix of its device codes (SW-001) and
-- the number the next generated code starts looking from.
ALTER TABLE device_types
  ADD COLUMN code_prefix text,
  ADD COLUMN code_next integer NOT NULL DEFAULT 1;

UPDATE device_types AS dt
SET code_prefix = p.prefix
FROM (VALUES
  ('switch',          'SW'),
  ('router',          'RT'),
  ('firewall',        'FW'),
  ('access_point',    'AP'),
  ('antenna',         'ANT'),
  ('server',          'SRV'),
  ('storage',         'STO'),
  ('patch_panel',     'PP'),
  ('odf',             'ODF'),
  ('network_outlet',  'NO'),
  ('media_converter', 'MC'),
  ('ups',             'UPS'),
  ('pdu',             'PDU'),
  ('camera',          'CAM'),
  ('phone',           'TEL'),
  ('printer',         'PRN'),
  ('workstation',     'PC'),
  ('sensor',          'SEN'),
  ('iot',             'IOT'),
  ('other',           'X')
) AS p(code, prefix)
WHERE dt.code = p.code;

ALTER TABLE device_types
  ALTER COLUMN code_prefix SET NOT NULL,
  ADD CONSTRAINT device_type_code_prefix_shape
    CHECK (code_prefix ~ '^[A-Z]{1,5}$'),
  ADD CONSTRAINT device_type_code_next_positive
    CHECK (code_next >= 1);

CREATE UNIQUE INDEX device_type_code_prefix_unique
  ON device_types (code_prefix);

-- PREFIX-NNN, padded to three digits; past 999 the number just grows (SW-1000).
-- +goose StatementBegin
CREATE FUNCTION device_code_format(prefix text, n integer) RETURNS text AS $$
  SELECT prefix || '-' || CASE
    WHEN n < 1000 THEN lpad(n::text, 3, '0')
    ELSE n::text
  END;
$$ LANGUAGE sql IMMUTABLE STRICT;
-- +goose StatementEnd

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuidv7(),

  code text NOT NULL,
  name text NOT NULL,
  physical_label text,

  -- A device either has a model, and takes its type from it, or has no model
  -- and names its type directly. Never both, so the two cannot disagree.
  device_model_id UUID
    CONSTRAINT device_device_model_fk
    REFERENCES device_models(id) ON DELETE RESTRICT,
  device_type_id UUID
    CONSTRAINT device_device_type_fk
    REFERENCES device_types(id) ON DELETE RESTRICT,

  serial_number text,
  inventory_number text,

  management_ip inet,
  hostname text,

  notes text,
  status lifecycle_status NOT NULL DEFAULT 'active',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_code_not_blank
    CHECK (length(trim(code)) > 0 AND code = trim(code)),
  CONSTRAINT device_name_not_blank
    CHECK (length(trim(name)) > 0),
  CONSTRAINT device_physical_label_not_blank
    CHECK (physical_label IS NULL OR length(trim(physical_label)) > 0),
  CONSTRAINT device_serial_number_not_blank
    CHECK (serial_number IS NULL OR length(trim(serial_number)) > 0),
  CONSTRAINT device_inventory_number_not_blank
    CHECK (inventory_number IS NULL OR length(trim(inventory_number)) > 0),
  CONSTRAINT device_model_xor_type
    CHECK ((device_model_id IS NULL) <> (device_type_id IS NULL)),
  -- One host address, not a network.
  CONSTRAINT device_management_ip_host CHECK (
    management_ip IS NULL
    OR masklen(management_ip) = CASE family(management_ip) WHEN 4 THEN 32 ELSE 128 END
  ),
  CONSTRAINT device_hostname_format CHECK (
    hostname IS NULL
    OR (
      length(hostname) <= 253
      AND hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
    )
  )
);

-- Codes are unique regardless of case: sw-001 and SW-001 are the same code.
CREATE UNIQUE INDEX device_code_unique
  ON devices (lower(code));
CREATE INDEX device_device_model_id_idx
  ON devices (device_model_id);
CREATE INDEX device_device_type_id_idx
  ON devices (device_type_id);
CREATE INDEX device_status_idx
  ON devices (status);
CREATE INDEX device_management_ip_idx
  ON devices (management_ip);

-- The first number from `start` on whose code no device holds yet. Hand-entered
-- codes do not move the counter, so generation steps over them here.
-- VOLATILE so that, called from an UPDATE re-evaluated after a lock wait, it
-- sees devices committed in the meantime.
-- +goose StatementBegin
CREATE FUNCTION device_code_first_free(prefix text, start integer) RETURNS integer AS $$
DECLARE
  n integer := start;
BEGIN
  WHILE EXISTS (
    SELECT 1 FROM devices WHERE lower(code) = lower(device_code_format(prefix, n))
  ) LOOP
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$ LANGUAGE plpgsql VOLATILE STRICT;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS device_code_first_free(text, integer);
DROP TABLE IF EXISTS devices;
DROP FUNCTION IF EXISTS device_code_format(text, integer);

DROP INDEX IF EXISTS device_type_code_prefix_unique;
ALTER TABLE device_types
  DROP CONSTRAINT IF EXISTS device_type_code_next_positive,
  DROP CONSTRAINT IF EXISTS device_type_code_prefix_shape,
  DROP COLUMN IF EXISTS code_next,
  DROP COLUMN IF EXISTS code_prefix;
