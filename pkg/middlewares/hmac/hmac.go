package hmac

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"hash"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const (
	typeName           = "HMAC"
	defaultSigHeader   = "X-Signature"
	defaultAlgorithm   = "sha256"
	defaultMaxSkew     = 5 * time.Minute
)

type hmacMiddleware struct {
	next            http.Handler
	name            string
	secret          []byte
	hashFunc        func() hash.Hash
	signatureHeader string
	timestampHeader string
	maxSkew         time.Duration
	signedHeaders   []string
}

// New creates an HMAC authentication middleware.
func New(ctx context.Context, next http.Handler, config dynamic.HMAC, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	if config.Secret == "" {
		return nil, fmt.Errorf("HMAC secret is required")
	}

	hashFunc, err := getHashFunc(config.Algorithm)
	if err != nil {
		return nil, err
	}

	sigHeader := config.SignatureHeader
	if sigHeader == "" {
		sigHeader = defaultSigHeader
	}

	maxSkew := defaultMaxSkew
	if config.MaxSkew > 0 {
		maxSkew = time.Duration(config.MaxSkew)
	}

	return &hmacMiddleware{
		next:            next,
		name:            name,
		secret:          []byte(config.Secret),
		hashFunc:        hashFunc,
		signatureHeader: sigHeader,
		timestampHeader: config.TimestampHeader,
		maxSkew:         maxSkew,
		signedHeaders:   config.SignedHeaders,
	}, nil
}

func (h *hmacMiddleware) GetTracingInformation() (string, string) {
	return h.name, typeName
}

func (h *hmacMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), h.name, typeName)

	signature := req.Header.Get(h.signatureHeader)
	if signature == "" {
		logger.Debug().Msg("Missing HMAC signature header")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	// Replay protection via timestamp.
	if h.timestampHeader != "" {
		tsStr := req.Header.Get(h.timestampHeader)
		if tsStr != "" {
			ts, err := strconv.ParseInt(tsStr, 10, 64)
			if err == nil {
				diff := time.Since(time.Unix(ts, 0))
				if diff < 0 {
					diff = -diff
				}
				if diff > h.maxSkew {
					logger.Debug().Dur("skew", diff).Msg("Request timestamp outside allowed skew")
					observability.SetStatusErrorf(req.Context(), "Request expired")
					http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
					return
				}
			}
		}
	}

	// Read body for signature computation.
	body, err := io.ReadAll(req.Body)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to read request body")
		http.Error(rw, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(body))

	expected := h.computeSignature(req, body)

	// Strip common prefixes like "sha256=" used by GitHub webhooks.
	sig := signature
	if idx := strings.Index(sig, "="); idx > 0 && idx < 10 {
		sig = sig[idx+1:]
	}

	sigBytes, err := hex.DecodeString(sig)
	if err != nil {
		logger.Debug().Msg("Invalid signature encoding")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	if subtle.ConstantTimeCompare(sigBytes, expected) != 1 {
		logger.Debug().Msg("HMAC signature mismatch")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	logger.Debug().Msg("HMAC authentication succeeded")
	h.next.ServeHTTP(rw, req)
}

func (h *hmacMiddleware) computeSignature(req *http.Request, body []byte) []byte {
	mac := hmac.New(h.hashFunc, h.secret)

	// Include signed headers in deterministic order.
	if len(h.signedHeaders) > 0 {
		sorted := make([]string, len(h.signedHeaders))
		copy(sorted, h.signedHeaders)
		sort.Strings(sorted)
		for _, hdr := range sorted {
			mac.Write([]byte(strings.ToLower(hdr) + ":" + req.Header.Get(hdr) + "\n"))
		}
	}

	mac.Write(body)
	return mac.Sum(nil)
}

func getHashFunc(algorithm string) (func() hash.Hash, error) {
	switch strings.ToLower(algorithm) {
	case "sha256", "":
		return sha256.New, nil
	case "sha384":
		return sha512.New384, nil
	case "sha512":
		return sha512.New, nil
	default:
		return nil, fmt.Errorf("unsupported HMAC algorithm: %s", algorithm)
	}
}
