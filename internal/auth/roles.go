package auth

import (
	"slices"
	"strings"
)

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

// Permission is something a request may be allowed to do. Operations are
// registered against one of these rather than against a role, so adding a role
// never means revisiting the handlers.
type Permission string

const (
	// ReadRecords covers looking at buildings and locations.
	ReadRecords Permission = "records:read"

	// WriteRecords covers creating, editing, restatusing and deleting them.
	WriteRecords Permission = "records:write"

	// ManageUsers covers accounts and role assignment.
	ManageUsers Permission = "users:manage"
)

// rolesWithPermission is the entire authorization policy: a role may do exactly
// what names it here. A role listed nowhere can do nothing, so the failure mode
// is a locked door rather than an open one.
var rolesWithPermission = map[Permission][]int16{
	ReadRecords:  {RoleViewerID, RoleEditorID, RoleAdminID},
	WriteRecords: {RoleEditorID, RoleAdminID},
	ManageUsers:  {RoleAdminID},
}

// Allows reports whether the role holds the permission.
func Allows(roleID int16, permission Permission) bool {
	return slices.Contains(rolesWithPermission[permission], roleID)
}
