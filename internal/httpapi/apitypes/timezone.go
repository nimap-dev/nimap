package apitypes

import "github.com/danielgtaylor/huma/v2"

// Timezone is an IANA time zone. Only a curated set is offered, at least one
// zone for every UTC offset, mirroring the auth.timezone enum in the database.
type Timezone string

var Timezones = []Timezone{
	"Etc/GMT+12",
	"Pacific/Pago_Pago",
	"Pacific/Honolulu",
	"Pacific/Marquesas",
	"America/Anchorage",
	"America/Los_Angeles",
	"America/Denver",
	"America/Phoenix",
	"America/Chicago",
	"America/Mexico_City",
	"America/New_York",
	"America/Bogota",
	"America/Halifax",
	"America/Caracas",
	"America/St_Johns",
	"America/Sao_Paulo",
	"America/Argentina/Buenos_Aires",
	"America/Noronha",
	"Atlantic/Azores",
	"Atlantic/Cape_Verde",
	"UTC",
	"Europe/London",
	"Europe/Lisbon",
	"Africa/Abidjan",
	"Europe/Prague",
	"Europe/Berlin",
	"Europe/Paris",
	"Europe/Warsaw",
	"Africa/Lagos",
	"Europe/Athens",
	"Europe/Kyiv",
	"Europe/Helsinki",
	"Africa/Cairo",
	"Africa/Johannesburg",
	"Europe/Istanbul",
	"Europe/Moscow",
	"Asia/Riyadh",
	"Africa/Nairobi",
	"Asia/Tehran",
	"Asia/Dubai",
	"Asia/Baku",
	"Asia/Kabul",
	"Asia/Karachi",
	"Asia/Tashkent",
	"Asia/Kolkata",
	"Asia/Kathmandu",
	"Asia/Dhaka",
	"Asia/Almaty",
	"Asia/Yangon",
	"Asia/Bangkok",
	"Asia/Jakarta",
	"Asia/Shanghai",
	"Asia/Singapore",
	"Australia/Perth",
	"Australia/Eucla",
	"Asia/Tokyo",
	"Asia/Seoul",
	"Australia/Darwin",
	"Australia/Adelaide",
	"Australia/Brisbane",
	"Australia/Sydney",
	"Pacific/Port_Moresby",
	"Australia/Lord_Howe",
	"Pacific/Noumea",
	"Pacific/Auckland",
	"Pacific/Fiji",
	"Pacific/Chatham",
	"Pacific/Tongatapu",
	"Pacific/Apia",
	"Pacific/Kiritimati",
}

func (Timezone) Schema(r huma.Registry) *huma.Schema {
	values := make([]any, len(Timezones))
	for i, timezone := range Timezones {
		values[i] = string(timezone)
	}

	return &huma.Schema{
		Type:        huma.TypeString,
		Enum:        values,
		Description: "IANA time zone name",
	}
}
