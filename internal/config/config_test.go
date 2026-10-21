package config

import (
	"reflect"
	"slices"
	"strings"
	"testing"
)

// TestAllowedMatchesEnumTags ties the values Validate accepts to the `enum`
// tags humacli prints in --help, so the two cannot drift apart.
func TestAllowedMatchesEnumTags(t *testing.T) {
	fields := reflect.TypeFor[Config]()

	tagged := map[string][]string{}
	for f := range fields.Fields() {
		if tag, ok := f.Tag.Lookup("enum"); ok {
			tagged[f.Name] = strings.Split(tag, ",")
		}
	}

	for name, want := range tagged {
		got, ok := allowed[name]
		if !ok {
			t.Errorf("field %s has an enum tag but no entry in allowed", name)
			continue
		}
		if !slices.Equal(got, want) {
			t.Errorf("field %s: allowed has %v, enum tag has %v", name, got, want)
		}
	}

	for name := range allowed {
		if _, ok := tagged[name]; !ok {
			t.Errorf("allowed has an entry for %s, which has no enum tag", name)
		}
	}
}

func valid() Config {
	return Config{
		Port:        8080,
		Env:         "development",
		DatabaseURL: "postgres://u:p@localhost:5432/db",
		LogLevel:    "info",
		LogFormat:   "text",
	}
}

func validOIDC() Config {
	c := valid()
	c.BaseURL = "https://nimap.example.com"
	c.OIDCIssuer = "https://id.example.com/realms/nimap"
	c.OIDCClientID = "nimap"
	c.OIDCClientSecret = "secret"
	c.OIDCScopes = "openid,email,profile"
	return c
}

func TestValidate(t *testing.T) {
	for name, cfg := range map[string]Config{"base": valid(), "oidc": validOIDC()} {
		if err := cfg.Validate(); err != nil {
			t.Fatalf("valid %s config rejected: %v", name, err)
		}
	}

	tests := map[string]func(*Config){
		"missing database url": func(c *Config) { c.DatabaseURL = "" },
		"blank database url":   func(c *Config) { c.DatabaseURL = "   " },
		"port too low":         func(c *Config) { c.Port = 0 },
		"port too high":        func(c *Config) { c.Port = 70000 },
		"env typo":             func(c *Config) { c.Env = "prod" },
		"env wrong case":       func(c *Config) { c.Env = "Production" },
		"unknown log level":    func(c *Config) { c.LogLevel = "verbose" },
		"unknown log format":   func(c *Config) { c.LogFormat = "xml" },
		"relative base url":    func(c *Config) { c.BaseURL = "nimap.example.com" },
		"base url with query":  func(c *Config) { c.BaseURL = "https://nimap.example.com/?x=1" },
		"http base url in production": func(c *Config) {
			c.Env = "production"
			c.BaseURL = "http://nimap.example.com"
		},
		"oidc without base url":      func(c *Config) { *c = validOIDC(); c.BaseURL = "" },
		"oidc without client id":     func(c *Config) { *c = validOIDC(); c.OIDCClientID = "" },
		"oidc without client secret": func(c *Config) { *c = validOIDC(); c.OIDCClientSecret = " " },
		"oidc relative issuer":       func(c *Config) { *c = validOIDC(); c.OIDCIssuer = "keycloak/realms/x" },
		"oidc scopes without openid": func(c *Config) { *c = validOIDC(); c.OIDCScopes = "email,profile" },
	}

	for name, breakIt := range tests {
		t.Run(name, func(t *testing.T) {
			cfg := valid()
			breakIt(&cfg)
			if err := cfg.Validate(); err == nil {
				t.Error("expected an error, got nil")
			}
		})
	}
}

func TestOIDCRedirectURL(t *testing.T) {
	tests := map[string]string{
		"https://nimap.example.com":  "https://nimap.example.com/api/auth/oidc/callback",
		"https://nimap.example.com/": "https://nimap.example.com/api/auth/oidc/callback",
		"https://example.com/nimap/": "https://example.com/nimap/api/auth/oidc/callback",
		"http://localhost:8080":      "http://localhost:8080/api/auth/oidc/callback",
	}
	for base, want := range tests {
		c := Config{BaseURL: base}
		if got := c.OIDCRedirectURL(); got != want {
			t.Errorf("BaseURL %q: got %q, want %q", base, got, want)
		}
	}
}

func TestOIDCLists(t *testing.T) {
	c := Config{OIDCScopes: " openid, email ,,profile", OIDCAllowedDomains: "Example.com, corp.example.org "}
	if got, want := c.OIDCScopeList(), []string{"openid", "email", "profile"}; !slices.Equal(got, want) {
		t.Errorf("scopes: got %v, want %v", got, want)
	}
	if got, want := c.OIDCAllowedDomainList(), []string{"example.com", "corp.example.org"}; !slices.Equal(got, want) {
		t.Errorf("domains: got %v, want %v", got, want)
	}
	if got := (&Config{}).OIDCAllowedDomainList(); got != nil {
		t.Errorf("empty domains: got %v, want nil", got)
	}
}
