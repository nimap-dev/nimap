package utils

import (
	"crypto/rand"
	"encoding/base64"
)

func RandomString(bytes uint) (string, error) {
	b := make([]byte, bytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
