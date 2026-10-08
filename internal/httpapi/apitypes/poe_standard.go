package apitypes

import "github.com/danielgtaylor/huma/v2"

// PoeStandard is the IEEE 802.3 PoE standard a port speaks, or passive PoE
// that does not negotiate at all.
type PoeStandard string

const (
	PoeStandardAf      PoeStandard = "af"
	PoeStandardAt      PoeStandard = "at"
	PoeStandardBt      PoeStandard = "bt"
	PoeStandardPassive PoeStandard = "passive"
)

var PoeStandards = []PoeStandard{
	PoeStandardAf,
	PoeStandardAt,
	PoeStandardBt,
	PoeStandardPassive,
}

func (PoeStandard) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(PoeStandards))
	for i, standard := range PoeStandards {
		values[i] = string(standard)
	}

	return &huma.Schema{
		Type:        huma.TypeString,
		Enum:        values,
		Description: "802.3af (PoE), 802.3at (PoE+), 802.3bt (PoE++) or passive PoE",
	}
}
