// Package config holds application configuration.
//
// The struct tags are consumed by humacli, which derives flags,
// environment variables and --help output from them.
package config

import "errors"

// Version is set at build time via -ldflags.
var Version = "dev"

type Config struct {
	Port        int    `help:"Port to listen on" short:"p" default:"8080"`
	Env         string `help:"Runtime environment" default:"development" enum:"development,production"`
	DatabaseURL string `help:"PostgreSQL connection string" required:"true"`
	MediaDir    string `help:"Directory for photos and thumbnails" default:"./data/media"`
	SessionKey  string `help:"Key used to sign session cookies"`
	LogLevel    string `help:"Log level" default:"info" enum:"debug,info,warn,error"`
	LogFormat   string `help:"Log output format" default:"text" enum:"text,json"`
	AutoMigrate bool   `help:"Run pending migrations on startup" default:"true"`
}

// Validate checks rules that cannot be expressed as struct tags.
func (c *Config) Validate() error {
	if c.Env == "production" && c.SessionKey == "" {
		return errors.New("session key is required in production")
	}
	return nil
}
