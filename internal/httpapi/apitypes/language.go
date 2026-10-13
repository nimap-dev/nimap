package apitypes

import "github.com/danielgtaylor/huma/v2"

// Language is the language the interface is shown in.
type Language string

const (
	LanguageEn Language = "en"
	LanguageCs Language = "cs"
)

var Languages = []Language{
	LanguageEn,
	LanguageCs,
}

func (Language) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(Languages))
	for i, language := range Languages {
		values[i] = string(language)
	}

	return &huma.Schema{
		Type:        huma.TypeString,
		Enum:        values,
		Description: "ISO 639-1 code of the interface language",
	}
}
