package httpapi

import (
	"github.com/danielgtaylor/huma/v2"

	"github.com/nimap-dev/nimap/internal/auth"
)

// Role is a role name on the wire. The values come from the policy in
// internal/auth rather than being restated here, so the schema the clients are
// generated against cannot drift from the roles the server will accept.
type Role string

func (Role) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(auth.RoleNames))
	for i, name := range auth.RoleNames {
		values[i] = name
	}

	return &huma.Schema{
		Type: huma.TypeString,
		Enum: values,
	}
}
