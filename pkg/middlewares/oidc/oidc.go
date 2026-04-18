package oidc

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/jwtauth"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const typeName = "OIDC"

// discoveryDoc holds OIDC discovery document fields.
type discoveryDoc struct {
	Issuer   string `json:"issuer"`
	JWKSURI  string `json:"jwks_uri"`
	AuthURL  string `json:"authorization_endpoint"`
	TokenURL string `json:"token_endpoint"`
	UserInfo string `json:"userinfo_endpoint"`
}

type oidcMiddleware struct {
	next     http.Handler
	name     string
	jwtInner http.Handler
}

// New creates an OIDC authentication middleware.
func New(ctx context.Context, next http.Handler, config dynamic.OIDC, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	if config.IssuerURL == "" {
		return nil, fmt.Errorf("OIDC issuerUrl is required")
	}

	// Discover JWKS URL from OIDC discovery endpoint.
	jwksURL := config.JWKSURL
	if jwksURL == "" {
		disc, err := discover(config.IssuerURL)
		if err != nil {
			return nil, fmt.Errorf("OIDC discovery failed: %w", err)
		}
		jwksURL = disc.JWKSURI
	}

	// Delegate to JWT middleware with discovered JWKS.
	jwtConfig := dynamic.JWTAuth{
		JWKSURL:       jwksURL,
		Issuer:        config.IssuerURL,
		Audience:      config.Audience,
		HeaderField:   config.HeaderField,
		ClaimsHeaders: config.ClaimsHeaders,
	}

	jwtHandler, err := jwtauth.New(ctx, next, jwtConfig, name)
	if err != nil {
		return nil, fmt.Errorf("creating JWT handler: %w", err)
	}

	return &oidcMiddleware{next: next, name: name, jwtInner: jwtHandler}, nil
}

func (o *oidcMiddleware) GetTracingInformation() (string, string) { return o.name, typeName }

func (o *oidcMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	token := req.Header.Get("Authorization")
	if !strings.HasPrefix(token, "Bearer ") {
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}
	o.jwtInner.ServeHTTP(rw, req)
}

func discover(issuerURL string) (*discoveryDoc, error) {
	url := strings.TrimRight(issuerURL, "/") + "/.well-known/openid-configuration"
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil { return nil, err }
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discovery returned %d", resp.StatusCode)
	}
	var doc discoveryDoc
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil { return nil, err }
	return &doc, nil
}
