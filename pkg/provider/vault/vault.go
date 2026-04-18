package vault

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	vaultapi "github.com/hashicorp/vault/api"
	"github.com/rs/zerolog/log"
)

// Config holds Vault provider configuration.
type Config struct {
	Address     string        `json:"address" toml:"address" yaml:"address"`
	Token       string        `json:"token,omitempty" toml:"token,omitempty" yaml:"token,omitempty"`
	RoleID      string        `json:"roleId,omitempty" toml:"roleId,omitempty" yaml:"roleId,omitempty"`
	SecretID    string        `json:"secretId,omitempty" toml:"secretId,omitempty" yaml:"secretId,omitempty"`
	Namespace   string        `json:"namespace,omitempty" toml:"namespace,omitempty" yaml:"namespace,omitempty"`
	MountPath   string        `json:"mountPath,omitempty" toml:"mountPath,omitempty" yaml:"mountPath,omitempty"`
	RefreshInterval time.Duration `json:"refreshInterval,omitempty" toml:"refreshInterval,omitempty" yaml:"refreshInterval,omitempty"`
}

// Provider fetches secrets from HashiCorp Vault.
type Provider struct {
	client    *vaultapi.Client
	mountPath string
	mu        sync.RWMutex
	cache     map[string]*cachedSecret
	refresh   time.Duration
	cancel    context.CancelFunc
}

type cachedSecret struct {
	data   map[string]string
	expiry time.Time
}

// New creates a new Vault provider.
func New(config Config) (*Provider, error) {
	if config.Address == "" {
		return nil, fmt.Errorf("vault address is required")
	}

	vaultCfg := vaultapi.DefaultConfig()
	vaultCfg.Address = config.Address

	client, err := vaultapi.NewClient(vaultCfg)
	if err != nil {
		return nil, fmt.Errorf("creating vault client: %w", err)
	}

	if config.Namespace != "" {
		client.SetNamespace(config.Namespace)
	}

	// Authenticate.
	switch {
	case config.Token != "":
		client.SetToken(config.Token)
	case config.RoleID != "" && config.SecretID != "":
		secret, err := client.Logical().Write("auth/approle/login", map[string]any{
			"role_id":   config.RoleID,
			"secret_id": config.SecretID,
		})
		if err != nil {
			return nil, fmt.Errorf("vault AppRole login: %w", err)
		}
		client.SetToken(secret.Auth.ClientToken)
	default:
		return nil, fmt.Errorf("vault authentication required (token or roleId+secretId)")
	}

	mountPath := config.MountPath
	if mountPath == "" {
		mountPath = "secret"
	}

	refresh := config.RefreshInterval
	if refresh <= 0 {
		refresh = 5 * time.Minute
	}

	return &Provider{
		client:    client,
		mountPath: mountPath,
		cache:     make(map[string]*cachedSecret),
		refresh:   refresh,
	}, nil
}

// GetSecret fetches a secret from Vault KV v2.
func (p *Provider) GetSecret(ctx context.Context, path string) (map[string]string, error) {
	// Check cache.
	p.mu.RLock()
	if cached, ok := p.cache[path]; ok && time.Now().Before(cached.expiry) {
		p.mu.RUnlock()
		return cached.data, nil
	}
	p.mu.RUnlock()

	secret, err := p.client.KVv2(p.mountPath).Get(ctx, path)
	if err != nil {
		return nil, fmt.Errorf("reading vault secret %s: %w", path, err)
	}

	data := make(map[string]string, len(secret.Data))
	for k, v := range secret.Data {
		data[k] = fmt.Sprintf("%v", v)
	}

	// Cache.
	p.mu.Lock()
	p.cache[path] = &cachedSecret{data: data, expiry: time.Now().Add(p.refresh)}
	p.mu.Unlock()

	return data, nil
}

// GetSecretValue fetches a single value from a Vault secret.
func (p *Provider) GetSecretValue(ctx context.Context, path, key string) (string, error) {
	data, err := p.GetSecret(ctx, path)
	if err != nil {
		return "", err
	}
	val, ok := data[key]
	if !ok {
		return "", fmt.Errorf("key %q not found in vault secret %s", key, path)
	}
	return val, nil
}

// ResolveSecretRef resolves a secret reference in the format "vault:path/to/secret:key".
func (p *Provider) ResolveSecretRef(ctx context.Context, ref string) (string, error) {
	if !strings.HasPrefix(ref, "vault:") {
		return ref, nil // Not a vault reference, return as-is.
	}

	parts := strings.SplitN(strings.TrimPrefix(ref, "vault:"), ":", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid vault ref format, expected vault:path:key, got %s", ref)
	}

	return p.GetSecretValue(ctx, parts[0], parts[1])
}

// Start begins periodic cache refresh.
func (p *Provider) Start(ctx context.Context) {
	ctx, p.cancel = context.WithCancel(ctx)
	go func() {
		ticker := time.NewTicker(p.refresh)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				p.refreshCache(ctx)
			}
		}
	}()
}

// Stop stops the provider.
func (p *Provider) Stop() {
	if p.cancel != nil {
		p.cancel()
	}
}

func (p *Provider) refreshCache(ctx context.Context) {
	p.mu.RLock()
	paths := make([]string, 0, len(p.cache))
	for path := range p.cache {
		paths = append(paths, path)
	}
	p.mu.RUnlock()

	for _, path := range paths {
		secret, err := p.client.KVv2(p.mountPath).Get(ctx, path)
		if err != nil {
			log.Warn().Err(err).Str("path", path).Msg("Failed to refresh vault secret")
			continue
		}

		data := make(map[string]string, len(secret.Data))
		for k, v := range secret.Data {
			data[k] = fmt.Sprintf("%v", v)
		}

		p.mu.Lock()
		p.cache[path] = &cachedSecret{data: data, expiry: time.Now().Add(p.refresh)}
		p.mu.Unlock()
	}
}
