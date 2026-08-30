package httpapi

import (
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/nimap-dev/nimap/static"
)

// RegisterFrontend serves the embedded Vite build as a single-page app.
//
// It claims "/*", so it must be registered after every real route. Any path that
// does not match an embedded file is answered with index.html and a 200 so the
// client router can resolve it. Paths under /api and /assets are excluded and
// 404 normally.
func RegisterFrontend(r chi.Router) {
	index, err := fs.ReadFile(static.Assets, "index.html")
	if err != nil {
		panic("frontend not built: " + err.Error())
	}
	fileServer := http.FileServer(http.FS(static.Assets))

	r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		p := strings.TrimPrefix(path.Clean(req.URL.Path), "/")

		// The API is registered before this handler, so anything still under
		// /api is a real miss and must not be handed the SPA shell, which would
		// turn a 404 into a 200 full of HTML.
		if p == "api" || strings.HasPrefix(p, "api/") {
			http.NotFound(w, req)
			return
		}

		if req.Method != http.MethodGet && req.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Everything under assets/ is generated and content-hashed, so a miss is
		// a build bug.
		if p == "assets" || strings.HasPrefix(p, "assets/") {
			if !isBuildFile(p) {
				http.NotFound(w, req)
				return
			}
			// Vite content-hashes everything under assets/.
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			fileServer.ServeHTTP(w, req)
			return
		}

		// Anything else Vite drops at the root of dist: favicons, robots.txt.
		if isBuildFile(p) {
			fileServer.ServeHTTP(w, req)
			return
		}

		// A client-side route. no-store rather than no-cache because embed.FS
		// reports a no modification time, so neither Last-Modified nor ETag
		// get emitted.
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(index)
	}))
}

// isBuildFile reports whether p names a regular file in the build. Directories
// are excluded deliberately: http.FileServer answers a directory with a
// browsable index, which would expose /assets/ as a listing of every chunk.
func isBuildFile(p string) bool {
	info, err := fs.Stat(static.Assets, p)
	return err == nil && !info.IsDir()
}
