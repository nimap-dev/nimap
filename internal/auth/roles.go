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

// RoleNames lists every role, least privileged first, for the places that have
// to offer a choice of them rather than ask about a particular one.
var RoleNames = []string{"viewer", "editor", "admin"}

// RoleName maps a role id back to its name. ok is false for unknown ids.
func RoleName(id int16) (name string, ok bool) {
	for name, roleID := range roleIDsByName {
		if roleID == id {
			return name, true
		}
	}

	return "", false
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

// PermissionsFor lists everything a role may do. It exists so a client can be
// told what to offer without shipping its own copy of the policy.
func PermissionsFor(roleID int16) []Permission {
	granted := make([]Permission, 0, len(rolesWithPermission))

	for permission := range rolesWithPermission {
		if Allows(roleID, permission) {
			granted = append(granted, permission)
		}
	}

	slices.Sort(granted)

	return granted
}
