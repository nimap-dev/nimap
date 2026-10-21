package auth

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestDomainAllowed(t *testing.T) {
	open := &OIDCProvider{}
	if !open.DomainAllowed("anyone@anywhere.org") {
		t.Error("empty allow list should allow any email")
	}

	p := &OIDCProvider{AllowedDomains: []string{"example.com"}}
	tests := map[string]bool{
		"jan@example.com":        true,
		"Jan@EXAMPLE.com":        true,
		"jan@sub.example.com":    false,
		"jan@example.com.evil":   false,
		"a@b@example.com":        true,
		"example.com":            false,
		"jan@notexample.com":     false,
		"jan@example.com@evil.x": false,
	}
	for email, want := range tests {
		if got := p.DomainAllowed(email); got != want {
			t.Errorf("DomainAllowed(%q) = %v, want %v", email, got, want)
		}
	}
}

func TestUsernameCandidate(t *testing.T) {
	tests := []struct {
		claims OIDCClaims
		want   string
	}{
		{OIDCClaims{PreferredUsername: "jnovak", Email: "jan@example.com"}, "jnovak"},
		{OIDCClaims{PreferredUsername: "  ", Email: "jan.novak@example.com"}, "jan.novak"},
		{OIDCClaims{Email: "jan@example.com"}, "jan"},
		{OIDCClaims{PreferredUsername: "Jan Novák"}, "Jan.Novák"},
		{OIDCClaims{Email: "x@example.com"}, "x__"},
		{OIDCClaims{PreferredUsername: "jan@corp.example"}, "jan@corp.example"},
	}
	for _, tt := range tests {
		if got := UsernameCandidate(tt.claims); got != tt.want {
			t.Errorf("UsernameCandidate(%+v) = %q, want %q", tt.claims, got, tt.want)
		}
	}
}

// fakeIssuer is a minimal OIDC provider: discovery, JWKS, a token endpoint
// returning whatever ID token claims the test sets, and userinfo.
type fakeIssuer struct {
	*httptest.Server
	key      *rsa.PrivateKey
	claims   map[string]any
	noIDTok  bool
	userinfo map[string]any
	verifier string // PKCE verifier the token endpoint received
}

func newFakeIssuer(t *testing.T) *fakeIssuer {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	f := &fakeIssuer{key: key}
	mux := http.NewServeMux()
	f.Server = httptest.NewServer(mux)
	t.Cleanup(f.Close)

	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"issuer":                                f.URL,
			"authorization_endpoint":                f.URL + "/authorize",
			"token_endpoint":                        f.URL + "/token",
			"jwks_uri":                              f.URL + "/jwks",
			"userinfo_endpoint":                     f.URL + "/userinfo",
			"id_token_signing_alg_values_supported": []string{"RS256"},
		})
	})
	mux.HandleFunc("/jwks", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]any{{
			"kty": "RSA", "alg": "RS256", "use": "sig", "kid": "test",
			"n": b64(key.N.Bytes()),
			"e": b64(big.NewInt(int64(key.E)).Bytes()),
		}}})
	})
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		f.verifier = r.PostForm.Get("code_verifier")
		resp := map[string]any{"access_token": "at", "token_type": "Bearer", "expires_in": 300}
		if !f.noIDTok {
			resp["id_token"] = f.sign(t, f.claims)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(f.userinfo)
	})
	return f
}

func (f *fakeIssuer) sign(t *testing.T, claims map[string]any) string {
	t.Helper()
	header, _ := json.Marshal(map[string]string{"alg": "RS256", "typ": "JWT", "kid": "test"})
	payload, _ := json.Marshal(claims)
	signing := b64(header) + "." + b64(payload)
	sum := sha256.Sum256([]byte(signing))
	sig, err := rsa.SignPKCS1v15(rand.Reader, f.key, crypto.SHA256, sum[:])
	if err != nil {
		t.Fatal(err)
	}
	return signing + "." + b64(sig)
}

func (f *fakeIssuer) baseClaims(nonce string) map[string]any {
	now := time.Now()
	return map[string]any{
		"iss": f.URL, "aud": "nimap", "sub": "user-1",
		"iat": now.Unix(), "exp": now.Add(time.Minute).Unix(),
		"nonce": nonce, "email": "jan@example.com", "email_verified": true,
		"preferred_username": "jan",
	}
}

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func newTestProvider(t *testing.T, f *fakeIssuer) *OIDCProvider {
	t.Helper()
	p, err := NewOIDCProvider(context.Background(), OIDCOptions{
		Issuer:       f.URL,
		ClientID:     "nimap",
		ClientSecret: "secret",
		RedirectURL:  "http://localhost:8080/api/auth/oidc/callback",
		Scopes:       []string{"openid", "email", "profile"},
	})
	if err != nil {
		t.Fatalf("NewOIDCProvider: %v", err)
	}
	return p
}

