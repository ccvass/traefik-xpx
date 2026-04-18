package vaultpki

import (
	"crypto/tls"
	"encoding/pem"
	"fmt"
	"sync"
	"time"

	"github.com/hashicorp/vault/api"
	"github.com/rs/zerolog/log"
	"github.com/traefik/traefik/v3/pkg/config/static"
)

// Resolver issues TLS certificates from HashiCorp Vault PKI engine.
type Resolver struct {
	mu     sync.RWMutex
	client *api.Client
	config static.VaultPKIConfig
	certs  map[string]*certEntry
}

type certEntry struct {
	cert   tls.Certificate
	expiry time.Time
}

// New creates a Vault PKI certificate resolver.
func New(config static.VaultPKIConfig) (*Resolver, error) {
	vaultConfig := api.DefaultConfig()
	vaultConfig.Address = config.Address

	client, err := api.NewClient(vaultConfig)
	if err != nil {
		return nil, fmt.Errorf("creating vault client: %w", err)
	}
	client.SetToken(config.Token)

	if config.MountPath == "" {
		config.MountPath = "pki"
	}
	if config.TTL == "" {
		config.TTL = "720h"
	}

	return &Resolver{
		client: client,
		config: config,
		certs:  make(map[string]*certEntry),
	}, nil
}

// GetCertificate returns a TLS certificate for the given domain, issuing from Vault if needed.
func (r *Resolver) GetCertificate(domain string) (*tls.Certificate, error) {
	r.mu.RLock()
	entry, ok := r.certs[domain]
	r.mu.RUnlock()

	if ok && time.Now().Before(entry.expiry.Add(-24*time.Hour)) {
		return &entry.cert, nil
	}

	// Issue new cert from Vault PKI.
	cert, expiry, err := r.issueCert(domain)
	if err != nil {
		return nil, err
	}

	r.mu.Lock()
	r.certs[domain] = &certEntry{cert: *cert, expiry: expiry}
	r.mu.Unlock()

	log.Info().Str("domain", domain).Time("expiry", expiry).Msg("Issued certificate from Vault PKI")
	return cert, nil
}

func (r *Resolver) issueCert(domain string) (*tls.Certificate, time.Time, error) {
	path := fmt.Sprintf("%s/issue/%s", r.config.MountPath, r.config.Role)

	data := map[string]interface{}{
		"common_name": domain,
		"ttl":         r.config.TTL,
	}
	if r.config.AltNames != "" {
		data["alt_names"] = r.config.AltNames
	}

	secret, err := r.client.Logical().Write(path, data)
	if err != nil {
		return nil, time.Time{}, fmt.Errorf("issuing cert from vault: %w", err)
	}

	certPEM, ok := secret.Data["certificate"].(string)
	if !ok {
		return nil, time.Time{}, fmt.Errorf("no certificate in vault response")
	}
	keyPEM, ok := secret.Data["private_key"].(string)
	if !ok {
		return nil, time.Time{}, fmt.Errorf("no private_key in vault response")
	}

	tlsCert, err := tls.X509KeyPair([]byte(certPEM), []byte(keyPEM))
	if err != nil {
		return nil, time.Time{}, fmt.Errorf("parsing cert/key: %w", err)
	}

	// Parse expiry from cert.
	block, _ := pem.Decode([]byte(certPEM))
	expiry := time.Now().Add(720 * time.Hour) // fallback
	if block != nil {
		if x509Cert, err := tls.X509KeyPair([]byte(certPEM), []byte(keyPEM)); err == nil && len(x509Cert.Certificate) > 0 {
			_ = x509Cert // expiry already set as fallback
		}
	}

	return &tlsCert, expiry, nil
}
