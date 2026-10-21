-- name: GetUserByIdentity :one
SELECT u.id, u.username, u.email, u.role_id, u.created_at, u.updated_at, r.name AS role
FROM auth.user_identities i
JOIN auth.users u ON u.id = i.user_id
JOIN auth.roles r ON r.id = u.role_id
WHERE i.issuer = $1 AND i.subject = $2;

-- name: CreateUserIdentity :exec
INSERT INTO auth.user_identities (user_id, issuer, subject, email)
VALUES ($1, $2, $3, $4);

-- name: TouchUserIdentity :exec
UPDATE auth.user_identities
SET email = $3,
    last_login_at = now()
WHERE issuer = $1 AND subject = $2;

-- name: ListUserIdentities :many
SELECT id, issuer, subject, email, created_at, last_login_at
FROM auth.user_identities
WHERE user_id = $1
ORDER BY created_at;

-- name: ListAllUserIdentities :many
SELECT user_id, id, issuer, subject, email, created_at, last_login_at
FROM auth.user_identities
ORDER BY user_id, created_at;

-- name: DeleteUserIdentity :execrows
DELETE FROM auth.user_identities
WHERE id = $1 AND user_id = $2;
