MIGRATIONS_DIR := internal/db/migrations
LOAD_ENV := set -a && . ./.env && set +a

.PHONY: check-env
check-env:
	@test -f .env || { echo "missing .env — copy .env.example first"; exit 1; }

.PHONY: run
run: check-env
	$(LOAD_ENV) && go run ./cmd/nimap 

.PHONY: migrate-up
migrate-up: check-env
	$(LOAD_ENV) && goose -dir $(MIGRATIONS_DIR) postgres "$$SERVICE_DATABASE_URL" up

.PHONY: migrate-down
migrate-down: check-env
	$(LOAD_ENV) && goose -dir $(MIGRATIONS_DIR) postgres "$$SERVICE_DATABASE_URL" down