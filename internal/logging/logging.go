package logging

import (
	"log/slog"
	"os"
	"strings"
)

// New returns a slog logger writing to stdout.
func New(level, format string) *slog.Logger {
	var l slog.Level
	if err := l.UnmarshalText([]byte(level)); err != nil {
		l = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{Level: l}

	if strings.EqualFold(format, "json") {
		return slog.New(slog.NewJSONHandler(os.Stdout, opts))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, opts))
}
