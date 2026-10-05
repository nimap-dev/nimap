package apitypes

import (
	"strings"

	"github.com/nimap-dev/nimap/internal/text"
)

// Address is the postal address of a building or a location. Every part stands
// on its own.
type Address struct {
	Street  *string `json:"street,omitempty"`
	City    *string `json:"city,omitempty"`
	Zip     *string `json:"zip,omitempty" doc:"Postal code, in whatever shape the country writes it"`
	Country *string `json:"country,omitempty" pattern:"^[A-Za-z]{2}$" doc:"ISO 3166-1 alpha-2 country code"`
}

func (a *Address) Normalized() Address {
	if a == nil {
		return Address{}
	}

	return Address{
		Street:  text.TrimmedOrNil(a.Street),
		City:    text.TrimmedOrNil(a.City),
		Zip:     text.TrimmedOrNil(a.Zip),
		Country: upperOrNil(a.Country),
	}
}

// orNil drops an address that is empty all the way through, so clients get no
// address at all rather than an object of four nulls.
func (a Address) OrNil() *Address {
	if a.Street == nil &&
		a.City == nil &&
		a.Zip == nil &&
		a.Country == nil {
		return nil
	}

	return &a
}

func upperOrNil(value *string) *string {
	trimmed := text.TrimmedOrNil(value)
	if trimmed == nil {
		return nil
	}

	upper := strings.ToUpper(*trimmed)

	return &upper
}
