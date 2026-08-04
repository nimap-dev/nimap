package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

var (
	// ErrInvalidHash is returned when a stored hash is not in the PHC format
	// this package produces.
	ErrInvalidHash = errors.New("auth: password hash is not in the correct format")

	// ErrIncompatibleVariant is returned for a hash that is not argon2id.
	ErrIncompatibleVariant = errors.New("auth: incompatible argon2 variant, expected argon2id")

	// ErrIncompatibleVersion is returned for a hash built with a different
	// argon2 version than this build links against.
	ErrIncompatibleVersion = errors.New("auth: incompatible argon2 version")
)

// Argon2id parameters, per the technical specification:
// m=64 MiB, t=3, p=2, 16-byte salt, 32-byte key.
const (
	argonMemory      = 64 * 1024
	argonIterations  = 3
	argonParallelism = 2
	argonSaltLength  = 16
	argonKeyLength   = 32
)

// HashPassword derives an argon2id key from password and returns it as a PHC
// string that embeds the salt and parameters:
//
//	$argon2id$v=19$m=65536,t=3,p=2$<salt>$<hash>
func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("auth: generate salt: %w", err)
	}

	key := argon2.IDKey([]byte(password), salt, argonIterations, argonMemory, argonParallelism, argonKeyLength)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonIterations, argonParallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// VerifyPassword compares password against a PHC hash in constant time.
func VerifyPassword(password, encodedHash string) (match, needsRehash bool, err error) {
	memory, iterations, parallelism, salt, key, err := decodeHash(encodedHash)
	if err != nil {
		return false, false, err
	}

	otherKey := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(key)))

	if subtle.ConstantTimeEq(int32(len(key)), int32(len(otherKey))) == 0 {
		return false, false, nil
	}
	if subtle.ConstantTimeCompare(key, otherKey) != 1 {
		return false, false, nil
	}

	needsRehash = memory != argonMemory ||
		iterations != argonIterations ||
		parallelism != argonParallelism ||
		uint32(len(salt)) != argonSaltLength ||
		uint32(len(key)) != argonKeyLength

	return true, needsRehash, nil
}

// decodeHash parses a PHC argon2id string into its parameters, salt and key.
func decodeHash(encoded string) (memory, iterations uint32, parallelism uint8, salt, key []byte, err error) {
	// $argon2id$v=19$m=65536,t=3,p=2$<salt>$<hash>
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 {
		return 0, 0, 0, nil, nil, ErrInvalidHash
	}
	if parts[1] != "argon2id" {
		return 0, 0, 0, nil, nil, ErrIncompatibleVariant
	}

	var version int
	if _, err = fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return 0, 0, 0, nil, nil, ErrInvalidHash
	}
	if version != argon2.Version {
		return 0, 0, 0, nil, nil, ErrIncompatibleVersion
	}

	if _, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return 0, 0, 0, nil, nil, ErrInvalidHash
	}

	b64 := base64.RawStdEncoding.Strict()
	if salt, err = b64.DecodeString(parts[4]); err != nil {
		return 0, 0, 0, nil, nil, ErrInvalidHash
	}
	if key, err = b64.DecodeString(parts[5]); err != nil {
		return 0, 0, 0, nil, nil, ErrInvalidHash
	}

	return memory, iterations, parallelism, salt, key, nil
}
