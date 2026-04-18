package jwtauth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const typeName = "JWTAuth"

type jwtMiddleware struct {
	next         http.Handler
	name         string
	issuer       string
	audience     string
	jwksURL      string
	secret       []byte
	headerField  string
	claimsHeaders map[string]string
	keys         sync.Map
	client       *http.Client
}

// New creates a JWT authentication middleware.
func New(ctx context.Context, next http.Handler, config dynamic.JWTAuth, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	if config.Secret == "" && config.JWKSURL == "" {
		return nil, fmt.Errorf("JWT requires secret or jwksUrl")
	}

	return &jwtMiddleware{
		next:          next,
		name:          name,
		issuer:        config.Issuer,
		audience:      config.Audience,
		jwksURL:       config.JWKSURL,
		secret:        []byte(config.Secret),
		headerField:   config.HeaderField,
		claimsHeaders: config.ClaimsHeaders,
		client:        &http.Client{Timeout: 10 * time.Second},
	}, nil
}

func (j *jwtMiddleware) GetTracingInformation() (string, string) { return j.name, typeName }

func (j *jwtMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), j.name, typeName)

	tokenStr := extractBearerToken(req)
	if tokenStr == "" {
		logger.Debug().Msg("No bearer token found")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	token, err := jwt.Parse(tokenStr, j.keyFunc,
		jwt.WithIssuer(j.issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		logger.Debug().Err(err).Msg("JWT validation failed")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	if j.audience != "" {
		aud, _ := claims.GetAudience()
		found := false
		for _, a := range aud {
			if a == j.audience { found = true; break }
		}
		if !found {
			http.Error(rw, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}
	}

	// Forward claims as headers.
	for claim, header := range j.claimsHeaders {
		if v, ok := claims[claim]; ok {
			req.Header.Set(header, fmt.Sprintf("%v", v))
		}
	}
	if j.headerField != "" {
		if sub, _ := claims["sub"].(string); sub != "" {
			req.Header.Set(j.headerField, sub)
		}
	}

	j.next.ServeHTTP(rw, req)
}

func (j *jwtMiddleware) keyFunc(token *jwt.Token) (any, error) {
	if len(j.secret) > 0 {
		return j.secret, nil
	}
	if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
		return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
	}
	kid, _ := token.Header["kid"].(string)
	if kid == "" {
		return nil, fmt.Errorf("missing kid")
	}
	if key, ok := j.keys.Load(kid); ok {
		return key, nil
	}
	if err := j.fetchJWKS(); err != nil {
		return nil, err
	}
	if key, ok := j.keys.Load(kid); ok {
		return key, nil
	}
	return nil, fmt.Errorf("key %s not found", kid)
}

func (j *jwtMiddleware) fetchJWKS() error {
	resp, err := j.client.Get(j.jwksURL)
	if err != nil { return err }
	defer resp.Body.Close()
	var jwks struct { Keys []json.RawMessage `json:"keys"` }
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil { return err }
	for _, raw := range jwks.Keys {
		var h struct { Kid, Kty, N, E string }
		json.Unmarshal(raw, &h)
		if h.Kty == "RSA" && h.Kid != "" {
			if key, err := parseRSA(h.N, h.E); err == nil {
				j.keys.Store(h.Kid, key)
			}
		}
	}
	return nil
}

func extractBearerToken(req *http.Request) string {
	auth := req.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") { return auth[7:] }
	return ""
}

func parseRSA(nStr, eStr string) (*rsa.PublicKey, error) {
	nb, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil { return nil, err }
	eb, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil { return nil, err }
	e := 0
	for _, b := range eb { e = e<<8 + int(b) }
	return &rsa.PublicKey{N: new(big.Int).SetBytes(nb), E: e}, nil
}
