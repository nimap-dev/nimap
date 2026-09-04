package apitypes

import "github.com/danielgtaylor/huma/v2"

type AssetType string

const (
	AssetTypeImage    AssetType = "image"
	AssetTypeVideo    AssetType = "video"
	AssetTypeAudio    AssetType = "audio"
	AssetTypeDocument AssetType = "document"
	AssetTypeOther    AssetType = "other"
)

var AssetTypes = []AssetType{
	AssetTypeImage,
	AssetTypeVideo,
	AssetTypeAudio,
	AssetTypeDocument,
	AssetTypeOther,
}

func (AssetType) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(AssetTypes))
	for i, assetType := range AssetTypes {
		values[i] = string(assetType)
	}

	return &huma.Schema{
		Type: huma.TypeString,
		Enum: values,
	}
}
