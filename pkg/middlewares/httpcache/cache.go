package httpcache

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
)

const (
	typeName          = "HTTPCache"
	defaultTTL        = 5 * time.Minute
	defaultMaxEntries = 10000
)

type cacheEntry struct {
	status  int
	headers http.Header
	body    []byte
	expiry  time.Time
}

type httpCacheMiddleware struct {
	next        http.Handler
	name        string
	ttl         time.Duration
	methods     map[string]bool
	statusCodes map[int]bool
	varyHeaders []string
	mu          sync.RWMutex
	entries     map[string]*cacheEntry
	maxEntries  int
}

// New creates an HTTP caching middleware.
func New(ctx context.Context, next http.Handler, config dynamic.HTTPCache, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	ttl := defaultTTL
	if config.DefaultTTL > 0 {
		ttl = time.Duration(config.DefaultTTL)
	}

	methods := map[string]bool{"GET": true, "HEAD": true}
	if len(config.Methods) > 0 {
		methods = make(map[string]bool, len(config.Methods))
		for _, m := range config.Methods {
			methods[strings.ToUpper(m)] = true
		}
	}

	statusCodes := map[int]bool{200: true, 301: true, 404: true}
	if len(config.StatusCodes) > 0 {
		statusCodes = make(map[int]bool, len(config.StatusCodes))
		for _, c := range config.StatusCodes {
			statusCodes[c] = true
		}
	}

	maxEntries := defaultMaxEntries
	if config.MaxEntries > 0 {
		maxEntries = config.MaxEntries
	}

	return &httpCacheMiddleware{
		next:        next,
		name:        name,
		ttl:         ttl,
		methods:     methods,
		statusCodes: statusCodes,
		varyHeaders: config.VaryHeaders,
		entries:     make(map[string]*cacheEntry),
		maxEntries:  maxEntries,
	}, nil
}

func (c *httpCacheMiddleware) GetTracingInformation() (string, string) {
	return c.name, typeName
}

func (c *httpCacheMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	if !c.methods[req.Method] {
		c.next.ServeHTTP(rw, req)
		return
	}

	// Never cache requests with Authorization header to prevent cross-user leakage.
	if req.Header.Get("Authorization") != "" {
		rw.Header().Set("X-Cache", "BYPASS")
		c.next.ServeHTTP(rw, req)
		return
	}

	// Skip if client requests no-cache.
	if strings.Contains(req.Header.Get("Cache-Control"), "no-cache") {
		rw.Header().Set("X-Cache", "BYPASS")
		c.next.ServeHTTP(rw, req)
		return
	}

	key := c.cacheKey(req)

	// Check cache.
	c.mu.RLock()
	entry, ok := c.entries[key]
	c.mu.RUnlock()

	if ok && time.Now().Before(entry.expiry) {
		for k, v := range entry.headers {
			rw.Header()[k] = v
		}
		rw.Header().Set("X-Cache", "HIT")
		rw.WriteHeader(entry.status)
		rw.Write(entry.body)
		return
	}

	// Cache miss — buffer the response to set headers before writing.
	rec := &responseRecorder{statusCode: 200, headers: make(http.Header)}
	c.next.ServeHTTP(rec, req)

	// Respect backend Cache-Control directives.
	cc := rec.headers.Get("Cache-Control")
	noStore := strings.Contains(cc, "no-store") || strings.Contains(cc, "private")

	if !noStore && c.statusCodes[rec.statusCode] {
		c.mu.Lock()
		if len(c.entries) >= c.maxEntries {
			c.evict()
		}
		c.entries[key] = &cacheEntry{
			status:  rec.statusCode,
			headers: rec.headers.Clone(),
			body:    rec.body.Bytes(),
			expiry:  time.Now().Add(c.ttl),
		}
		c.mu.Unlock()
	}

	// Write response to client with X-Cache header set before body.
	for k, v := range rec.headers {
		rw.Header()[k] = v
	}
	rw.Header().Set("X-Cache", "MISS")
	rw.WriteHeader(rec.statusCode)
	rw.Write(rec.body.Bytes())
}

func (c *httpCacheMiddleware) cacheKey(req *http.Request) string {
	h := sha256.New()
	h.Write([]byte(req.Method))
	h.Write([]byte(req.URL.String()))

	if len(c.varyHeaders) > 0 {
		sorted := make([]string, len(c.varyHeaders))
		copy(sorted, c.varyHeaders)
		sort.Strings(sorted)
		for _, hdr := range sorted {
			h.Write([]byte(hdr + ":" + req.Header.Get(hdr)))
		}
	}

	return hex.EncodeToString(h.Sum(nil))
}

func (c *httpCacheMiddleware) evict() {
	now := time.Now()
	for k, v := range c.entries {
		if now.After(v.expiry) {
			delete(c.entries, k)
		}
	}
	for k := range c.entries {
		if len(c.entries) < c.maxEntries {
			break
		}
		delete(c.entries, k)
	}
}

// responseRecorder buffers the entire response so headers can be set before writing to client.
type responseRecorder struct {
	statusCode int
	headers    http.Header
	body       bytes.Buffer
}

func (r *responseRecorder) Header() http.Header {
	return r.headers
}

func (r *responseRecorder) WriteHeader(code int) {
	r.statusCode = code
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	return r.body.Write(b)
}
