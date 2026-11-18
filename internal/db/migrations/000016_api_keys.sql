-- +goose Up

CREATE TABLE auth.api_keys (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  token_hash BYTEA NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  CONSTRAINT api_key_name_not_blank
    CHECK (length(trim(name)) > 0),
  CONSTRAINT api_key_token_hash_length
    CHECK (octet_length(token_hash) = 64)
);

CREATE UNIQUE INDEX api_key_token_hash_unique
  ON auth.api_keys (token_hash);
CREATE INDEX api_key_user_id_idx
  ON auth.api_keys (user_id);

-- +goose Down
DROP TABLE IF EXISTS auth.api_keys;
