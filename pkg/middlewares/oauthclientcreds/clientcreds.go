package oauthclientcreds

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const typeName = "OAuthClientCreds"

type clientCredsMiddleware struct {
	next           http.Handler
	name           string
	tokenURL       string
	requiredScopes []string
	validClients   map[string]string // clientID -> clientSecret
	mu             sync.RWMutex
	tokenCache     map[string]time.Time // token -> expiry
	client         *http.Client
}

// New creates an OAuth 2.0 Client Credentials validation middleware.
func New(ctx context.Context, next http.Handler, config dynamic.OAuthClientCreds, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")
	if config.TokenURL == "" {
		return nil, fmt.Errorf("tokenUrl is required")
	}
	clients := make(map[string]string, len(config.ValidClients))
	for _, c := range config.ValidClients {
		clients[c.ClientID] = c.ClientSecret
	}
	return &clientCredsMiddleware{
		next: next, name: name, tokenURL: config.TokenURL,
		requiredScopes: config.RequiredScopes, validClients: clients,
		tokenCache: make(map[string]time.Time), client: &http.Client{},
	}, nil
}

func (m *clientCredsMiddleware) GetTracingInformation() (string, string) { return m.name, typeName }

func (m *clientCredsMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), m.name, typeName)

	clientID, clientSecret, ok := req.BasicAuth()
	if !ok {
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	expected, exists := m.validClients[clientID]
	if !exists || expected != clientSecret {
		logger.Debug().Str("client", clientID).Msg("Invalid client credentials")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	req.Header.Set("X-Client-ID", clientID)
	m.next.ServeHTTP(rw, req)
}

// TokenExchange performs a client_credentials grant and returns an access token.
func TokenExchange(ctx context.Context, tokenURL, clientID, clientSecret string, scopes []string) (string, time.Duration, error) {
	data := url.Values{
		"grant_type": {"client_credentials"},
		"scope":      {strings.Join(scopes, " ")},
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientID, clientSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil { return "", 0, err }
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("token endpoint returned %d", resp.StatusCode)
	}

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil { return "", 0, err }
	return result.AccessToken, time.Duration(result.ExpiresIn) * time.Second, nil
}
