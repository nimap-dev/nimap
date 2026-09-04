package apitypes

import "github.com/danielgtaylor/huma/v2"

type LifecycleStatus string

const (
	LifecycleStatusPlanned        LifecycleStatus = "planned"
	LifecycleStatusActive         LifecycleStatus = "active"
	LifecycleStatusDecommissioned LifecycleStatus = "decommissioned"
	LifecycleStatusArchived       LifecycleStatus = "archived"
)

var ActiveLifecycleStatuses = []LifecycleStatus{
	LifecycleStatusPlanned,
	LifecycleStatusActive,
}

var LifecycleStatuses = []LifecycleStatus{
	LifecycleStatusPlanned,
	LifecycleStatusActive,
	LifecycleStatusDecommissioned,
	LifecycleStatusArchived,
}

func (LifecycleStatus) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(LifecycleStatuses))
	for i, status := range LifecycleStatuses {
		values[i] = string(status)
	}

	return &huma.Schema{
		Type: huma.TypeString,
		Enum: values,
	}
}

func LifecycleStatusStrings(statuses []LifecycleStatus) []string {
	out := make([]string, len(statuses))
	for i, status := range statuses {
		out[i] = string(status)
	}

	return out
}
