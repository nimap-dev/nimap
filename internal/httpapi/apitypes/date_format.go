package apitypes

import "github.com/danielgtaylor/huma/v2"

// DateFormat is how calendar dates are written for a user.
type DateFormat string

const (
	DateFormatAuto     DateFormat = "auto"
	DateFormatDmyDot   DateFormat = "dmy_dot"
	DateFormatIso      DateFormat = "iso"
	DateFormatMdySlash DateFormat = "mdy_slash"
	DateFormatDMmmY    DateFormat = "d_mmm_y"
	DateFormatMmmDY    DateFormat = "mmm_d_y"
)

var DateFormats = []DateFormat{
	DateFormatAuto,
	DateFormatDmyDot,
	DateFormatIso,
	DateFormatMdySlash,
	DateFormatDMmmY,
	DateFormatMmmDY,
}

func (DateFormat) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(DateFormats))
	for i, format := range DateFormats {
		values[i] = string(format)
	}

	return &huma.Schema{
		Type:        huma.TypeString,
		Enum:        values,
		Description: "auto follows the language, dmy_dot is 31.12.2026, iso is 2026-12-31, mdy_slash is 12/31/2026, d_mmm_y is 31 Dec 2026 and mmm_d_y is Dec 31, 2026; month names follow the language",
	}
}
