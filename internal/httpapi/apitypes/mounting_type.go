package apitypes

import "github.com/danielgtaylor/huma/v2"

type MountingType string

const (
	MountingTypeRack     MountingType = "rack"
	MountingTypeWall     MountingType = "wall"
	MountingTypeDesktop  MountingType = "desktop"
	MountingTypeDinRail  MountingType = "din_rail"
	MountingTypeCeiling  MountingType = "ceiling"
	MountingTypePole     MountingType = "pole"
	MountingTypeEmbedded MountingType = "embedded"
	MountingTypeOther    MountingType = "other"
)

var MountingTypes = []MountingType{
	MountingTypeRack,
	MountingTypeWall,
	MountingTypeDesktop,
	MountingTypeDinRail,
	MountingTypeCeiling,
	MountingTypePole,
	MountingTypeEmbedded,
	MountingTypeOther,
}

func (MountingType) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(MountingTypes))
	for i, MountingType := range MountingTypes {
		values[i] = string(MountingType)
	}

	return &huma.Schema{
		Type: huma.TypeString,
		Enum: values,
	}
}
