package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"testing"

	"golang.org/x/crypto/argon2"
)

func TestHashPasswordFormat(t *testing.T) {
	h, err := HashPassword("s3cret")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !strings.HasPrefix(h, "$argon2id$v=19$m=65536,t=3,p=2$") {
		t.Fatalf("unexpected PHC prefix: %q", h)
	}
	if n := strings.Count(h, "$"); n != 5 {
		t.Fatalf("expected 5 %q separators, got %d in %q", "$", n, h)
	}
}

func TestVerifyPassword(t *testing.T) {
	h, err := HashPassword("correct password")
	if err != nil {
		t.Fatal(err)
	}

	match, needsRehash, err := VerifyPassword("correct password", h)
	if err != nil {
		t.Fatal(err)
	}
	if !match {
		t.Fatal("correct password should match")
	}
	if needsRehash {
		t.Fatal("a fresh hash should not need rehashing")
	}

	match, _, err = VerifyPassword("wrong password", h)
	if err != nil {
		t.Fatal(err)
	}
	if match {
		t.Fatal("wrong password must not match")
	}
}

func TestVerifyPasswordSaltIsRandom(t *testing.T) {
	a, _ := HashPassword("same")
	b, _ := HashPassword("same")
	if a == b {
		t.Fatal("two hashes of the same password must differ (random salt)")
	}
}

func TestVerifyPasswordRejectsMalformed(t *testing.T) {
	cases := map[string]error{
		"":                                      ErrInvalidHash,
		"not-a-phc-string":                      ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=2$c2FsdA": ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA$":  ErrInvalidHash,
		"$argon2i$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA":    ErrIncompatibleVariant,
		"$argon2id$v=1$m=65536,t=3,p=2$c2FsdA$aGFzaA":    ErrIncompatibleVersion,
		"$argon2id$v=abc$m=65536,t=3,p=2$c2FsdA$aGFzaA":  ErrInvalidHash,
		"$argon2id$v=19$m=x,t=3,p=2$c2FsdA$aGFzaA":       ErrInvalidHash,
		"$argon2id$v=19$t=3,m=65536,p=2$c2FsdA$aGFzaA":   ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=300$c2FsdA$aGFzaA": ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=2$!!!!$aGFzaA":     ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$!!!!":     ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=2$c2FsdA==$aGFzaA": ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA==": ErrInvalidHash,
		"$argon2id$v=19$m=65536,t=3,p=2$c2Fs dA$aGFzaA":  ErrInvalidHash,
	}
	for hash, want := range cases {
		match, needsRehash, err := VerifyPassword("x", hash)
		if !errors.Is(err, want) {
			t.Errorf("VerifyPassword(%q) error = %v, want %v", hash, err, want)
		}
		if match || needsRehash {
			t.Errorf("VerifyPassword(%q) = %v, %v, want false, false alongside an error",
				hash, match, needsRehash)
		}
	}
}

// argonParams are the knobs a stored hash carries in its PHC string.
type argonParams struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  int
	keyLength   int
}

var currentParams = argonParams{
	memory:      argonMemory,
	iterations:  argonIterations,
	parallelism: argonParallelism,
	saltLength:  argonSaltLength,
	keyLength:   argonKeyLength,
}

// hashWith builds a PHC string the way HashPassword does, but with the
// parameters given, standing in for a hash stored before they last changed.
func hashWith(t *testing.T, password string, p argonParams) string {
	t.Helper()

	salt := make([]byte, p.saltLength)
	if _, err := rand.Read(salt); err != nil {
		t.Fatal(err)
	}

	key := argon2.IDKey([]byte(password), salt, p.iterations, p.memory, p.parallelism, uint32(p.keyLength))

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, p.memory, p.iterations, p.parallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	)
}

func TestVerifyPasswordNeedsRehash(t *testing.T) {
	const password = "correct password"

	older := func(change func(*argonParams)) argonParams {
		p := currentParams
		change(&p)
		return p
	}

	cases := map[string]argonParams{
		"lower memory":     older(func(p *argonParams) { p.memory = 32 * 1024 }),
		"fewer iterations": older(func(p *argonParams) { p.iterations = 1 }),
		"less parallelism": older(func(p *argonParams) { p.parallelism = 1 }),
		"shorter salt":     older(func(p *argonParams) { p.saltLength = 8 }),
		"shorter key":      older(func(p *argonParams) { p.keyLength = 16 }),
	}

	for name, params := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			hash := hashWith(t, password, params)

			match, needsRehash, err := VerifyPassword(password, hash)
			if err != nil {
				t.Fatalf("VerifyPassword: %v", err)
			}
			if !match {
				t.Fatal("a hash with older parameters must still verify")
			}
			if !needsRehash {
				t.Error("a hash with older parameters should ask to be rehashed")
			}

			match, needsRehash, err = VerifyPassword("wrong password", hash)
			if err != nil {
				t.Fatalf("VerifyPassword: %v", err)
			}
			if match || needsRehash {
				t.Errorf("wrong password = %v, %v, want false, false", match, needsRehash)
			}
		})
	}

	t.Run("current parameters", func(t *testing.T) {
		t.Parallel()

		hash := hashWith(t, password, currentParams)

		match, needsRehash, err := VerifyPassword(password, hash)
		if err != nil || !match || needsRehash {
			t.Errorf("VerifyPassword = %v, %v, %v, want true, false, nil", match, needsRehash, err)
		}
	})
}

func TestVerifyPasswordEmpty(t *testing.T) {
	h, err := HashPassword("")
	if err != nil {
		t.Fatal(err)
	}

	if match, _, err := VerifyPassword("", h); err != nil || !match {
		t.Errorf("empty password against its own hash = %v, %v, want true, nil", match, err)
	}
	if match, _, err := VerifyPassword("x", h); err != nil || match {
		t.Errorf("non-empty password against an empty hash = %v, %v, want false, nil", match, err)
	}
}
