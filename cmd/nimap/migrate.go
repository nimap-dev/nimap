package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/danielgtaylor/huma/v2/humacli"
	"github.com/spf13/cobra"
	"golang.org/x/term"

	"github.com/nimap-dev/nimap/internal/config"
	"github.com/nimap-dev/nimap/internal/db"
)

// registerMigrateCommand adds `nimap migrate`.
//
// These run the migrations embedded in this binary, through the same goose
// library version the server uses for SERVICE_AUTO_MIGRATE. That is the point
// of having them here: a deployed container can migrate without a goose binary
// and without a copy of the migration files on disk.
func registerMigrateCommand(cli humacli.CLI) {
	migrate := &cobra.Command{
		Use:   "migrate",
		Short: "Apply, roll back or inspect database migrations",
	}

	migrate.AddCommand(&cobra.Command{
		Use:   "up",
		Short: "Apply all pending migrations",
		Args:  cobra.NoArgs,
		Run: humacli.WithOptions(func(cmd *cobra.Command, _ []string, cfg *config.Config) {
			if err := cfg.Validate(); err != nil {
				fmt.Fprintf(os.Stderr, "configuration: %v\n", err)
				os.Exit(1)
			}
			if err := db.MigrateUp(cmd.Context(), cfg.DatabaseURL); err != nil {
				fatal("migrate up failed", err)
			}
		}),
	})

	migrate.AddCommand(newMigrateDownCommand())

	migrate.AddCommand(&cobra.Command{
		Use:   "status",
		Short: "Show which migrations are applied and which are pending",
		Args:  cobra.NoArgs,
		Run: humacli.WithOptions(func(cmd *cobra.Command, _ []string, cfg *config.Config) {
			if err := cfg.Validate(); err != nil {
				fmt.Fprintf(os.Stderr, "configuration: %v\n", err)
				os.Exit(1)
			}
			if err := db.MigrateStatus(cmd.Context(), cfg.DatabaseURL); err != nil {
				fatal("migrate status failed", err)
			}
		}),
	})

	cli.Root().AddCommand(migrate)
}

func newMigrateDownCommand() *cobra.Command {
	var assumeYes bool

	cmd := &cobra.Command{
		Use:   "down",
		Short: "Roll back the most recently applied migration",
		Long: "Roll back the most recently applied migration.\n\n" +
			"This runs that migration's Down section, which destroys whatever\n" +
			"the section drops. Against SERVICE_ENV=production it asks for\n" +
			"confirmation first, unless --yes is given.",
		Args: cobra.NoArgs,
		Run: humacli.WithOptions(func(cmd *cobra.Command, _ []string, cfg *config.Config) {
			if err := cfg.Validate(); err != nil {
				fmt.Fprintf(os.Stderr, "configuration: %v\n", err)
				os.Exit(1)
			}
			ctx := cmd.Context()

			if cfg.Env == "production" && !assumeYes {
				if !term.IsTerminal(int(os.Stdin.Fd())) {
					fmt.Fprintln(os.Stderr, "stdin is not a terminal, pass --yes to confirm non-interactively")
					os.Exit(1)
				}

				version, err := db.MigrationVersion(ctx, cfg.DatabaseURL)
				if err != nil {
					fatal("could not read the current schema version", err)
				}

				fmt.Fprintf(os.Stderr,
					"About to roll back migration %d on a PRODUCTION database.\n"+
						"This destroys the data that migration's Down section drops,\n"+
						"and it cannot be undone.\n"+
						"Type 'yes' to continue: ", version)

				line, err := bufio.NewReader(os.Stdin).ReadString('\n')
				if err != nil && line == "" {
					fatal("could not read the confirmation", err)
				}
				if strings.TrimSpace(line) != "yes" {
					fmt.Fprintln(os.Stderr, "aborted, nothing was rolled back")
					os.Exit(1)
				}
			}

			if err := db.MigrateDown(ctx, cfg.DatabaseURL); err != nil {
				fatal("migrate down failed", err)
			}
		}),
	}

	cmd.Flags().BoolVarP(&assumeYes, "yes", "y", false,
		"skip the production confirmation prompt")

	return cmd
}
