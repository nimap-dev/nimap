# nimap

[![ci](https://github.com/nimap-dev/nimap/actions/workflows/ci.yml/badge.svg)](https://github.com/nimap-dev/nimap/actions/workflows/ci.yml)
[![go](https://img.shields.io/github/go-mod/go-version/nimap-dev/nimap)](go.mod)
[![license](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![docs](https://img.shields.io/badge/docs-nimap--dev.github.io%2Fnimap-blue)](https://nimap-dev.github.io/nimap/)

nimap is a map-oriented system for documenting physical network and technical
infrastructure. The goal is to answer two questions: where a device physically
is, and which route the cable to it takes.

## Documentation

User and administrator documentation is at
**[nimap-dev.github.io/nimap](https://nimap-dev.github.io/nimap/)**:

- [Installation](https://nimap-dev.github.io/nimap/admin/installation/): running
  nimap with Docker Compose and creating the first administrator
- [Configuration](https://nimap-dev.github.io/nimap/reference/configuration/):
  all `SERVICE_*` environment variables

## Status

> Early development. Not ready to be used: the feature set is thin, the data
> model still changes, and nothing here is meant to be deployed or filled with
> real data.

Implemented so far:

- geographic map as the entry screen, address search
- locations
- buildings with a polygon drawn on the map, lifecycle status, filtering
- user accounts with viewer, editor and admin roles
- REST API with a generated OpenAPI document

## Stack

Go backend (huma, chi, pgx, sqlc, goose) on PostgreSQL with PostGIS. React
frontend (Vite, TanStack Router and Query, MapLibre, Tailwind) built into the
binary as embedded assets, so the deployment is a single container.

## Layout

| Path               | Contains                                            |
| ------------------ | --------------------------------------------------- |
| `cmd/nimap`        | binary: server, `new-user`, `migrate` and `openapi` |
| `internal/httpapi` | HTTP handlers, one file per resource                |
| `internal/db`      | migrations, sqlc queries and generated code         |
| `internal/auth`    | sessions, password hashing, roles and permissions   |
| `internal/config`  | configuration struct                                |
| `internal/logging` | logger setup                                        |
| `static`           | embedded frontend build                             |
| `web/src`          | frontend: routes, components, generated API client  |

## Requirements

PostgreSQL 18 with PostGIS. 18 is a hard minimum: the schema uses the built-in
`uuidv7()` function, which older versions do not have. The compose file uses
`postgis/postgis:18-3.6-alpine`.

Building from source additionally needs Go 1.26 and Node 26 with pnpm.

## Development

See [Requirements](#requirements) for versions. `goose` and `sqlc` are only
needed when working on migrations or queries.

```bash
cp .env.example .env
docker compose up -d db
make run
```

`static/dist` holds a committed placeholder page, which the binary embeds, so
the backend runs without building the frontend first. The Docker build replaces
it with the real one.

The frontend runs on its own with hot reload and proxies `/api` to port 8080:

```bash
pnpm --dir web install
pnpm --dir web dev
```

The dev frontend is on http://localhost:3000.

## Generated code

Three things are generated and committed. CI fails if any of them is out of
date.

```bash
sqlc generate                     # internal/db/gen from queries and migrations
pnpm --dir web api-generate       # OpenAPI document and the typed API client
pnpm --dir web generate-routes    # web/src/routeTree.gen.ts
```

## Migrations

Migrations are embedded in the binary and run on startup unless
`SERVICE_AUTO_MIGRATE=false`. To drive them by hand, in a container as well as
locally:

```bash
nimap migrate up
nimap migrate status
nimap migrate down      # rolls back one migration
```

`migrate down` asks for confirmation when `SERVICE_ENV=production`; `--yes`
skips the prompt for non-interactive use.

## License

AGPL-3.0. See [LICENSE](LICENSE).
