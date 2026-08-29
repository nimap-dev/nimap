package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/danielgtaylor/huma/v2/humacli"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/config"
	"github.com/nimap-dev/nimap/internal/db"
	"github.com/nimap-dev/nimap/internal/httpapi"
	"github.com/nimap-dev/nimap/internal/logging"
)

func main() {
	cli := humacli.New(func(hooks humacli.Hooks, cfg *config.Config) {
		slog.SetDefault(logging.New(cfg.LogLevel, cfg.LogFormat))

		var (
			pool *pgxpool.Pool
			srv  *http.Server
		)

		hooks.OnStart(func() {
			ctx := context.Background()

			if cfg.AutoMigrate {
				slog.Info("running migrations")
				if err := db.Migrate(ctx, cfg.DatabaseURL); err != nil {
					fatal("migrations failed", err)
				}
			}

			var err error
			pool, err = db.NewPool(ctx, cfg.DatabaseURL)
			if err != nil {
				fatal("database connection failed", err)
			}

			sessions := auth.NewSessionManager(pool, cfg.Env == "production")

			router := chi.NewMux()
			router.Use(middleware.RequestID, middleware.Recoverer)
			router.Use(sessions.LoadAndSave)

			httpapi.RegisterHealth(router, pool, config.Version)
			httpapi.NewAPI(router, config.Version, pool, sessions)

			srv = &http.Server{
				Addr:              fmt.Sprintf(":%d", cfg.Port),
				Handler:           router,
				ReadHeaderTimeout: 10 * time.Second,
			}

			slog.Info("listening", "addr", srv.Addr, "version", config.Version)
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				fatal("http server failed", err)
			}
		})

		hooks.OnStop(func() {
			slog.Info("shutting down")

			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()

			if srv != nil {
				if err := srv.Shutdown(ctx); err != nil {
					slog.Error("graceful shutdown failed", "err", err)
				}
			}
			if pool != nil {
				pool.Close()
			}

			slog.Info("stopped")
		})
	})

	registerNewUserCommand(cli)
	registerOpenAPICommand(cli)

	cli.Run()
}

func fatal(msg string, err error) {
	slog.Error(msg, "err", err)
	os.Exit(1)
}
