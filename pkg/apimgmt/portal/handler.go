package portal

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Config holds developer portal configuration.
type Config struct {
	Enabled      bool   `json:"enabled" toml:"enabled" yaml:"enabled"`
	Title        string `json:"title,omitempty" toml:"title,omitempty" yaml:"title,omitempty"`
	Description  string `json:"description,omitempty" toml:"description,omitempty" yaml:"description,omitempty"`
	BasePath     string `json:"basePath,omitempty" toml:"basePath,omitempty" yaml:"basePath,omitempty"`
	AuthRequired bool   `json:"authRequired,omitempty" toml:"authRequired,omitempty" yaml:"authRequired,omitempty"`
	AuthSecret   string `json:"authSecret,omitempty" toml:"authSecret,omitempty" yaml:"authSecret,omitempty"`
}

// APICatalogEntry represents an API in the portal catalog.
type APICatalogEntry struct {
	Name        string `json:"name"`
	Group       string `json:"group,omitempty"`
	Description string `json:"description,omitempty"`
	Version     string `json:"version"`
	Status      string `json:"status"`
	DocsURL     string `json:"docsUrl,omitempty"`
}

// Developer represents a registered developer.
type Developer struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	APIKeys   []APIKey  `json:"apiKeys,omitempty"`
}

// APIKey represents a developer's API key.
type APIKey struct {
	ID        string    `json:"id"`
	KeyHash   string    `json:"keyHash,omitempty"`
	KeyPrefix string    `json:"keyPrefix,omitempty"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	LastUsed  time.Time `json:"lastUsed,omitempty"`
	Requests  int64     `json:"requests"`
}

// Handler serves the developer portal API.
type Handler struct {
	mu         sync.RWMutex
	config     Config
	catalog    []APICatalogEntry
	developers map[string]*Developer
	basePath   string
}

// NewHandler creates a new portal API handler.
func NewHandler(config Config) *Handler {
	bp := config.BasePath
	if bp == "" {
		bp = "/portal"
	}
	return &Handler{
		config:     config,
		catalog:    []APICatalogEntry{},
		developers: make(map[string]*Developer),
		basePath:   strings.TrimRight(bp, "/"),
	}
}

// SetCatalog updates the API catalog.
func (h *Handler) SetCatalog(entries []APICatalogEntry) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.catalog = entries
}

// ServeHTTP routes portal API requests with auth enforcement.
func (h *Handler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	// Enforce authentication on write operations when AuthRequired is set.
	if h.config.AuthRequired && req.Method != http.MethodGet {
		if !h.checkAuth(req) {
			writeJSON(rw, http.StatusUnauthorized, map[string]string{"error": "authentication required"})
			return
		}
	}

	path := strings.TrimPrefix(req.URL.Path, h.basePath)
	path = strings.TrimPrefix(path, "/api")

	switch {
	case path == "/catalog" && req.Method == http.MethodGet:
		h.handleCatalog(rw, req)
	case path == "/developers" && req.Method == http.MethodPost:
		h.handleRegister(rw, req)
	case strings.HasPrefix(path, "/developers/") && strings.HasSuffix(path, "/keys") && req.Method == http.MethodPost:
		devID := strings.TrimSuffix(strings.TrimPrefix(path, "/developers/"), "/keys")
		h.handleCreateKey(rw, req, devID)
	case strings.HasPrefix(path, "/developers/") && strings.HasSuffix(path, "/keys") && req.Method == http.MethodGet:
		devID := strings.TrimSuffix(strings.TrimPrefix(path, "/developers/"), "/keys")
		h.handleListKeys(rw, req, devID)
	default:
		http.NotFound(rw, req)
	}
}

func (h *Handler) checkAuth(req *http.Request) bool {
	if h.config.AuthSecret == "" {
		return false
	}
	token := req.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	return token == h.config.AuthSecret
}

func (h *Handler) handleCatalog(rw http.ResponseWriter, req *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	search := strings.ToLower(req.URL.Query().Get("search"))
	var results []APICatalogEntry

	for _, entry := range h.catalog {
		if search == "" || strings.Contains(strings.ToLower(entry.Name), search) ||
			strings.Contains(strings.ToLower(entry.Group), search) {
			results = append(results, entry)
		}
	}

	writeJSON(rw, http.StatusOK, results)
}

func (h *Handler) handleRegister(rw http.ResponseWriter, req *http.Request) {
	var input struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
		writeJSON(rw, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if input.Email == "" || !strings.Contains(input.Email, "@") {
		writeJSON(rw, http.StatusBadRequest, map[string]string{"error": "valid email required"})
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	id, err := generateID()
	if err != nil {
		writeJSON(rw, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	dev := &Developer{
		ID:        id,
		Email:     input.Email,
		Name:      input.Name,
		CreatedAt: time.Now(),
	}
	h.developers[id] = dev

	writeJSON(rw, http.StatusCreated, dev)
}

func (h *Handler) handleCreateKey(rw http.ResponseWriter, _ *http.Request, devID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	dev, ok := h.developers[devID]
	if !ok {
		writeJSON(rw, http.StatusNotFound, map[string]string{"error": "developer not found"})
		return
	}

	key, err := generateAPIKey()
	if err != nil {
		writeJSON(rw, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}

	id, err := generateID()
	if err != nil {
		writeJSON(rw, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}

	apiKey := APIKey{
		ID:        id,
		KeyHash:   hashKey(key),
		KeyPrefix: key[:12],
		Name:      fmt.Sprintf("key-%d", len(dev.APIKeys)+1),
		CreatedAt: time.Now(),
	}
	dev.APIKeys = append(dev.APIKeys, apiKey)

	// Return full key only once at creation.
	writeJSON(rw, http.StatusCreated, map[string]string{
		"id":   apiKey.ID,
		"key":  key,
		"name": apiKey.Name,
		"note": "Store this key securely. It will not be shown again.",
	})
}

func (h *Handler) handleListKeys(rw http.ResponseWriter, _ *http.Request, devID string) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	dev, ok := h.developers[devID]
	if !ok {
		writeJSON(rw, http.StatusNotFound, map[string]string{"error": "developer not found"})
		return
	}

	// Only show prefix and metadata, never the full key or hash.
	type safeKey struct {
		ID        string    `json:"id"`
		Prefix    string    `json:"prefix"`
		Name      string    `json:"name"`
		CreatedAt time.Time `json:"createdAt"`
		Requests  int64     `json:"requests"`
	}
	keys := make([]safeKey, 0, len(dev.APIKeys))
	for _, k := range dev.APIKeys {
		keys = append(keys, safeKey{
			ID:        k.ID,
			Prefix:    k.KeyPrefix + "...",
			Name:      k.Name,
			CreatedAt: k.CreatedAt,
			Requests:  k.Requests,
		})
	}

	writeJSON(rw, http.StatusOK, keys)
}

func writeJSON(rw http.ResponseWriter, status int, v any) {
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(status)
	json.NewEncoder(rw).Encode(v)
}

func generateID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func generateAPIKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "tsk_" + hex.EncodeToString(b), nil
}

func hashKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}
