// Package config holds application configuration.
//
// The struct tags are consumed by humacli, which derives flags,
// environment variables and --help output from them.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"slices"
	"strings"
)

// Version is set at build time via -ldflags.
var Version = "dev"

const OIDCCallbackPath = "/api/auth/oidc/callback"

type Config struct {
	Port        int    `doc:"Port to listen on" short:"p" default:"8080"`
	Env         string `doc:"Runtime environment" default:"production" enum:"development,production"`
	DatabaseURL string `doc:"PostgreSQL connection string" required:"true"`
	BaseURL     string `doc:"Public URL nimap is reached at, e.g. https://nimap.example.com"`
	MediaDir    string `doc:"Directory for photos and thumbnails" default:"./data/media"`
	LogLevel    string `doc:"Log level" default:"info" enum:"debug,info,warn,error"`
	LogFormat   string `doc:"Log output format" default:"text" enum:"text,json"`
	AutoMigrate bool   `doc:"Run pending migrations on startup" default:"true"`

	OIDCIssuer         string `doc:"OIDC issuer URL; empty disables single sign-on"`
	OIDCClientID       string `doc:"OIDC client ID"`
	OIDCClientSecret   string `doc:"OIDC client secret"`
	OIDCName           string `doc:"Provider name shown on the login button" default:"SSO"`
	OIDCScopes         string `doc:"Comma-separated scopes to request" default:"openid,email,profile"`
	OIDCAllowedDomains string `doc:"Comma-separated email domains allowed to sign up; empty allows any"`
	OIDCLinkByEmail    bool   `doc:"Link a first OIDC login to an existing user with the same verified email" default:"true"`
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

	if c.BaseURL != "" {
		if err := c.checkURL("SERVICE_BASE_URL", c.BaseURL); err != nil {
			return err
		}
	}

	if c.OIDCEnabled() {
		return c.validateOIDC()
	}

	return nil
}

func (c *Config) validateOIDC() error {
	if c.BaseURL == "" {
		return errors.New("SERVICE_BASE_URL must be set when SERVICE_OIDC_ISSUER is set")
	}
	if err := c.checkURL("SERVICE_OIDC_ISSUER", c.OIDCIssuer); err != nil {
		return err
	}
	if strings.TrimSpace(c.OIDCClientID) == "" {
		return errors.New("SERVICE_OIDC_CLIENT_ID must be set when SERVICE_OIDC_ISSUER is set")
	}
	if strings.TrimSpace(c.OIDCClientSecret) == "" {
		return errors.New("SERVICE_OIDC_CLIENT_SECRET must be set when SERVICE_OIDC_ISSUER is set")
	}
	if !slices.Contains(c.OIDCScopeList(), "openid") {
		return errors.New("SERVICE_OIDC_SCOPES must include openid")
	}
	return nil
}

// checkURL accepts an absolute http(s) URL without query or fragment. Plain
// http is allowed only in development, where a local identity provider and
// nimap itself usually run without TLS.
func (c *Config) checkURL(envVar, raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return fmt.Errorf("%s is %q, want an absolute URL", envVar, raw)
	}
	switch {
	case u.Scheme == "https":
	case u.Scheme == "http" && c.Env == "development":
	default:
		return fmt.Errorf("%s is %q, want an https URL (http only with SERVICE_ENV=development)", envVar, raw)
	}
	if u.RawQuery != "" || u.Fragment != "" {
		return fmt.Errorf("%s is %q, want a URL without query or fragment", envVar, raw)
	}
	return nil
}

// OIDCEnabled reports whether single sign-on is configured.
func (c *Config) OIDCEnabled() bool {
	return strings.TrimSpace(c.OIDCIssuer) != ""
}

// OIDCRedirectURL is the callback URL registered with the identity provider
func (c *Config) OIDCRedirectURL() string {
	return strings.TrimRight(c.BaseURL, "/") + OIDCCallbackPath
}

// OIDCScopeList splits OIDCScopes into its non-empty entries.
func (c *Config) OIDCScopeList() []string {
	return splitList(c.OIDCScopes, false)
}

// OIDCAllowedDomainList returns the allowed sign-up domains, lowercased.
func (c *Config) OIDCAllowedDomainList() []string {
	return splitList(c.OIDCAllowedDomains, true)
}

func splitList(s string, lower bool) []string {
	var out []string
	for part := range strings.SplitSeq(s, ",") {
		part = strings.TrimSpace(part)
		if lower {
			part = strings.ToLower(part)
		}
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}
