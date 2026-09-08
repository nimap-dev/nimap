// Package config holds application configuration.
//
// The struct tags are consumed by humacli, which derives flags,
// environment variables and --help output from them.
package config

import (
	"errors"
	"fmt"
	"slices"
	"strings"
)

// Version is set at build time via -ldflags.
var Version = "dev"

type Config struct {
	Port        int    `doc:"Port to listen on" short:"p" default:"8080"`
	Env         string `doc:"Runtime environment" default:"production" enum:"development,production"`
	DatabaseURL string `doc:"PostgreSQL connection string" required:"true"`
	MediaDir    string `doc:"Directory for photos and thumbnails" default:"./data/media"`
	LogLevel    string `doc:"Log level" default:"info" enum:"debug,info,warn,error"`
	LogFormat   string `doc:"Log output format" default:"text" enum:"text,json"`
	AutoMigrate bool   `doc:"Run pending migrations on startup" default:"true"`
}

// allowed lists the accepted values per enum field. It must stay in sync with
// the `enum` struct tags above; TestAllowedMatchesEnumTags enforces that.
var allowed = map[string][]string{
	"Env":       {"development", "production"},
	"LogLevel":  {"debug", "info", "warn", "error"},
	"LogFormat": {"text", "json"},
}

// Validate checks what the struct tags describe but humacli does not enforce.
// The `required` and `enum` tags only feed --help: a value missing from both
// the flags and the environment arrives as the zero value, and an unknown one
// arrives unchanged.
func (c *Config) Validate() error {
	if strings.TrimSpace(c.DatabaseURL) == "" {
		return errors.New("SERVICE_DATABASE_URL is not set (or pass --database-url)")
	}

	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("SERVICE_PORT is %d, want 1-65535", c.Port)
	}

	enumChecked := []struct{ field, envVar, value string }{
		{"Env", "SERVICE_ENV", c.Env},
		{"LogLevel", "SERVICE_LOG_LEVEL", c.LogLevel},
		{"LogFormat", "SERVICE_LOG_FORMAT", c.LogFormat},
	}

	for _, f := range enumChecked {
		if !slices.Contains(allowed[f.field], f.value) {
			return fmt.Errorf("%s is %q, want one of: %s",
				f.envVar, f.value, strings.Join(allowed[f.field], ", "))
		}
	}

	return nil
}
