.PHONY: run migrate-up migrate-down migrate-status generate fmt check web-check

run:
	go run ./cmd/nimap

# up, down and status go through the binary
migrate-up:
	go run ./cmd/nimap migrate up

migrate-down:
	go run ./cmd/nimap migrate down

migrate-status:
	go run ./cmd/nimap migrate status

# Regenerates everything the `generated` CI job checks for staleness.
generate:
	sqlc generate
	pnpm --dir web api-generate
	pnpm --dir web generate-routes

fmt:
	gofmt -w .
	pnpm --dir web format

# Mirrors the `go` CI job.
check:
	@test -z "$$(gofmt -l .)" || { gofmt -l .; echo "run: make fmt"; exit 1; }
	go vet ./...
	go build ./...
	go test -race ./...

# Mirrors the `web` CI job.
web-check:
	pnpm --dir web lint
	pnpm --dir web check
	pnpm --dir web typecheck
	pnpm --dir web build