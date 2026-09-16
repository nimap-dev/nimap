package auth

import (
	"slices"
	"testing"
)

// wantGrants is the authorization policy spelled out by hand, so a change to
// rolesWithPermission has to be made twice, and the second time on purpose.
var wantGrants = map[int16][]Permission{
	RoleViewerID: {ReadRecords},
	RoleEditorID: {ReadRecords, WriteRecords},
	RoleAdminID:  {ReadRecords, WriteRecords, ManageUsers},
}

func TestAllows(t *testing.T) {
	for permission := range rolesWithPermission {
		for roleID, granted := range wantGrants {
			want := slices.Contains(granted, permission)
			if got := Allows(roleID, permission); got != want {
				t.Errorf("Allows(%d, %q) = %v, want %v", roleID, permission, got, want)
			}
		}
	}
}

// TestPolicyIsSpelledOut fails when a permission is added to the policy without
// deciding here which roles should hold it.
func TestPolicyIsSpelledOut(t *testing.T) {
	for permission := range rolesWithPermission {
		listed := false
		for _, granted := range wantGrants {
			if slices.Contains(granted, permission) {
				listed = true
				break
			}
		}
		if !listed {
			t.Errorf("permission %q is in the policy but no role holds it in wantGrants", permission)
		}
	}
}

func TestAllowsDeniesUnknown(t *testing.T) {
	for _, roleID := range []int16{-1, 0, 4, 99} {
		for permission := range rolesWithPermission {
			if Allows(roleID, permission) {
				t.Errorf("Allows(%d, %q) = true for an unknown role", roleID, permission)
			}
		}
	}

	for roleID := range wantGrants {
		for _, permission := range []Permission{"", "records:delete", "RECORDS:READ"} {
			if Allows(roleID, permission) {
				t.Errorf("Allows(%d, %q) = true for an unknown permission", roleID, permission)
			}
		}
	}
}

func TestPermissionsFor(t *testing.T) {
	for roleID, granted := range wantGrants {
		got := PermissionsFor(roleID)

		want := slices.Clone(granted)
		slices.Sort(want)

		if !slices.Equal(got, want) {
			t.Errorf("PermissionsFor(%d) = %v, want %v", roleID, got, want)
		}
		if !slices.IsSorted(got) {
			t.Errorf("PermissionsFor(%d) = %v, want it sorted", roleID, got)
		}
	}
}

func TestPermissionsForUnknownRole(t *testing.T) {
	got := PermissionsFor(0)
	if got == nil {
		t.Fatal("PermissionsFor(0) = nil, want an empty slice so it encodes as []")
	}
	if len(got) != 0 {
		t.Fatalf("PermissionsFor(0) = %v, want nothing", got)
	}
}

func TestRoleID(t *testing.T) {
	valid := map[string]int16{
		"viewer":    RoleViewerID,
		"editor":    RoleEditorID,
		"admin":     RoleAdminID,
		"Admin":     RoleAdminID,
		"EDITOR":    RoleEditorID,
		" viewer ":  RoleViewerID,
		"\tadmin\n": RoleAdminID,
	}
	for name, want := range valid {
		got, ok := RoleID(name)
		if !ok || got != want {
			t.Errorf("RoleID(%q) = %d, %v, want %d, true", name, got, ok, want)
		}
	}

	for _, name := range []string{"", " ", "root", "admins", "view er"} {
		if got, ok := RoleID(name); ok {
			t.Errorf("RoleID(%q) = %d, true, want not found", name, got)
		}
	}
}

func TestRoleName(t *testing.T) {
	for _, name := range RoleNames {
		id, ok := RoleID(name)
		if !ok {
			t.Errorf("RoleNames lists %q, which RoleID does not know", name)
			continue
		}

		got, ok := RoleName(id)
		if !ok || got != name {
			t.Errorf("RoleName(%d) = %q, %v, want %q, true", id, got, ok, name)
		}
	}

	for _, id := range []int16{-1, 0, 4} {
		if got, ok := RoleName(id); ok {
			t.Errorf("RoleName(%d) = %q, true, want not found", id, got)
		}
	}
}

// TestRoleNamesOrder holds RoleNames to its promise of least privileged first,
// and to naming every role there is.
func TestRoleNamesOrder(t *testing.T) {
	if len(RoleNames) != len(roleIDsByName) {
		t.Fatalf("RoleNames has %d roles, roleIDsByName has %d", len(RoleNames), len(roleIDsByName))
	}

	for i := 1; i < len(RoleNames); i++ {
		lower, higher := RoleNames[i-1], RoleNames[i]

		lowerGrants := PermissionsFor(roleIDsByName[lower])
		higherGrants := PermissionsFor(roleIDsByName[higher])

		if len(higherGrants) <= len(lowerGrants) {
			t.Errorf("RoleNames puts %q (%v) before %q (%v), want strictly more permissions later",
				lower, lowerGrants, higher, higherGrants)
		}
		for _, permission := range lowerGrants {
			if !slices.Contains(higherGrants, permission) {
				t.Errorf("%q holds %q but %q, listed after it, does not", lower, permission, higher)
			}
		}
	}
}
