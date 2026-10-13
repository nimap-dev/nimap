package apitypes

import "github.com/danielgtaylor/huma/v2"

// TimeFormat is the clock times are written in for a user.
type TimeFormat string

const (
	TimeFormatAuto TimeFormat = "auto"
	TimeFormatH24  TimeFormat = "h24"
	TimeFormatH12  TimeFormat = "h12"
)

var TimeFormats = []TimeFormat{
	TimeFormatAuto,
	TimeFormatH24,
	TimeFormatH12,
}

func (TimeFormat) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(TimeFormats))
	for i, format := range TimeFormats {
		values[i] = string(format)
	}

	return &huma.Schema{
		Type:        huma.TypeString,
		Enum:        values,
		Description: "auto follows the language, h24 is 14:30 and h12 is 2:30 PM",
	}
}
