package httpapi

// plural picks the noun that goes with a count, so an error can say "1 location"
// without the parenthesised "(s)" that reads like a form nobody proofread.
func plural(count int64, one string, many string) string {
	if count == 1 {
		return one
	}

	return many
}
