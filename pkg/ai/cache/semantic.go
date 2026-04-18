package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"strings"
	"sync"
	"time"
)

// Config holds semantic cache configuration.
type Config struct {
	MaxEntries       int           `json:"maxEntries,omitempty" toml:"maxEntries,omitempty" yaml:"maxEntries,omitempty"`
	TTL              time.Duration `json:"ttl,omitempty" toml:"ttl,omitempty" yaml:"ttl,omitempty"`
	SimilarityThreshold float64   `json:"similarityThreshold,omitempty" toml:"similarityThreshold,omitempty" yaml:"similarityThreshold,omitempty"`
}

// Entry represents a cached AI response.
type Entry struct {
	Key       string
	Model     string
	Prompt    string
	Response  string
	Tokens    int
	CreatedAt time.Time
	ExpiresAt time.Time
}

// SemanticCache caches AI responses using normalized prompt keys.
type SemanticCache struct {
	mu         sync.RWMutex
	entries    map[string]*Entry
	maxEntries int
	ttl        time.Duration
}

// New creates a new semantic cache.
func New(config Config) *SemanticCache {
	maxEntries := config.MaxEntries
	if maxEntries <= 0 {
		maxEntries = 1000
	}
	ttl := config.TTL
	if ttl <= 0 {
		ttl = 30 * time.Minute
	}

	return &SemanticCache{
		entries:    make(map[string]*Entry),
		maxEntries: maxEntries,
		ttl:        ttl,
	}
}

// Get retrieves a cached response for the given model and prompt.
func (c *SemanticCache) Get(model, prompt string) (*Entry, bool) {
	key := cacheKey(model, prompt)

	c.mu.RLock()
	entry, ok := c.entries[key]
	c.mu.RUnlock()

	if !ok || time.Now().After(entry.ExpiresAt) {
		return nil, false
	}
	return entry, true
}

// Set stores a response in the cache.
func (c *SemanticCache) Set(model, prompt, response string, tokens int) {
	key := cacheKey(model, prompt)
	now := time.Now()

	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= c.maxEntries {
		c.evict()
	}

	c.entries[key] = &Entry{
		Key:       key,
		Model:     model,
		Prompt:    prompt,
		Response:  response,
		Tokens:    tokens,
		CreatedAt: now,
		ExpiresAt: now.Add(c.ttl),
	}
}

// Invalidate removes a specific cache entry.
func (c *SemanticCache) Invalidate(model, prompt string) {
	key := cacheKey(model, prompt)
	c.mu.Lock()
	delete(c.entries, key)
	c.mu.Unlock()
}

// Stats returns cache statistics.
func (c *SemanticCache) Stats() (entries int, tokensSaved int) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entries = len(c.entries)
	for _, e := range c.entries {
		tokensSaved += e.Tokens
	}
	return
}

// cacheKey generates a normalized cache key from model and prompt.
func cacheKey(model, prompt string) string {
	normalized := normalizePrompt(prompt)
	h := sha256.New()
	h.Write([]byte(model))
	h.Write([]byte(":"))
	h.Write([]byte(normalized))
	return hex.EncodeToString(h.Sum(nil))
}

// normalizePrompt normalizes a prompt for cache key generation.
// Lowercases, trims whitespace, collapses spaces, and sorts words for basic semantic matching.
func normalizePrompt(prompt string) string {
	lower := strings.ToLower(strings.TrimSpace(prompt))
	// Collapse multiple spaces.
	fields := strings.Fields(lower)
	// Sort words for order-independent matching.
	sorted := make([]string, len(fields))
	copy(sorted, fields)
	sort.Strings(sorted)
	return strings.Join(sorted, " ")
}

func (c *SemanticCache) evict() {
	now := time.Now()
	// Remove expired first.
	for k, v := range c.entries {
		if now.After(v.ExpiresAt) {
			delete(c.entries, k)
		}
	}
	// If still over limit, remove oldest.
	for len(c.entries) >= c.maxEntries {
		var oldestKey string
		var oldestTime time.Time
		for k, v := range c.entries {
			if oldestKey == "" || v.CreatedAt.Before(oldestTime) {
				oldestKey = k
				oldestTime = v.CreatedAt
			}
		}
		if oldestKey != "" {
			delete(c.entries, oldestKey)
		}
	}
}
