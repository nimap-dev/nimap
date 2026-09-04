package apitypes

import "strings"

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
		Street:  trimmedOrNil(a.Street),
		City:    trimmedOrNil(a.City),
		Zip:     trimmedOrNil(a.Zip),
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

func trimmedOrNil(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func upperOrNil(value *string) *string {
	trimmed := trimmedOrNil(value)
	if trimmed == nil {
		return nil
	}

	upper := strings.ToUpper(*trimmed)

	return &upper
}
