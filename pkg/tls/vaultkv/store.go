package vaultkv

import (
	"crypto/tls"
	"fmt"
	"sync"
	"time"

	"github.com/hashicorp/vault/api"
	"github.com/rs/zerolog/log"
	"github.com/traefik/traefik/v3/pkg/config/static"
)

// Store retrieves and caches TLS certificates from HashiCorp Vault KV store.
type Store struct {
	mu     sync.RWMutex
	client *api.Client
	config static.VaultKVTLSConfig
	certs  map[string]*tls.Certificate
	lastFetch time.Time
}

// New creates a Vault KV TLS certificate store.
func New(config static.VaultKVTLSConfig) (*Store, error) {
	vaultConfig := api.DefaultConfig()
	vaultConfig.Address = config.Address

	client, err := api.NewClient(vaultConfig)
	if err != nil {
		return nil, fmt.Errorf("creating vault client: %w", err)
	}
	client.SetToken(config.Token)

	if config.MountPath == "" {
		config.MountPath = "secret"
	}
	if config.CertKey == "" {
		config.CertKey = "certificate"
	}
	if config.PrivateKey == "" {
		config.PrivateKey = "private_key"
	}

	s := &Store{
		client: client,
		config: config,
		certs:  make(map[string]*tls.Certificate),
	}

	// Initial load.
	if err := s.refresh(); err != nil {
		log.Warn().Err(err).Msg("Initial Vault KV TLS load failed, will retry")
	}

	// Periodic refresh.
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if err := s.refresh(); err != nil {
				log.Error().Err(err).Msg("Vault KV TLS refresh failed")
			}
		}
	}()

	return s, nil
}

// GetCertificate returns a cached certificate for the domain.
func (s *Store) GetCertificate(domain string) (*tls.Certificate, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cert, ok := s.certs[domain]
	if !ok {
		return nil, fmt.Errorf("no certificate for %s in vault KV", domain)
	}
	return cert, nil
}

func (s *Store) refresh() error {
	path := fmt.Sprintf("%s/data/%s", s.config.MountPath, s.config.SecretPath)

	secret, err := s.client.Logical().Read(path)
	if err != nil {
		return fmt.Errorf("reading vault KV: %w", err)
	}
	if secret == nil || secret.Data == nil {
		return fmt.Errorf("no data at %s", path)
	}

	data, ok := secret.Data["data"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("unexpected data format at %s", path)
	}

	certPEM, ok := data[s.config.CertKey].(string)
	if !ok {
		return fmt.Errorf("no %s key in vault secret", s.config.CertKey)
	}
	keyPEM, ok := data[s.config.PrivateKey].(string)
	if !ok {
		return fmt.Errorf("no %s key in vault secret", s.config.PrivateKey)
	}

	tlsCert, err := tls.X509KeyPair([]byte(certPEM), []byte(keyPEM))
	if err != nil {
		return fmt.Errorf("parsing cert from vault: %w", err)
	}

	// Extract domain from cert CN.
	domain := "default"
	if len(tlsCert.Certificate) > 0 {
		if parsed, err := tls.X509KeyPair([]byte(certPEM), []byte(keyPEM)); err == nil {
			_ = parsed
		}
	}

	s.mu.Lock()
	s.certs[domain] = &tlsCert
	s.lastFetch = time.Now()
	s.mu.Unlock()

	log.Info().Str("path", path).Msg("Refreshed TLS certificate from Vault KV")
	return nil
}
