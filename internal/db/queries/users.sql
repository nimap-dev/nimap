-- name: GetUserByUsername :one
SELECT u.id, u.username, u.email, u.password_hash, u.role_id, u.created_at, u.updated_at, r.name AS role
FROM auth.users u
JOIN auth.roles r ON r.id = u.role_id
WHERE lower(u.username) = lower($1);

-- name: GetUserByID :one
SELECT u.id, u.username, u.email, u.role_id, u.created_at, u.updated_at, r.name AS role
FROM auth.users u
JOIN auth.roles r ON r.id = u.role_id
WHERE u.id = $1;

-- name: CreateUser :one
INSERT INTO auth.users (username, email, password_hash, role_id)
VALUES ($1, $2, $3, $4)
RETURNING id, username, email, created_at, updated_at;

-- name: UpdateUserPasswordHash :exec
UPDATE auth.users
SET password_hash = $2,
    updated_at = now()
WHERE id = $1;

-- name: GetUserRoleID :one
SELECT role_id
FROM auth.users
WHERE id = $1;

-- name: GetUserPasswordHashByID :one
SELECT password_hash
FROM auth.users
WHERE id = $1;

-- name: UpdateUserAccount :one
UPDATE auth.users u
SET username = $2,
    email = $3,
    updated_at = now()
FROM auth.roles r
WHERE u.id = $1 AND r.id = u.role_id
RETURNING u.id, u.username, u.email, u.role_id, u.created_at, u.updated_at, r.name AS role;
