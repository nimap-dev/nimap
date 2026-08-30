.PHONY: run
run:
	go run ./cmd/nimap

# up, down and status go through the binary
.PHONY: migrate-up
migrate-up:
	go run ./cmd/nimap migrate up

.PHONY: migrate-down
migrate-down:
	go run ./cmd/nimap migrate down

.PHONY: migrate-status
migrate-status:
	go run ./cmd/nimap migrate status

# Regenerates everything the `generated` CI job checks for staleness.
.PHONY: generate
generate:
	sqlc generate
	pnpm --dir web api-generate
	pnpm --dir web generate-routes

.PHONY: fmt
fmt:
	gofmt -w .
	pnpm --dir web format

# Mirrors the `go` CI job.
.PHONY: check
check:
	@test -z "$$(gofmt -l .)" || { gofmt -l .; echo "run: make fmt"; exit 1; }
	go vet ./...
	go build ./...
	go test -race ./...

# Mirrors the `web` CI job.
.PHONY: web-check
web-check:
	pnpm --dir web lint
	pnpm --dir web check
	pnpm --dir web typecheck
	pnpm --dir web build
