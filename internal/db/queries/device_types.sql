-- name: ListDeviceTypes :many
SELECT
  sqlc.embed(device_types),
  -- What the next generated code would be right now; a preview only, the
  -- number is taken by AllocateDeviceCode when a device is created.
  device_code_format(code_prefix, device_code_first_free(code_prefix, code_next))::text AS next_code
FROM device_types
ORDER BY sort_order, name;
