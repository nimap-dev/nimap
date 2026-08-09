-- +goose Up
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.roles (
  id SMALLINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO auth.roles (id, name) VALUES
  (1, 'viewer'),
  (2, 'editor'),
  (3, 'admin');

CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id SMALLINT NOT NULL DEFAULT 1 REFERENCES auth.roles(id) ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT users_username_not_blank
    CHECK (length(trim(username)) >= 3),

  CONSTRAINT users_email_not_blank
    CHECK (length(trim(email)) >= 6)
);

CREATE UNIQUE INDEX users_username_unique_ci
  ON auth.users (lower(username))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX users_email_unique_ci
  ON auth.users (lower(email))
  WHERE deleted_at IS NULL;

CREATE INDEX users_deleted_at_idx
  ON auth.users (deleted_at);

CREATE INDEX users_role_id_idx
  ON auth.users (role_id);

CREATE TABLE auth.sessions (
  token TEXT PRIMARY KEY,
  data BYTEA NOT NULL,
  expiry TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_expiry_idx
  ON auth.sessions (expiry);

-- +goose Down
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.roles;
DROP SCHEMA IF EXISTS auth;