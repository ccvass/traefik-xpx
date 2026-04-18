package distributedratelimiter

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const typeName = "DistributedRateLimit"

// slidingWindowLua is an atomic Redis Lua script implementing a sliding window rate limiter.
// KEYS[1] = rate limit key
// ARGV[1] = window size in milliseconds
// ARGV[2] = max requests (average)
// ARGV[3] = current timestamp in milliseconds
// Returns: {allowed (0/1), remaining, reset_ms}
const slidingWindowLua = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local clear_before = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, clear_before)
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('PEXPIRE', key, window)
    return {1, limit - count - 1, clear_before + window}
end

redis.call('PEXPIRE', key, window)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local reset = 0
if #oldest >= 2 then
    reset = tonumber(oldest[2]) + window
end
return {0, 0, reset}
`

type distributedRateLimiter struct {
	next      http.Handler
	name      string
	rdb       *redis.Client
	script    *redis.Script
	average   int64
	burst     int64
	window    time.Duration
	keyFunc   func(*http.Request) string
	keyPrefix string
}

// New creates a distributed rate limiting middleware backed by Redis.
func New(ctx context.Context, next http.Handler, config dynamic.DistributedRateLimit, name string) (http.Handler, error) {
	logger := middlewares.GetLogger(ctx, name, typeName)
	logger.Debug().Msg("Creating middleware")

	if config.Average <= 0 {
		return nil, fmt.Errorf("average must be > 0")
	}
	if config.RedisURL == "" {
		return nil, fmt.Errorf("redisUrl is required")
	}

	opts, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing Redis URL: %w", err)
	}
	if config.RedisPassword != "" {
		opts.Password = config.RedisPassword
	}

	rdb := redis.NewClient(opts)

	// Verify connectivity.
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Warn().Err(err).Msg("Redis not reachable, will retry on requests")
	}

	window := time.Second
	if config.Period > 0 {
		window = time.Duration(config.Period)
	}

	burst := config.Burst
	if burst <= 0 {
		burst = config.Average
	}

	kf := keyFuncFromConfig(config)

	return &distributedRateLimiter{
		next:      next,
		name:      name,
		rdb:       rdb,
		script:    redis.NewScript(slidingWindowLua),
		average:   config.Average,
		burst:     burst,
		window:    window,
		keyFunc:   kf,
		keyPrefix: "trl:",
	}, nil
}

func (d *distributedRateLimiter) GetTracingInformation() (string, string) {
	return d.name, typeName
}

func (d *distributedRateLimiter) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), d.name, typeName)

	key := d.keyPrefix + d.keyFunc(req)
	now := time.Now().UnixMilli()

	result, err := d.script.Run(req.Context(), d.rdb, []string{key},
		d.window.Milliseconds(), d.average, now,
	).Int64Slice()

	if err != nil {
		// Graceful degradation: allow request on Redis failure.
		logger.Warn().Err(err).Msg("Redis error, allowing request (fallback)")
		d.next.ServeHTTP(rw, req)
		return
	}

	allowed := result[0] == 1
	remaining := result[1]
	resetMs := result[2]

	rw.Header().Set("X-RateLimit-Limit", strconv.FormatInt(d.average, 10))
	rw.Header().Set("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
	rw.Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetMs/1000, 10))

	if !allowed {
		retryAfter := (resetMs - now) / 1000
		if retryAfter <= 0 {
			retryAfter = 1
		}
		rw.Header().Set("Retry-After", strconv.FormatInt(retryAfter, 10))

		logger.Debug().Str("key", key).Msg("Rate limit exceeded")
		observability.SetStatusErrorf(req.Context(), "Rate limit exceeded")
		http.Error(rw, http.StatusText(http.StatusTooManyRequests), http.StatusTooManyRequests)
		return
	}

	d.next.ServeHTTP(rw, req)
}

func keyFuncFromConfig(config dynamic.DistributedRateLimit) func(*http.Request) string {
	switch config.KeyFunc {
	case "header":
		h := config.KeyHeader
		if h == "" {
			h = "X-Forwarded-For"
		}
		return func(r *http.Request) string {
			return r.Header.Get(h)
		}
	case "path":
		return func(r *http.Request) string {
			return r.URL.Path
		}
	default: // clientIP
		return func(r *http.Request) string {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				return r.RemoteAddr
			}
			return ip
		}
	}
}
