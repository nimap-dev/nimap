// Package text holds the small string helpers shared between the HTTP API and
// the command line.
package text

import (
	"fmt"
	"strings"
)

// Plural writes a count together with the noun that goes with it, so a message
// can say "1 location" rather than the parenthesised "(s)".
func Plural[T ~int | ~int64](count T, one string, many string) string {
	if count == 1 {
		return fmt.Sprintf("%d %s", count, one)
	}

	return fmt.Sprintf("%d %s", count, many)
}

// TrimmedOrNil trims an optional text field and treats a blank one as absent,
// so an empty form input never reaches a not-blank CHECK constraint.
func TrimmedOrNil(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}
