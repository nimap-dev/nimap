package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func NewPool(ctx context.Context, connString string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, err
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnIdleTime = 15 * time.Minute
	config.MaxConnLifetime = 1 * time.Hour
	config.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

//go:embed migrations/*.sql
var migrationsFS embed.FS

const migrationsDir = "migrations"

// withGoose runs fn against a short-lived database/sql handle configured for
// the migrations embedded in this binary.
func withGoose(url string, fn func(*sql.DB) error) error {
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		return fmt.Errorf("parse connection string: %w", err)
	}

	sqlDB := stdlib.OpenDB(*cfg)
	defer sqlDB.Close()

	goose.SetBaseFS(migrationsFS)

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}

	return fn(sqlDB)
}

// MigrateUp applies all pending migrations.
func MigrateUp(ctx context.Context, url string) error {
	return withGoose(url, func(sqlDB *sql.DB) error {
		if err := goose.UpContext(ctx, sqlDB, migrationsDir); err != nil {
			return fmt.Errorf("apply migrations: %w", err)
		}
		return nil
	})
}

// MigrateDown rolls back the most recently applied migration.
func MigrateDown(ctx context.Context, url string) error {
	return withGoose(url, func(sqlDB *sql.DB) error {
		if err := goose.DownContext(ctx, sqlDB, migrationsDir); err != nil {
			return fmt.Errorf("roll back migration: %w", err)
		}
		return nil
	})
}

// MigrateStatus writes the applied and pending migrations to stdout.
func MigrateStatus(ctx context.Context, url string) error {
	return withGoose(url, func(sqlDB *sql.DB) error {
		if err := goose.StatusContext(ctx, sqlDB, migrationsDir); err != nil {
			return fmt.Errorf("read migration status: %w", err)
		}
		return nil
	})
}

// MigrationVersion reports the schema version currently applied.
func MigrationVersion(ctx context.Context, url string) (int64, error) {
	var version int64
	err := withGoose(url, func(sqlDB *sql.DB) error {
		var err error
		version, err = goose.GetDBVersionContext(ctx, sqlDB)
		if err != nil {
			return fmt.Errorf("read schema version: %w", err)
		}
		return nil
	})
	return version, err
}
