package distributedinflight

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
)

const typeName = "DistributedInFlightReq"

type distributedInFlight struct {
	next   http.Handler
	name   string
	amount int64
	client *redis.Client
	keyFn  func(*http.Request) string
	logger zerolog.Logger
}

// New creates a distributed in-flight request limiting middleware.
func New(ctx context.Context, next http.Handler, config dynamic.DistributedInFlightReq, name string) (http.Handler, error) {
	logger := middlewares.GetLogger(ctx, name, typeName)
	logger.Debug().Msg("Creating middleware")

	if config.Amount <= 0 {
		return nil, fmt.Errorf("amount must be > 0")
	}
	if config.RedisURL == "" {
		return nil, fmt.Errorf("redisUrl is required")
	}

	opts, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis URL: %w", err)
	}
	if config.RedisPassword != "" {
		opts.Password = config.RedisPassword
	}

	client := redis.NewClient(opts)

	keyFn := sourceIP
	switch config.KeyFunc {
	case "header":
		if config.KeyHeader != "" {
			keyFn = func(r *http.Request) string { return r.Header.Get(config.KeyHeader) }
		}
	case "host":
		keyFn = func(r *http.Request) string { return r.Host }
	}

	return &distributedInFlight{
		next:   next,
		name:   name,
		amount: config.Amount,
		client: client,
		keyFn:  keyFn,
		logger: *logger,
	}, nil
}

func (d *distributedInFlight) GetTracingInformation() (string, string) {
	return d.name, typeName
}

func (d *distributedInFlight) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()
	key := "inflight:" + d.name + ":" + d.keyFn(req)

	// Increment counter.
	count, err := d.client.Incr(ctx, key).Result()
	if err != nil {
		d.logger.Error().Err(err).Msg("Redis error, rejecting request")
		http.Error(rw, "Service unavailable", http.StatusServiceUnavailable)
		return
	}

	// Ensure decrement on completion.
	defer d.client.Decr(ctx, key)

	if count > d.amount {
		d.client.Decr(ctx, key) // undo the increment
		http.Error(rw, "Too many in-flight requests", http.StatusTooManyRequests)
		return
	}

	d.next.ServeHTTP(rw, req)
}

func sourceIP(req *http.Request) string {
	if xff := req.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		return req.RemoteAddr
	}
	return host
}
