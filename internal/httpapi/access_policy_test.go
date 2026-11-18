package httpapi

import (
	"testing"

	"github.com/danielgtaylor/huma/v2"
	"github.com/go-chi/chi/v5"
	"github.com/nimap-dev/nimap/internal/auth"
)

type policy struct {
	public     bool
	permission auth.Permission
	// session is true for operations an API key may not call.
	session bool
}

var wantPolicy = map[string]policy{
	// auth
	"login":                      {public: true},
	"list-auth-providers":        {public: true},
	"logout":                     {public: true},
	"get-current-user":           {},
	"update-password":            {session: true},
	"update-account":             {session: true},
	"get-account-preferences":    {},
	"update-account-preferences": {},
	"list-api-keys":              {session: true},
	"create-api-key":             {session: true},
	"delete-api-key":             {session: true},

	// buildings
	"get-building":           {permission: auth.ReadRecords},
	"list-buildings":         {permission: auth.ReadRecords},
	"create-building":        {permission: auth.WriteRecords},
	"update-building":        {permission: auth.WriteRecords},
	"update-building-status": {permission: auth.WriteRecords},
	"delete-building":        {permission: auth.WriteRecords},

	// locations
	"get-location":           {permission: auth.ReadRecords},
	"list-locations":         {permission: auth.ReadRecords},
	"suggest-location":       {permission: auth.ReadRecords},
	"create-location":        {permission: auth.WriteRecords},
	"update-location":        {permission: auth.WriteRecords},
	"update-location-status": {permission: auth.WriteRecords},
	"delete-location":        {permission: auth.WriteRecords},

	// assets
	"get-asset-content":       {permission: auth.ReadRecords},
	"list-assets":             {permission: auth.ReadRecords},
	"upload-asset":            {permission: auth.WriteRecords},
	"delete-asset-attachment": {permission: auth.WriteRecords},

	// admin
	"list-users":           {permission: auth.ManageUsers, session: true},
	"get-user":             {permission: auth.ManageUsers, session: true},
	"create-user":          {permission: auth.ManageUsers, session: true},
	"update-user":          {permission: auth.ManageUsers, session: true},
	"update-user-role":     {permission: auth.ManageUsers, session: true},
	"reset-user-password":  {permission: auth.ManageUsers, session: true},
	"delete-user":          {permission: auth.ManageUsers, session: true},
	"unlink-user-identity": {permission: auth.ManageUsers, session: true},

	// device types
	"list-device-types": {permission: auth.ReadRecords},

	// device models
	"get-device-model":           {permission: auth.ReadRecords},
	"list-device-models":         {permission: auth.ReadRecords},
	"create-device-model":        {permission: auth.WriteRecords},
	"update-device-model":        {permission: auth.WriteRecords},
	"update-device-model-status": {permission: auth.WriteRecords},
	"delete-device-model":        {permission: auth.WriteRecords},

	// devices
	"get-device":           {permission: auth.ReadRecords},
	"list-devices":         {permission: auth.ReadRecords},
	"create-device":        {permission: auth.WriteRecords},
	"update-device":        {permission: auth.WriteRecords},
	"update-device-status": {permission: auth.WriteRecords},
	"delete-device":        {permission: auth.WriteRecords},

	// manufacturers
	"get-manufacturer":    {permission: auth.ReadRecords},
	"list-manufacturers":  {permission: auth.ReadRecords},
	"create-manufacturer": {permission: auth.WriteRecords},
	"update-manufacturer": {permission: auth.WriteRecords},
	"delete-manufacturer": {permission: auth.WriteRecords},
}

func TestEveryOperationIsGuarded(t *testing.T) {
	for id, op := range operations(t) {
		if wantPolicy[id].public {
			continue
		}

		_, needsPermission := requiresPermission(op)
		if !needsPermission && !requiresAuth(op) && !requiresSession(op) {
			t.Errorf("%s %s (%s) is reachable without a session: "+
				"give it requirePermissionMetaKey, or requireAuthMetaKey, "+
				"or list it as public in wantPolicy",
				op.Method, op.Path, id)
		}
	}
}

func TestOperationPolicies(t *testing.T) {
	ops := operations(t)
	for id, op := range ops {
		want, ok := wantPolicy[id]
		if !ok {
			t.Errorf("%s %s (%s) is registered but not listed in wantPolicy; "+
				"decide what it should require and add it",
				op.Method, op.Path, id)
			continue
		}

		permission, needsPermission := requiresPermission(op)
		got := policy{
			public:     !needsPermission && !requiresAuth(op) && !requiresSession(op),
			permission: permission,
			session:    requiresSession(op),
		}

		if got != want {
			t.Errorf("%s %s (%s) requires %s, want %s",
				op.Method, op.Path, id, describe(got), describe(want))
		}
	}

	for id := range wantPolicy {
		if _, ok := ops[id]; !ok {
			t.Errorf("wantPolicy lists %q, which no longer exists; "+
				"remove it, or restore the operation", id)
		}
	}
}

func describe(p policy) string {
	switch {
	case p.public:
		return "nothing (public)"
	case p.session && p.permission != "":
		return string(p.permission) + " with a session, not an API key"
	case p.session:
		return "a logged-in user with a session, not an API key"
	case p.permission != "":
		return string(p.permission)
	default:
		return "a logged-in user"
	}
}

func operations(t *testing.T) map[string]*huma.Operation {
	api := NewAPI(chi.NewMux(), "test", nil, nil, nil, nil)
	ops := map[string]*huma.Operation{}

	for path, item := range api.OpenAPI().Paths {
		for _, op := range []*huma.Operation{
			item.Get, item.Post, item.Put, item.Patch,
			item.Delete, item.Head, item.Options, item.Trace,
		} {
			if op == nil {
				continue
			}

			if op.OperationID == "" {
				t.Errorf("%s %s has no operation id", op.Method, path)
				continue
			}

			if other, ok := ops[op.OperationID]; ok {
				t.Errorf("operation id %q is used twice: %s %s and %s %s",
					op.OperationID, other.Method, other.Path, op.Method, op.Path)
				continue
			}
			ops[op.OperationID] = op
		}
	}

	return ops
}
