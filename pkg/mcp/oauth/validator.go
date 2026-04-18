package oauth

import (
	"context"
	"crypto/rsa"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Config holds OAuth resource server configuration.
type Config struct {
	IssuerURL      string   `json:"issuerUrl" toml:"issuerUrl" yaml:"issuerUrl"`
	Audience       string   `json:"audience,omitempty" toml:"audience,omitempty" yaml:"audience,omitempty"`
	RequiredScopes []string `json:"requiredScopes,omitempty" toml:"requiredScopes,omitempty" yaml:"requiredScopes,omitempty"`
	JWKSURL        string   `json:"jwksUrl,omitempty" toml:"jwksUrl,omitempty" yaml:"jwksUrl,omitempty"`
}

// TokenClaims holds validated token claims relevant to MCP.
type TokenClaims struct {
	Subject  string
	Issuer   string
	Audience []string
	Scopes   []string
	AgentID  string
	Expiry   time.Time
}

// Validator validates OAuth 2.1 tokens for MCP access.
type Validator struct {
	issuer         string
	audience       string
	requiredScopes map[string]bool
	jwksURL        string
	keys           *jwksCache
	client         *http.Client
}

// NewValidator creates a new OAuth token validator.
func NewValidator(config Config) (*Validator, error) {
	if config.IssuerURL == "" {
		return nil, fmt.Errorf("issuerUrl is required")
	}

	jwksURL := config.JWKSURL
	if jwksURL == "" {
		jwksURL = strings.TrimRight(config.IssuerURL, "/") + "/.well-known/jwks.json"
	}

	scopes := make(map[string]bool, len(config.RequiredScopes))
	for _, s := range config.RequiredScopes {
		scopes[s] = true
	}

	return &Validator{
		issuer:         config.IssuerURL,
		audience:       config.Audience,
		requiredScopes: scopes,
		jwksURL:        jwksURL,
		keys:           &jwksCache{},
		client:         &http.Client{Timeout: 10 * time.Second},
	}, nil
}

// ValidateToken validates a Bearer token and returns claims.
func (v *Validator) ValidateToken(ctx context.Context, tokenString string) (*TokenClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, _ := token.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("missing kid in token header")
		}

		key, err := v.getKey(ctx, kid)
		if err != nil {
			return nil, fmt.Errorf("fetching key %s: %w", kid, err)
		}
		return key, nil
	},
		jwt.WithIssuer(v.issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	tc := &TokenClaims{
		Subject: getStr(claims, "sub"),
		Issuer:  getStr(claims, "iss"),
		AgentID: getStr(claims, "agent_id"),
	}

	if aud, err := claims.GetAudience(); err == nil {
		tc.Audience = aud
	}
	if exp, err := claims.GetExpirationTime(); err == nil {
		tc.Expiry = exp.Time
	}

	// Parse scopes from "scope" claim (space-separated per RFC).
	if scopeStr := getStr(claims, "scope"); scopeStr != "" {
		tc.Scopes = strings.Fields(scopeStr)
	}

	// Validate audience.
	if v.audience != "" {
		found := false
		for _, a := range tc.Audience {
			if a == v.audience {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("token audience %v does not match %s", tc.Audience, v.audience)
		}
	}

	// Validate required scopes.
	if len(v.requiredScopes) > 0 {
		tokenScopes := make(map[string]bool, len(tc.Scopes))
		for _, s := range tc.Scopes {
			tokenScopes[s] = true
		}
		for scope := range v.requiredScopes {
			if !tokenScopes[scope] {
				return nil, fmt.Errorf("missing required scope: %s", scope)
			}
		}
	}

	return tc, nil
}

// HasScope checks if the token has a specific scope.
func (tc *TokenClaims) HasScope(scope string) bool {
	for _, s := range tc.Scopes {
		if s == scope {
			return true
		}
	}
	return false
}

// ScopeToToolMap maps OAuth scopes to allowed MCP tools.
type ScopeToToolMap map[string][]string // scope -> tools

// AllowedTools returns the tools allowed by the token's scopes.
func (m ScopeToToolMap) AllowedTools(claims *TokenClaims) []string {
	seen := make(map[string]bool)
	var tools []string
	for _, scope := range claims.Scopes {
		for _, tool := range m[scope] {
			if !seen[tool] {
				seen[tool] = true
				tools = append(tools, tool)
			}
		}
	}
	return tools
}

func (v *Validator) getKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	if key := v.keys.get(kid); key != nil {
		return key, nil
	}

	if err := v.fetchJWKS(ctx); err != nil {
		return nil, err
	}

	key := v.keys.get(kid)
	if key == nil {
		return nil, fmt.Errorf("key %s not found in JWKS", kid)
	}
	return key, nil
}

func (v *Validator) fetchJWKS(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}

	resp, err := v.client.Do(req)
	if err != nil {
		return fmt.Errorf("fetching JWKS: %w", err)
	}
	defer resp.Body.Close()

	var jwks struct {
		Keys []json.RawMessage `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("decoding JWKS: %w", err)
	}

	for _, raw := range jwks.Keys {
		var header struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		}
		if err := json.Unmarshal(raw, &header); err != nil {
			continue
		}
		if header.Kty != "RSA" || header.Kid == "" {
			continue
		}

		// Parse RSA public key from JWK.
		key, err := parseRSAPublicKey(header.N, header.E)
		if err != nil {
			continue
		}
		v.keys.set(header.Kid, key)
	}

	return nil
}

func getStr(claims jwt.MapClaims, key string) string {
	v, _ := claims[key].(string)
	return v
}

// jwksCache is a thread-safe cache for JWKS keys.
type jwksCache struct {
	mu   sync.RWMutex
	keys map[string]*rsa.PublicKey
}

func (c *jwksCache) get(kid string) *rsa.PublicKey {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.keys == nil {
		return nil
	}
	return c.keys[kid]
}

func (c *jwksCache) set(kid string, key *rsa.PublicKey) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.keys == nil {
		c.keys = make(map[string]*rsa.PublicKey)
	}
	c.keys[kid] = key
}
