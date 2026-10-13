package apitypes_test

import (
	"slices"
	"testing"
	"time"
	_ "time/tzdata"

	"github.com/nimap-dev/nimap/internal/db/gen"
	"github.com/nimap-dev/nimap/internal/httpapi/apitypes"
)

// The enums backed by a database type are written out twice, once in the
// migrations and once here for the API schema. These tests keep the two lists
// in step, so a value added on one side only cannot slip through to a request
// the database then refuses.

func assertSameValues[A, B ~string](t *testing.T, name string, api []A, db []B) {
	t.Helper()

	apiValues := make([]string, len(api))
	for i, value := range api {
		apiValues[i] = string(value)
	}

	dbValues := make([]string, len(db))
	for i, value := range db {
		dbValues[i] = string(value)
	}

	if !slices.Equal(apiValues, dbValues) {
		t.Errorf("%s: api values %v differ from database values %v", name, apiValues, dbValues)
	}
}

func TestEnumsMatchDatabase(t *testing.T) {
	assertSameValues(t, "asset type", apitypes.AssetTypes, gen.AllAssetTypeValues())
	assertSameValues(t, "lifecycle status", apitypes.LifecycleStatuses, gen.AllLifecycleStatusValues())
	assertSameValues(t, "mounting type", apitypes.MountingTypes, gen.AllMountingTypeValues())
	assertSameValues(t, "poe standard", apitypes.PoeStandards, gen.AllPoeStandardValues())
	assertSameValues(t, "language", apitypes.Languages, gen.AllAuthLanguageValues())
	assertSameValues(t, "date format", apitypes.DateFormats, gen.AllAuthDateFormatValues())
	assertSameValues(t, "time format", apitypes.TimeFormats, gen.AllAuthTimeFormatValues())
	assertSameValues(t, "theme", apitypes.Themes, gen.AllAuthThemeValues())
	assertSameValues(t, "timezone", apitypes.Timezones, gen.AllAuthTimezoneValues())
}

func TestTimezonesAreKnown(t *testing.T) {
	for _, timezone := range apitypes.Timezones {
		if _, err := time.LoadLocation(string(timezone)); err != nil {
			t.Errorf("timezone %q: %v", timezone, err)
		}
	}
}
