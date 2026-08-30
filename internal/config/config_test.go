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

func TestValidate(t *testing.T) {
	base := valid()
	if err := base.Validate(); err != nil {
		t.Fatalf("valid config rejected: %v", err)
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
