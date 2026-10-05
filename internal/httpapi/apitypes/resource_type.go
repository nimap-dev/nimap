package apitypes

import "github.com/danielgtaylor/huma/v2"

// ResourceType names a thing a file can be attached to.
type ResourceType string

const (
	ResourceTypeLocation    ResourceType = "location"
	ResourceTypeBuilding    ResourceType = "building"
	ResourceTypeDeviceModel ResourceType = "device_model"
)

var ResourceTypes = []ResourceType{
	ResourceTypeLocation,
	ResourceTypeBuilding,
	ResourceTypeDeviceModel,
}

func (ResourceType) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(ResourceTypes))
	for i, resourceType := range ResourceTypes {
		values[i] = string(resourceType)
	}

	return &huma.Schema{
		Type: huma.TypeString,
		Enum: values,
	}
}
