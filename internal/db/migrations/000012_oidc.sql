-- +goose Up

ALTER TABLE auth.users
  ALTER COLUMN password_hash DROP NOT NULL;

-- Links a user to an account at an OIDC provider. The (issuer, subject) pair
-- is the stable identity the provider guarantees
CREATE TABLE auth.user_identities (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_identities_issuer_subject_unique
    UNIQUE (issuer, subject)
);

CREATE INDEX user_identities_user_id_idx
  ON auth.user_identities (user_id);

-- +goose Down
DROP TABLE IF EXISTS auth.user_identities;

-- '!' is not a valid PHC string, so these users simply cannot log in with a
-- password until an admin resets it.
UPDATE auth.users SET password_hash = '!' WHERE password_hash IS NULL;

ALTER TABLE auth.users
  ALTER COLUMN password_hash SET NOT NULL;
