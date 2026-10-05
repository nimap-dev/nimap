package apitypes

import (
	"encoding/json"
	"time"

	"github.com/danielgtaylor/huma/v2"
)

// Date is a calendar day with no time of day, written YYYY-MM-DD. A plain
// time.Time would go over the wire as a midnight UTC timestamp and be
// documented as a date-time, which a day of purchase is not.
type Date struct {
	time.Time
}

func (Date) Schema(r huma.Registry) *huma.Schema {
	return &huma.Schema{
		Type:   huma.TypeString,
		Format: "date",
	}
}

func (d Date) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.Format(time.DateOnly))
}

func (d *Date) UnmarshalJSON(data []byte) error {
	var raw string
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	parsed, err := time.Parse(time.DateOnly, raw)
	if err != nil {
		return err
	}

	d.Time = parsed

	return nil
}

// DateFromTime wraps an optional day read from the database for a response.
func DateFromTime(t *time.Time) *Date {
	if t == nil {
		return nil
	}

	return &Date{Time: *t}
}

// TimeOrNil unwraps an optional day from a request for the generated queries.
func (d *Date) TimeOrNil() *time.Time {
	if d == nil {
		return nil
	}

	t := d.Time

	return &t
}
