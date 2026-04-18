package distributed

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

// Config holds distributed ACME configuration.
type Config struct {
	RedisURL      string        `json:"redisUrl" toml:"redisUrl" yaml:"redisUrl"`
	RedisPassword string        `json:"redisPassword,omitempty" toml:"redisPassword,omitempty" yaml:"redisPassword,omitempty"`
	KeyPrefix     string        `json:"keyPrefix,omitempty" toml:"keyPrefix,omitempty" yaml:"keyPrefix,omitempty"`
	LockTTL       time.Duration `json:"lockTtl,omitempty" toml:"lockTtl,omitempty" yaml:"lockTtl,omitempty"`
}

// CertEntry represents a stored certificate.
type CertEntry struct {
	Domain      string    `json:"domain"`
	Certificate []byte    `json:"certificate"`
	PrivateKey  []byte    `json:"privateKey"`
	ExpiresAt   time.Time `json:"expiresAt"`
	IssuedAt    time.Time `json:"issuedAt"`
}

// Store provides distributed certificate storage via Redis.
type Store struct {
	rdb       *redis.Client
	prefix    string
	lockTTL   time.Duration
	mu        sync.Mutex
}

// NewStore creates a new distributed ACME store.
func NewStore(config Config) (*Store, error) {
	opts, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing Redis URL: %w", err)
	}
	if config.RedisPassword != "" {
		opts.Password = config.RedisPassword
	}

	prefix := config.KeyPrefix
	if prefix == "" {
		prefix = "traefik:acme:"
	}
	lockTTL := config.LockTTL
	if lockTTL <= 0 {
		lockTTL = 2 * time.Minute
	}

	return &Store{
		rdb:     redis.NewClient(opts),
		prefix:  prefix,
		lockTTL: lockTTL,
	}, nil
}

// GetCertificate retrieves a certificate for the given domain.
func (s *Store) GetCertificate(ctx context.Context, domain string) (*CertEntry, error) {
	data, err := s.rdb.Get(ctx, s.prefix+"cert:"+domain).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var entry CertEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return nil, err
	}
	return &entry, nil
}

// StoreCertificate stores a certificate for the given domain.
func (s *Store) StoreCertificate(ctx context.Context, entry CertEntry) error {
	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	ttl := time.Until(entry.ExpiresAt) + 24*time.Hour // Keep slightly past expiry.
	return s.rdb.Set(ctx, s.prefix+"cert:"+entry.Domain, data, ttl).Err()
}

// AcquireLock attempts to acquire a distributed lock for certificate issuance.
func (s *Store) AcquireLock(ctx context.Context, domain string) (bool, error) {
	return s.rdb.SetNX(ctx, s.prefix+"lock:"+domain, "1", s.lockTTL).Result()
}

// ReleaseLock releases a distributed lock.
func (s *Store) ReleaseLock(ctx context.Context, domain string) {
	s.rdb.Del(ctx, s.prefix+"lock:"+domain)
}

// ListDomains returns all domains with stored certificates.
func (s *Store) ListDomains(ctx context.Context) ([]string, error) {
	keys, err := s.rdb.Keys(ctx, s.prefix+"cert:*").Result()
	if err != nil {
		return nil, err
	}

	domains := make([]string, 0, len(keys))
	prefixLen := len(s.prefix + "cert:")
	for _, k := range keys {
		if len(k) > prefixLen {
			domains = append(domains, k[prefixLen:])
		}
	}
	return domains, nil
}

// NeedsRenewal checks if a certificate needs renewal (within 30 days of expiry).
func (s *Store) NeedsRenewal(ctx context.Context, domain string) (bool, error) {
	entry, err := s.GetCertificate(ctx, domain)
	if err != nil {
		return false, err
	}
	if entry == nil {
		return true, nil
	}
	return time.Until(entry.ExpiresAt) < 30*24*time.Hour, nil
}

// Ping checks Redis connectivity.
func (s *Store) Ping(ctx context.Context) error {
	return s.rdb.Ping(ctx).Err()
}

// Close closes the Redis connection.
func (s *Store) Close() error {
	return s.rdb.Close()
}

func init() {
	log.Debug().Msg("Distributed ACME store initialized")
}
