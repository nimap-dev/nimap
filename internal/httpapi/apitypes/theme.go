package apitypes

import "github.com/danielgtaylor/huma/v2"

// Theme is the colour scheme of the interface.
type Theme string

const (
	ThemeSystem Theme = "system"
	ThemeLight  Theme = "light"
	ThemeDark   Theme = "dark"
)

var Themes = []Theme{
	ThemeSystem,
	ThemeLight,
	ThemeDark,
}

func (Theme) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(Themes))
	for i, theme := range Themes {
		values[i] = string(theme)
	}

	return &huma.Schema{
		Type:        huma.TypeString,
		Enum:        values,
		Description: "system follows the operating system's light or dark setting",
	}
}
