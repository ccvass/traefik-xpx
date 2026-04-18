package credentials

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

// Credential holds a single AI provider credential with usage tracking.
type Credential struct {
	Name          string   `json:"name" toml:"name" yaml:"name"`
	Provider      string   `json:"provider" toml:"provider" yaml:"provider"`
	APIKey        string   `json:"apiKey,omitempty" toml:"apiKey,omitempty" yaml:"apiKey,omitempty"`
	Region        string   `json:"region,omitempty" toml:"region,omitempty" yaml:"region,omitempty"`
	AllowedModels []string `json:"allowedModels,omitempty" toml:"allowedModels,omitempty" yaml:"allowedModels,omitempty"`
	RateLimit     int64    `json:"rateLimit,omitempty" toml:"rateLimit,omitempty" yaml:"rateLimit,omitempty"`
	BudgetLimit   float64  `json:"budgetLimit,omitempty" toml:"budgetLimit,omitempty" yaml:"budgetLimit,omitempty"`
}

// UsageStats tracks usage for a credential.
type UsageStats struct {
	Requests         atomic.Int64
	PromptTokens     atomic.Int64
	CompletionTokens atomic.Int64
	EstimatedCost    atomic.Int64 // microdollars (cost * 1_000_000)
	LastUsed         atomic.Int64 // unix timestamp
}

// StoreConfig holds the credential store configuration.
type StoreConfig struct {
	Credentials      []Credential  `json:"credentials" toml:"credentials" yaml:"credentials"`
	VaultPath        string        `json:"vaultPath,omitempty" toml:"vaultPath,omitempty" yaml:"vaultPath,omitempty"`
	RotationInterval time.Duration `json:"rotationInterval,omitempty" toml:"rotationInterval,omitempty" yaml:"rotationInterval,omitempty"`
}

// Store manages AI provider credentials with usage tracking and rate limiting.
type Store struct {
	mu          sync.RWMutex
	credentials map[string]*Credential // name -> credential
	usage       map[string]*UsageStats // name -> usage
}

// NewStore creates a new credential store.
func NewStore(config StoreConfig) (*Store, error) {
	s := &Store{
		credentials: make(map[string]*Credential, len(config.Credentials)),
		usage:       make(map[string]*UsageStats, len(config.Credentials)),
	}

	for i := range config.Credentials {
		cred := &config.Credentials[i]
		if cred.Name == "" {
			return nil, fmt.Errorf("credential at index %d has no name", i)
		}
		s.credentials[cred.Name] = cred
		s.usage[cred.Name] = &UsageStats{}
	}

	return s, nil
}

// Get returns the credential for the given name.
func (s *Store) Get(name string) (*Credential, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cred, ok := s.credentials[name]
	if !ok {
		return nil, fmt.Errorf("credential %q not found", name)
	}
	return cred, nil
}

// GetForProvider returns the first available credential for the given provider.
func (s *Store) GetForProvider(provider string) (*Credential, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, cred := range s.credentials {
		if cred.Provider == provider {
			if s.isWithinLimits(cred.Name, cred) {
				return cred, nil
			}
		}
	}
	return nil, fmt.Errorf("no available credential for provider %q", provider)
}

// RecordUsage records token usage for a credential.
func (s *Store) RecordUsage(name string, promptTokens, completionTokens int, costMicrodollars int64) {
	s.mu.RLock()
	stats, ok := s.usage[name]
	s.mu.RUnlock()
	if !ok {
		return
	}

	stats.Requests.Add(1)
	stats.PromptTokens.Add(int64(promptTokens))
	stats.CompletionTokens.Add(int64(completionTokens))
	stats.EstimatedCost.Add(costMicrodollars)
	stats.LastUsed.Store(time.Now().Unix())
}

// GetUsage returns usage stats for a credential.
func (s *Store) GetUsage(name string) *UsageStats {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.usage[name]
}

// Rotate replaces the API key for a credential without downtime.
func (s *Store) Rotate(name, newAPIKey string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cred, ok := s.credentials[name]
	if !ok {
		return fmt.Errorf("credential %q not found", name)
	}
	cred.APIKey = newAPIKey
	return nil
}

// SupportsModel checks if a credential allows the given model.
func (s *Store) SupportsModel(name, model string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cred, ok := s.credentials[name]
	if !ok {
		return false
	}
	if len(cred.AllowedModels) == 0 {
		return true
	}
	for _, m := range cred.AllowedModels {
		if m == model {
			return true
		}
	}
	return false
}

func (s *Store) isWithinLimits(name string, cred *Credential) bool {
	stats, ok := s.usage[name]
	if !ok {
		return true
	}

	if cred.RateLimit > 0 && stats.Requests.Load() >= cred.RateLimit {
		return false
	}
	if cred.BudgetLimit > 0 {
		costDollars := float64(stats.EstimatedCost.Load()) / 1_000_000
		if costDollars >= cred.BudgetLimit {
			return false
		}
	}
	return true
}
