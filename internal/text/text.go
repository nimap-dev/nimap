// Package text holds the small string helpers shared between the HTTP API and
// the command line.
package text

import "fmt"

// Plural writes a count together with the noun that goes with it, so a message
// can say "1 location" rather than the parenthesised "(s)".
func Plural[T ~int | ~int64](count T, one string, many string) string {
	if count == 1 {
		return fmt.Sprintf("%d %s", count, one)
	}

	return fmt.Sprintf("%d %s", count, many)
}
