package oauthintrospect

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const typeName = "OAuthIntrospect"

type introspectMiddleware struct {
	next           http.Handler
	name           string
	introspectURL  string
	clientID       string
	clientSecret   string
	requiredScopes []string
	client         *http.Client
}

// New creates an OAuth 2.0 Token Introspection middleware.
func New(ctx context.Context, next http.Handler, config dynamic.OAuthIntrospect, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")
	if config.IntrospectURL == "" {
		return nil, fmt.Errorf("introspectUrl is required")
	}
	return &introspectMiddleware{
		next: next, name: name,
		introspectURL: config.IntrospectURL, clientID: config.ClientID,
		clientSecret: config.ClientSecret, requiredScopes: config.RequiredScopes,
		client: &http.Client{},
	}, nil
}

func (m *introspectMiddleware) GetTracingInformation() (string, string) { return m.name, typeName }

func (m *introspectMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), m.name, typeName)
	token := extractBearer(req)
	if token == "" {
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	active, scopes, sub, err := m.introspect(req.Context(), token)
	if err != nil || !active {
		logger.Debug().Err(err).Msg("Token introspection failed")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	if !m.hasScopes(scopes) {
		http.Error(rw, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	if sub != "" { req.Header.Set("X-Auth-Subject", sub) }
	m.next.ServeHTTP(rw, req)
}

func (m *introspectMiddleware) introspect(ctx context.Context, token string) (bool, []string, string, error) {
	data := url.Values{"token": {token}}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, m.introspectURL, strings.NewReader(data.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if m.clientID != "" { req.SetBasicAuth(m.clientID, m.clientSecret) }

	resp, err := m.client.Do(req)
	if err != nil { return false, nil, "", err }
	defer resp.Body.Close()

	var result struct {
		Active bool   `json:"active"`
		Scope  string `json:"scope"`
		Sub    string `json:"sub"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil { return false, nil, "", err }
	return result.Active, strings.Fields(result.Scope), result.Sub, nil
}

func (m *introspectMiddleware) hasScopes(scopes []string) bool {
	if len(m.requiredScopes) == 0 { return true }
	have := make(map[string]bool, len(scopes))
	for _, s := range scopes { have[s] = true }
	for _, s := range m.requiredScopes { if !have[s] { return false } }
	return true
}

func extractBearer(req *http.Request) string {
	a := req.Header.Get("Authorization")
	if strings.HasPrefix(a, "Bearer ") { return a[7:] }
	return ""
}
