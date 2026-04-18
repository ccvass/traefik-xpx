package apikey

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/accesslog"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const (
	typeName         = "APIKey"
	defaultHeaderName = "X-API-Key"
)

type apiKey struct {
	next         http.Handler
	name         string
	keys         map[string]string // hash -> metadata
	headerName   string
	queryParam   string
	cookieName   string
	headerField  string
	removeHeader bool
}

// New creates an API key authentication middleware.
func New(ctx context.Context, next http.Handler, config dynamic.APIKey, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	keys, err := loadKeys(config.KeysFile, config.Keys)
	if err != nil {
		return nil, fmt.Errorf("loading API keys: %w", err)
	}

	if len(keys) == 0 {
		return nil, fmt.Errorf("no API keys configured")
	}

	headerName := config.HeaderName
	if headerName == "" {
		headerName = defaultHeaderName
	}

	return &apiKey{
		next:         next,
		name:         name,
		keys:         keys,
		headerName:   headerName,
		queryParam:   config.QueryParam,
		cookieName:   config.CookieName,
		headerField:  config.HeaderField,
		removeHeader: config.RemoveHeader,
	}, nil
}

func (a *apiKey) GetTracingInformation() (string, string) {
	return a.name, typeName
}

func (a *apiKey) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), a.name, typeName)

	key := a.extractKey(req)
	if key == "" {
		logger.Debug().Msg("No API key found in request")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	metadata, ok := a.validateKey(key)
	if !ok {
		logger.Debug().Msg("Invalid API key")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	logger.Debug().Msg("Authentication succeeded")

	logData := accesslog.GetLogData(req)
	if logData != nil {
		logData.Core[accesslog.ClientUsername] = metadata
	}

	if a.headerField != "" {
		req.Header.Del(a.headerField)
		req.Header[a.headerField] = []string{metadata}
	}

	if a.removeHeader {
		req.Header.Del(a.headerName)
	}

	a.next.ServeHTTP(rw, req)
}

// extractKey extracts the API key from the request (header, query param, or cookie).
func (a *apiKey) extractKey(req *http.Request) string {
	// Header takes priority.
	if key := req.Header.Get(a.headerName); key != "" {
		return key
	}

	// Then query parameter.
	if a.queryParam != "" {
		if key := req.URL.Query().Get(a.queryParam); key != "" {
			return key
		}
	}

	// Then cookie.
	if a.cookieName != "" {
		if cookie, err := req.Cookie(a.cookieName); err == nil && cookie.Value != "" {
			return cookie.Value
		}
	}

	return ""
}

// validateKey checks the provided key against stored keys using constant-time comparison.
func (a *apiKey) validateKey(key string) (string, bool) {
	hash := hashKey(key)

	for storedHash, metadata := range a.keys {
		if subtle.ConstantTimeCompare([]byte(hash), []byte(storedHash)) == 1 {
			return metadata, true
		}
	}

	return "", false
}

func hashKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}

// loadKeys loads API keys from config entries and an optional file.
func loadKeys(fileName string, entries []dynamic.APIKeyEntry) (map[string]string, error) {
	keys := make(map[string]string)

	for _, entry := range entries {
		if entry.Value == "" {
			continue
		}
		keys[hashKey(entry.Value)] = entry.Metadata
	}

	if fileName != "" {
		fileKeys, err := loadKeysFromFile(fileName)
		if err != nil {
			return nil, err
		}
		for h, m := range fileKeys {
			keys[h] = m
		}
	}

	return keys, nil
}

func loadKeysFromFile(filename string) (map[string]string, error) {
	dat, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("reading keys file %s: %w", filename, err)
	}

	keys := make(map[string]string)

	for _, rawLine := range strings.Split(string(dat), "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Format: key or key:metadata
		parts := strings.SplitN(line, ":", 2)
		key := strings.TrimSpace(parts[0])
		metadata := ""
		if len(parts) == 2 {
			metadata = strings.TrimSpace(parts[1])
		}

		if key != "" {
			keys[hashKey(key)] = metadata
		}
	}

	return keys, nil
}
