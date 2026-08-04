package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/danielgtaylor/huma/v2/humacli"
	"github.com/spf13/cobra"
	"golang.org/x/term"

	"github.com/nimap-dev/nimap/internal/auth"
	"github.com/nimap-dev/nimap/internal/config"
	"github.com/nimap-dev/nimap/internal/db"
	"github.com/nimap-dev/nimap/internal/db/gen"
)

// registerNewUserCommand adds `nimap new_user` for creating an account from the
// command line.
func registerNewUserCommand(cli humacli.CLI) {
	var (
		username string
		email    string
		password string
		role     string
	)

	cmd := &cobra.Command{
		Use:   "new_user",
		Short: "Create a user account with a role",
		Long: "Create a user account. The password may be passed with --password;\n" +
			"if omitted it is read interactively without echo.",
		Run: humacli.WithOptions(func(cmd *cobra.Command, _ []string, cfg *config.Config) {
			if err := runNewUser(cmd.Context(), cfg, username, email, password, role); err != nil {
				fatal("new_user failed", err)
			}
		}),
	}

	f := cmd.Flags()
	f.StringVar(&username, "username", "", "username (at least 3 characters)")
	f.StringVar(&email, "email", "", "email address")
	f.StringVar(&password, "password", "", "password; prompted for if omitted")
	f.StringVar(&role, "role", "viewer", "role: viewer, editor or admin")

	cli.Root().AddCommand(cmd)
}

func runNewUser(ctx context.Context, cfg *config.Config, username, email, password, role string) error {
	username = strings.TrimSpace(username)
	email = strings.TrimSpace(email)
	if username == "" || email == "" {
		return errors.New("both --username and --email are required")
	}

	roleID, ok := auth.RoleID(role)
	if !ok {
		return fmt.Errorf("unknown role %q (want viewer, editor or admin)", role)
	}

	if password == "" {
		var err error
		if password, err = promptPassword(); err != nil {
			return err
		}
	}
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("database connection failed: %w", err)
	}
	defer pool.Close()

	user, err := gen.New(pool).CreateUser(ctx, gen.CreateUserParams{
		Username:     username,
		Email:        email,
		PasswordHash: hash,
		RoleID:       roleID,
	})
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}

	fmt.Printf("created user %q <%s> as %s (id %s)\n", user.Username, user.Email, role, user.ID)
	return nil
}

// promptPassword reads a password from the terminal without echoing it.
func promptPassword() (string, error) {
	fmt.Fprint(os.Stderr, "Password: ")
	raw, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(os.Stderr)
	if err != nil {
		return "", fmt.Errorf("read password: %w", err)
	}
	return strings.TrimSpace(string(raw)), nil
}
