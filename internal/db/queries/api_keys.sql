-- name: GetUserByAPIKey :one
SELECT k.id, k.user_id, u.role_id, k.last_used_at
FROM auth.api_keys k
JOIN auth.users u ON u.id = k.user_id
WHERE k.token_hash = sqlc.arg(token_hash)
  AND (k.expires_at IS NULL OR k.expires_at > now());

-- name: TouchAPIKey :exec
UPDATE auth.api_keys
SET last_used_at = now()
WHERE id = sqlc.arg(id);

-- name: ListUserAPIKeys :many
SELECT id, name, prefix, created_at, last_used_at, expires_at
FROM auth.api_keys
WHERE user_id = sqlc.arg(user_id)
ORDER BY created_at DESC;

-- name: CreateAPIKey :one
INSERT INTO auth.api_keys (user_id, name, prefix, token_hash, expires_at)
VALUES (
  sqlc.arg(user_id),
  sqlc.arg(name),
  sqlc.arg(prefix),
  sqlc.arg(token_hash),
  sqlc.narg(expires_at)
)
RETURNING id, name, prefix, created_at, last_used_at, expires_at;

-- name: DeleteAPIKey :execrows
DELETE FROM auth.api_keys
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id);
