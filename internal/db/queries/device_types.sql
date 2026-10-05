-- name: ListDeviceTypes :many
SELECT
  id,
  code,
  name,
  icon,
  color,
  sort_order,
  created_at,
  updated_at
FROM device_types
ORDER BY sort_order, name;
