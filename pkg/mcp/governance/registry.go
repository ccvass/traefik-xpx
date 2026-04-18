package governance

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// ServerEntry represents a registered MCP server.
type ServerEntry struct {
	Name        string   `json:"name" toml:"name" yaml:"name"`
	URL         string   `json:"url" toml:"url" yaml:"url"`
	Transport   string   `json:"transport,omitempty" toml:"transport,omitempty" yaml:"transport,omitempty"`
	Tools       []string `json:"tools,omitempty" toml:"tools,omitempty" yaml:"tools,omitempty"`
	Tags        []string `json:"tags,omitempty" toml:"tags,omitempty" yaml:"tags,omitempty"`
	MaxSessions int      `json:"maxSessions,omitempty" toml:"maxSessions,omitempty" yaml:"maxSessions,omitempty"`
	Approved    bool     `json:"approved,omitempty" toml:"approved,omitempty" yaml:"approved,omitempty"`
}

// ServerStatus holds the runtime status of an MCP server.
type ServerStatus struct {
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Healthy   bool      `json:"healthy"`
	LastCheck time.Time `json:"lastCheck"`
	Latency   time.Duration `json:"latency"`
	Error     string    `json:"error,omitempty"`
	Approved  bool      `json:"approved"`
}

// HealthCheckConfig holds health check configuration.
type HealthCheckConfig struct {
	Interval time.Duration `json:"interval,omitempty" toml:"interval,omitempty" yaml:"interval,omitempty"`
	Timeout  time.Duration `json:"timeout,omitempty" toml:"timeout,omitempty" yaml:"timeout,omitempty"`
}

// Config holds the MCP governance configuration.
type Config struct {
	Servers     []ServerEntry     `json:"servers" toml:"servers" yaml:"servers"`
	HealthCheck HealthCheckConfig `json:"healthCheck,omitempty" toml:"healthCheck,omitempty" yaml:"healthCheck,omitempty"`
}

// Registry manages MCP server registration, health, and governance.
type Registry struct {
	mu       sync.RWMutex
	servers  map[string]*ServerEntry
	statuses map[string]*ServerStatus
	client   *http.Client
	interval time.Duration
	cancel   context.CancelFunc
}

// NewRegistry creates a new MCP server registry.
func NewRegistry(config Config) *Registry {
	interval := config.HealthCheck.Interval
	if interval <= 0 {
		interval = 30 * time.Second
	}
	timeout := config.HealthCheck.Timeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	r := &Registry{
		servers:  make(map[string]*ServerEntry, len(config.Servers)),
		statuses: make(map[string]*ServerStatus, len(config.Servers)),
		client:   &http.Client{Timeout: timeout},
		interval: interval,
	}

	for i := range config.Servers {
		s := &config.Servers[i]
		r.servers[s.Name] = s
		r.statuses[s.Name] = &ServerStatus{Name: s.Name, URL: s.URL, Approved: s.Approved}
	}

	return r
}

// Start begins periodic health checking.
func (r *Registry) Start(ctx context.Context) {
	ctx, r.cancel = context.WithCancel(ctx)
	go r.healthLoop(ctx)
}

// Stop stops health checking.
func (r *Registry) Stop() {
	if r.cancel != nil {
		r.cancel()
	}
}

// Register adds a new MCP server to the registry.
func (r *Registry) Register(entry ServerEntry) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.servers[entry.Name]; exists {
		return fmt.Errorf("server %q already registered", entry.Name)
	}

	r.servers[entry.Name] = &entry
	r.statuses[entry.Name] = &ServerStatus{Name: entry.Name, URL: entry.URL, Approved: entry.Approved}
	return nil
}

// Deregister removes an MCP server from the registry.
func (r *Registry) Deregister(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.servers, name)
	delete(r.statuses, name)
}

// Get returns a server entry by name.
func (r *Registry) Get(name string) (*ServerEntry, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	s, ok := r.servers[name]
	return s, ok
}

// List returns all registered servers.
func (r *Registry) List() []ServerStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]ServerStatus, 0, len(r.statuses))
	for _, s := range r.statuses {
		result = append(result, *s)
	}
	return result
}

// Healthy returns only healthy and approved servers.
func (r *Registry) Healthy() []ServerEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []ServerEntry
	for name, status := range r.statuses {
		if status.Healthy && status.Approved {
			if s, ok := r.servers[name]; ok {
				result = append(result, *s)
			}
		}
	}
	return result
}

// FindByTool returns servers that provide the given tool.
func (r *Registry) FindByTool(tool string) []ServerEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []ServerEntry
	for _, s := range r.servers {
		for _, t := range s.Tools {
			if t == tool {
				status := r.statuses[s.Name]
				if status != nil && status.Healthy {
					result = append(result, *s)
				}
				break
			}
		}
	}
	return result
}

// Approve marks a server as approved for production use.
func (r *Registry) Approve(name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	s, ok := r.servers[name]
	if !ok {
		return fmt.Errorf("server %q not found", name)
	}
	s.Approved = true
	if st, ok := r.statuses[name]; ok {
		st.Approved = true
	}
	return nil
}

// Reject marks a server as not approved.
func (r *Registry) Reject(name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	s, ok := r.servers[name]
	if !ok {
		return fmt.Errorf("server %q not found", name)
	}
	s.Approved = false
	if st, ok := r.statuses[name]; ok {
		st.Approved = false
	}
	return nil
}

func (r *Registry) healthLoop(ctx context.Context) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	// Initial check.
	r.checkAll(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.checkAll(ctx)
		}
	}
}

func (r *Registry) checkAll(ctx context.Context) {
	r.mu.RLock()
	servers := make([]ServerEntry, 0, len(r.servers))
	for _, s := range r.servers {
		servers = append(servers, *s)
	}
	r.mu.RUnlock()

	for _, s := range servers {
		r.checkServer(ctx, s)
	}
}

func (r *Registry) checkServer(ctx context.Context, entry ServerEntry) {
	start := time.Now()
	healthy := true
	errMsg := ""

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, entry.URL+"/health", nil)
	if err != nil {
		healthy = false
		errMsg = err.Error()
	} else {
		resp, err := r.client.Do(req)
		if err != nil {
			healthy = false
			errMsg = err.Error()
		} else {
			resp.Body.Close()
			if resp.StatusCode >= 400 {
				healthy = false
				errMsg = fmt.Sprintf("status %d", resp.StatusCode)
			}
		}
	}

	latency := time.Since(start)

	r.mu.Lock()
	if st, ok := r.statuses[entry.Name]; ok {
		st.Healthy = healthy
		st.LastCheck = time.Now()
		st.Latency = latency
		st.Error = errMsg
	}
	r.mu.Unlock()

	if !healthy {
		log.Warn().Str("server", entry.Name).Str("error", errMsg).Msg("MCP server unhealthy")
	}
}
