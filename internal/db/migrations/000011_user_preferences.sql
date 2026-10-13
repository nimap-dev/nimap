-- +goose Up

CREATE TYPE auth.language AS ENUM (
  'en',
  'cs'
);

CREATE TYPE auth.date_format AS ENUM (
  'auto',
  'dmy_dot',
  'iso',
  'mdy_slash',
  'd_mmm_y',
  'mmm_d_y'
);

CREATE TYPE auth.time_format AS ENUM (
  'auto',
  'h24',
  'h12'
);

-- One or more representative IANA zones for every UTC offset.
CREATE TYPE auth.timezone AS ENUM (
  'Etc/GMT+12',
  'Pacific/Pago_Pago',
  'Pacific/Honolulu',
  'Pacific/Marquesas',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Phoenix',
  'America/Chicago',
  'America/Mexico_City',
  'America/New_York',
  'America/Bogota',
  'America/Halifax',
  'America/Caracas',
  'America/St_Johns',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Noronha',
  'Atlantic/Azores',
  'Atlantic/Cape_Verde',
  'UTC',
  'Europe/London',
  'Europe/Lisbon',
  'Africa/Abidjan',
  'Europe/Prague',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Warsaw',
  'Africa/Lagos',
  'Europe/Athens',
  'Europe/Kyiv',
  'Europe/Helsinki',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Asia/Riyadh',
  'Africa/Nairobi',
  'Asia/Tehran',
  'Asia/Dubai',
  'Asia/Baku',
  'Asia/Kabul',
  'Asia/Karachi',
  'Asia/Tashkent',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Almaty',
  'Asia/Yangon',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Perth',
  'Australia/Eucla',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Darwin',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Pacific/Port_Moresby',
  'Australia/Lord_Howe',
  'Pacific/Noumea',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Chatham',
  'Pacific/Tongatapu',
  'Pacific/Apia',
  'Pacific/Kiritimati'
);

CREATE TYPE auth.theme AS ENUM (
  'system',
  'light',
  'dark'
);

ALTER TABLE auth.users
  ADD COLUMN language auth.language NOT NULL DEFAULT 'en',
  ADD COLUMN timezone auth.timezone,
  ADD COLUMN date_format auth.date_format NOT NULL DEFAULT 'auto',
  ADD COLUMN time_format auth.time_format NOT NULL DEFAULT 'auto',
  ADD COLUMN theme auth.theme NOT NULL DEFAULT 'system';

-- +goose Down
ALTER TABLE auth.users
  DROP COLUMN IF EXISTS theme,
  DROP COLUMN IF EXISTS time_format,
  DROP COLUMN IF EXISTS date_format,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS language;

DROP TYPE IF EXISTS auth.theme;
DROP TYPE IF EXISTS auth.timezone;
DROP TYPE IF EXISTS auth.time_format;
DROP TYPE IF EXISTS auth.date_format;
DROP TYPE IF EXISTS auth.language;
