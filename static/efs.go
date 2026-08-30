package static

import (
	"embed"
	"io/fs"
)

// dist holds the built frontend. The `all:` prefix is required, because go:embed
// skips files beginning with `.` or `_` when it walks a matched directory, and
// `all:` disables that. TanStack Router emits pathless-layout chunks
// (_authenticated, _map, _nav), so they would be omitted by default.
//
//go:embed all:dist
var dist embed.FS

// Assets is FS rooted at dist, so paths line up with the URLs the browser asks for.
var Assets = func() fs.FS {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		panic(err)
	}
	return sub
}()
