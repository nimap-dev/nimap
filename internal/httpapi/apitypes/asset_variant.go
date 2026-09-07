package apitypes

import "github.com/danielgtaylor/huma/v2"

type AssetVariant string

const (
	AssetVariantOriginal AssetVariant = "original"
	AssetVariantThumb    AssetVariant = "thumb"
	AssetVariantPreview  AssetVariant = "preview"
)

var AssetVariants = []AssetVariant{
	AssetVariantOriginal,
	AssetVariantThumb,
	AssetVariantPreview,
}

func (AssetVariant) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(AssetVariants))
	for i, variant := range AssetVariants {
		values[i] = string(variant)
	}

	return &huma.Schema{
		Type: huma.TypeString,
		Enum: values,
	}
}
