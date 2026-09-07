package media

type Variant string

const (
	VariantOriginal Variant = "original"
	VariantThumb    Variant = "thumb"
	VariantPreview  Variant = "preview"
)

func (v Variant) ContentType() (string, bool) {
	switch v {
	case VariantThumb, VariantPreview:
		return "image/jpeg", true
	default:
		return "", false
	}
}

func (v Variant) IsDerived() bool {
	return v != VariantOriginal
}
