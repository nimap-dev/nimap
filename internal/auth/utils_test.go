package auth

import (
	"strings"
	"testing"
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
		"not-a-phc-string": ErrInvalidHash,
		"$argon2i$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA": ErrIncompatibleVariant,
		"$argon2id$v=1$m=65536,t=3,p=2$c2FsdA$aGFzaA": ErrIncompatibleVersion,
	}
	for hash, want := range cases {
		if _, _, err := VerifyPassword("x", hash); err != want {
			t.Errorf("VerifyPassword(%q) error = %v, want %v", hash, err, want)
		}
	}
}
