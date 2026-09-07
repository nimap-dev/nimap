package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/danielgtaylor/huma/v2/humacli"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/config"
	"github.com/nimap-dev/nimap/internal/db"
	"github.com/nimap-dev/nimap/internal/httpapi"
	"github.com/nimap-dev/nimap/internal/logging"
	"github.com/nimap-dev/nimap/internal/media"
)

func main() {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		fmt.Fprintf(os.Stderr, "reading .env: %v\n", err)
		os.Exit(1)
	}

	cli := humacli.New(func(hooks humacli.Hooks, cfg *config.Config) {
		slog.SetDefault(logging.New(cfg.LogLevel, cfg.LogFormat))

		var (
			pool *pgxpool.Pool
			srv  *http.Server
		)

		hooks.OnStart(func() {
			if err := cfg.Validate(); err != nil {
				fmt.Fprintf(os.Stderr, "configuration: %v\n", err)
				os.Exit(1)
			}

			store, err := media.NewStore(cfg.MediaDir)
			if err != nil {
				fatal("media directory unusable", err)
			}

			ctx := context.Background()

			if cfg.AutoMigrate {
				slog.Info("running migrations")
				if err := db.MigrateUp(ctx, cfg.DatabaseURL); err != nil {
					fatal("migrations failed", err)
				}
			}

			pool, err = db.NewPool(ctx, cfg.DatabaseURL)
			if err != nil {
				fatal("database connection failed", err)
			}

			sessions := auth.NewSessionManager(pool, cfg.Env == "production")

			router := chi.NewMux()
			router.Use(middleware.RequestID, middleware.Recoverer, middleware.Compress(5))

			// Health stays outside the session group on purpose: it keeps
			// /healthz off the session store, so a database hiccup cannot take
			// the container healthcheck down with it.
			httpapi.RegisterHealth(router, pool, config.Version)

			router.Group(func(r chi.Router) {
				r.Use(sessions.LoadAndSave)
				httpapi.NewAPI(r, config.Version, pool, sessions, store)
			})

			// Must stay last: RegisterFrontend claims "/*" and answers anything
			// unmatched with the SPA shell.
			httpapi.RegisterFrontend(router)

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
	registerMigrateCommand(cli)
	registerMediaCommand(cli)
	registerOpenAPICommand(cli)

	cli.Run()
}

func fatal(msg string, err error) {
	slog.Error(msg, "err", err)
	os.Exit(1)
}