func TestNewAuthRequestAndURL(t *testing.T) {
	p := newTestProvider(t, newFakeIssuer(t))

	a, err := p.NewAuthRequest()
	if err != nil {
		t.Fatal(err)
	}
	b, _ := p.NewAuthRequest()
	if a.State == "" || a.Nonce == "" || a.Verifier == "" {
		t.Fatalf("empty auth request field: %+v", a)
	}
	if a.State == b.State || a.Nonce == b.Nonce || a.Verifier == b.Verifier {
		t.Error("auth requests repeat values")
	}

	u := p.AuthCodeURL(a)
	for _, want := range []string{"state=" + a.State, "nonce=" + a.Nonce, "code_challenge_method=S256", "code_challenge="} {
		if !strings.Contains(u, want) {
			t.Errorf("AuthCodeURL %q lacks %q", u, want)
		}
	}
}

func TestExchange(t *testing.T) {
	ctx := context.Background()
	req := OIDCAuthRequest{State: "s", Nonce: "n", Verifier: "v-verifier-v-verifier-v-verifier-v-verifier"}

	t.Run("valid", func(t *testing.T) {
		f := newFakeIssuer(t)
		f.claims = f.baseClaims(req.Nonce)
		got, err := newTestProvider(t, f).Exchange(ctx, "code", req)
		if err != nil {
			t.Fatal(err)
		}
		if got.Subject != "user-1" || got.Email != "jan@example.com" || !got.EmailVerified || got.PreferredUsername != "jan" {
			t.Errorf("unexpected claims %+v", got)
		}
		if f.verifier != req.Verifier {
			t.Errorf("token endpoint got verifier %q, want %q", f.verifier, req.Verifier)
		}
	})

	t.Run("unverified email", func(t *testing.T) {
		f := newFakeIssuer(t)
		f.claims = f.baseClaims(req.Nonce)
		delete(f.claims, "email_verified")
		got, err := newTestProvider(t, f).Exchange(ctx, "code", req)
		if err != nil {
			t.Fatal(err)
		}
		if got.EmailVerified {
			t.Error("missing email_verified should read as false")
		}
	})

	t.Run("email from userinfo", func(t *testing.T) {
		f := newFakeIssuer(t)
		f.claims = f.baseClaims(req.Nonce)
		delete(f.claims, "email")
		delete(f.claims, "email_verified")
		f.userinfo = map[string]any{"sub": "user-1", "email": "jan@example.com", "email_verified": true}
		got, err := newTestProvider(t, f).Exchange(ctx, "code", req)
		if err != nil {
			t.Fatal(err)
		}
		if got.Email != "jan@example.com" || !got.EmailVerified {
			t.Errorf("unexpected claims %+v", got)
		}
	})

	failures := map[string]func(f *fakeIssuer){
		"wrong nonce":    func(f *fakeIssuer) { f.claims["nonce"] = "other" },
		"wrong audience": func(f *fakeIssuer) { f.claims["aud"] = "someone-else" },
		"wrong issuer":   func(f *fakeIssuer) { f.claims["iss"] = "https://evil.example" },
		"expired":        func(f *fakeIssuer) { f.claims["exp"] = time.Now().Add(-time.Minute).Unix() },
		"no id token":    func(f *fakeIssuer) { f.noIDTok = true },
		"no subject":     func(f *fakeIssuer) { delete(f.claims, "sub") },
		"bad signature": func(f *fakeIssuer) {
			other, _ := rsa.GenerateKey(rand.Reader, 2048)
			f.key = other
		},
		"no email anywhere": func(f *fakeIssuer) {
			delete(f.claims, "email")
			f.userinfo = map[string]any{"sub": "user-1"}
		},
		"userinfo subject mismatch": func(f *fakeIssuer) {
			delete(f.claims, "email")
			f.userinfo = map[string]any{"sub": "user-2", "email": "eve@example.com"}
		},
	}
	for name, breakIt := range failures {
		t.Run(name, func(t *testing.T) {
			f := newFakeIssuer(t)
			p := newTestProvider(t, f)
			f.claims = f.baseClaims(req.Nonce)
			breakIt(f)
			if _, err := p.Exchange(ctx, "code", req); err == nil {
				t.Error("expected an error, got nil")
			}
		})
	}
}
