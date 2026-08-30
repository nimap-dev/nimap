# nimap

nimap is a map-oriented system for documenting physical network and technical
infrastructure. The goal is to answer two questions: where a device physically
is, and which route the cable to it takes.

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

| Path               | Contains                                           |
| ------------------ | -------------------------------------------------- |
| `cmd/nimap`        | binary: server, `new_user` and `openapi` commands  |
| `internal/httpapi` | HTTP handlers, one file per resource               |
| `internal/db`      | migrations, sqlc queries and generated code        |
| `internal/auth`    | sessions, password hashing, roles and permissions  |
| `internal/config`  | configuration struct                               |
| `internal/logging` | logger setup                                       |
| `static`           | embedded frontend build                            |
| `web/src`          | frontend: routes, components, generated API client |

## Running

```bash
docker compose up
```

The application is on http://localhost:8080, the database on 5432. Migrations
run on startup.

Create the first account:

```bash
docker compose exec nimap /nimap new_user --username admin --email admin@example.com --role admin
```

## Development

Requires Go, Node with pnpm, and a database. `goose` and `sqlc` are only needed
when working on migrations or queries.

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

## Configuration

All settings are environment variables with a `SERVICE_` prefix, or flags on
the binary. See `.env.example` for the full list and `nimap --help` for the
authoritative version.

| Variable               | Default        | Meaning                                                 |
| ---------------------- | -------------- | ------------------------------------------------------- |
| `SERVICE_DATABASE_URL` | required       | PostgreSQL connection string                            |
| `SERVICE_PORT`         | `8080`         | HTTP port                                               |
| `SERVICE_ENV`          | `development`  | `development` or `production`, controls cookie security |
| `SERVICE_MEDIA_DIR`    | `./data/media` | directory for uploaded files                            |
| `SERVICE_LOG_LEVEL`    | `info`         | `debug`, `info`, `warn`, `error`                        |
| `SERVICE_LOG_FORMAT`   | `text`         | `text` or `json`                                        |
| `SERVICE_AUTO_MIGRATE` | `true`         | run pending migrations on startup                       |

## Generated code

Three things are generated and committed. CI fails if any of them is out of
date.

```bash
sqlc generate                     # internal/db/gen from queries and migrations
pnpm --dir web api-generate       # OpenAPI document and the typed API client
pnpm --dir web generate-routes    # web/src/routeTree.gen.ts
```

## Migrations

```bash
make migrate-up
make migrate-down
```

## License

AGPL-3.0. See [LICENSE](LICENSE).
