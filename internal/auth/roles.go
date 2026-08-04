package auth

import "strings"

// Role ids matching the auth.roles lookup table seeded by migration 000002.
// These values are referenced from application code and must never change.
const (
	RoleViewerID int16 = 1
	RoleEditorID int16 = 2
	RoleAdminID  int16 = 3
)

var roleIDsByName = map[string]int16{
	"viewer": RoleViewerID,
	"editor": RoleEditorID,
	"admin":  RoleAdminID,
}

// RoleID maps a role name to its lookup id. ok is false for unknown names.
func RoleID(name string) (id int16, ok bool) {
	id, ok = roleIDsByName[strings.ToLower(strings.TrimSpace(name))]
	return id, ok
}
