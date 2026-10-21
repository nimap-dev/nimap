package auth

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/nimap-dev/nimap/internal/utils"
	"golang.org/x/oauth2"
)

// OIDCOptions is what NewOIDCProvider needs from the configuration.
type OIDCOptions struct {
	Issuer         string
	ClientID       string
	ClientSecret   string
	RedirectURL    string
	Name           string
	Scopes         []string
	AllowedDomains []string
	LinkByEmail    bool
}

// OIDCProvider talks to the one configured identity provider: it builds the
// authorization URL, exchanges the code and verifies the returned ID token.
type OIDCProvider struct {
	Name           string
	Issuer         string
	AllowedDomains []string
	LinkByEmail    bool

	provider *oidc.Provider
	oauth2   *oauth2.Config
	verifier *oidc.IDTokenVerifier
}

// OIDCClaims are the ID token claims nimap uses.
type OIDCClaims struct {
	Subject           string `json:"sub"`
	Email             string `json:"email"`
	EmailVerified     bool   `json:"email_verified"`
	PreferredUsername string `json:"preferred_username"`
	Name              string `json:"name"`
}

// OIDCAuthRequest is the per-login state kept in the session between the
// redirect to the provider and the callback.
type OIDCAuthRequest struct {
	State    string
	Nonce    string
	Verifier string
}

// NewOIDCProvider runs discovery against opts.Issuer and prepares the oauth2
// config and the ID token verifier.
func NewOIDCProvider(ctx context.Context, opts OIDCOptions) (*OIDCProvider, error) {
	provider, err := oidc.NewProvider(ctx, opts.Issuer)
	if err != nil {
		return nil, fmt.Errorf("oidc discovery for %s: %w", opts.Issuer, err)
	}

	return &OIDCProvider{
		Name:           opts.Name,
		Issuer:         opts.Issuer,
		AllowedDomains: opts.AllowedDomains,
		LinkByEmail:    opts.LinkByEmail,

		provider: provider,
		oauth2: &oauth2.Config{
			ClientID:     opts.ClientID,
			ClientSecret: opts.ClientSecret,
			Scopes:       opts.Scopes,
			Endpoint:     provider.Endpoint(),
			RedirectURL:  opts.RedirectURL,
		},
		verifier: provider.Verifier(&oidc.Config{ClientID: opts.ClientID}),
	}, nil
}

// NewAuthRequest generates a fresh state, nonce and PKCE verifier.
func (p *OIDCProvider) NewAuthRequest() (OIDCAuthRequest, error) {
	state, err := utils.RandomString(32)
	if err != nil {
		return OIDCAuthRequest{}, fmt.Errorf("generate state: %w", err)
	}
	nonce, err := utils.RandomString(32)
	if err != nil {
		return OIDCAuthRequest{}, fmt.Errorf("generate nonce: %w", err)
	}
	return OIDCAuthRequest{
		State:    state,
		Nonce:    nonce,
		Verifier: oauth2.GenerateVerifier(),
	}, nil
}

// AuthCodeURL is where the browser is sent to log in at the provider.
func (p *OIDCProvider) AuthCodeURL(req OIDCAuthRequest) string {
	return p.oauth2.AuthCodeURL(req.State, oauth2.S256ChallengeOption(req.Verifier), oidc.Nonce(req.Nonce))
}

// Exchange trades the authorization code for tokens, verifies the ID token
// against the provider's keys and req.Nonce, and returns its claims.
func (p *OIDCProvider) Exchange(ctx context.Context, code string, req OIDCAuthRequest) (OIDCClaims, error) {
	token, err := p.oauth2.Exchange(ctx, code, oauth2.VerifierOption(req.Verifier))
	if err != nil {
		return OIDCClaims{}, fmt.Errorf("exchange code: %w", err)
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return OIDCClaims{}, errors.New("token response has no id_token")
	}

	idToken, err := p.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return OIDCClaims{}, fmt.Errorf("verify id token: %w", err)
	}

	if subtle.ConstantTimeCompare([]byte(idToken.Nonce), []byte(req.Nonce)) != 1 {
		return OIDCClaims{}, errors.New("id token nonce does not match")
	}

	var claims OIDCClaims
	if err := idToken.Claims(&claims); err != nil {
		return OIDCClaims{}, fmt.Errorf("decode id token claims: %w", err)
	}

	if claims.Email == "" {
		info, err := p.provider.UserInfo(ctx, oauth2.StaticTokenSource(token))
		if err != nil {
			return OIDCClaims{}, fmt.Errorf("fetch userinfo: %w", err)
		}

		if info.Subject != claims.Subject {
			return OIDCClaims{}, errors.New("userinfo subject does not match id token")
		}
		var extra OIDCClaims
		if err := info.Claims(&extra); err != nil {
			return OIDCClaims{}, fmt.Errorf("decode userinfo claims: %w", err)
		}

		claims.Email = extra.Email
		claims.EmailVerified = extra.EmailVerified
		if claims.PreferredUsername == "" {
			claims.PreferredUsername = extra.PreferredUsername
		}
		if claims.Name == "" {
			claims.Name = extra.Name
		}
	}

	claims.Email = strings.TrimSpace(claims.Email)
	if claims.Subject == "" {
		return OIDCClaims{}, errors.New("id token has no subject")
	}
	if claims.Email == "" {
		return OIDCClaims{}, errors.New("provider returned no email; request the email scope")
	}

	return claims, nil
}

// DomainAllowed reports whether a new user with email may be created.
// An empty AllowedDomains list allows any email.
func (p *OIDCProvider) DomainAllowed(email string) bool {
	if len(p.AllowedDomains) == 0 {
		return true
	}
	at := strings.LastIndexByte(email, '@')
	if at < 0 {
		return false
	}
	return slices.Contains(p.AllowedDomains, strings.ToLower(email[at+1:]))
}

// minUsernameLength mirrors the users_username_not_blank check on auth.users.
const minUsernameLength = 3

// UsernameCandidate derives the preferred username for a new user from the
// claims: preferred_username, falling back to the local part of the email.
func UsernameCandidate(c OIDCClaims) string {
	name := strings.TrimSpace(c.PreferredUsername)
	if name == "" {
		name = c.Email
		if at := strings.LastIndexByte(name, '@'); at >= 0 {
			name = name[:at]
		}
	}

	name = strings.Join(strings.Fields(name), ".")
	if n := utf8.RuneCountInString(name); n < minUsernameLength {
		name += strings.Repeat("_", minUsernameLength-n)
	}
	return name
}
