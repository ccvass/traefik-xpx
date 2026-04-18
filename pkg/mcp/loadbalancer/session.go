package loadbalancer

import (
	"sync"
	"sync/atomic"
	"time"
)

// Server represents an MCP server backend.
type Server struct {
	Name    string
	URL     string
	Weight  int
	Healthy bool
}

// SessionLB implements session-aware load balancing for MCP agent workflows.
// It ensures that requests within the same session are routed to the same backend.
type SessionLB struct {
	mu       sync.RWMutex
	sessions map[string]*sessionEntry // sessionID -> backend
	servers  []Server
	rrIndex  atomic.Uint64
	ttl      time.Duration
}

type sessionEntry struct {
	server  string
	expiry  time.Time
}

// Config holds session load balancer configuration.
type Config struct {
	SessionTTL time.Duration `json:"sessionTtl,omitempty" toml:"sessionTtl,omitempty" yaml:"sessionTtl,omitempty"`
}

// New creates a new session-smart load balancer.
func New(servers []Server, config Config) *SessionLB {
	ttl := config.SessionTTL
	if ttl <= 0 {
		ttl = 30 * time.Minute
	}
	return &SessionLB{
		sessions: make(map[string]*sessionEntry),
		servers:  servers,
		ttl:      ttl,
	}
}

// Pick selects a server for the given session ID.
// If the session already has an assigned server, it returns that server (sticky).
// Otherwise, it picks the next healthy server via round-robin.
func (lb *SessionLB) Pick(sessionID string) *Server {
	if sessionID != "" {
		lb.mu.RLock()
		entry, ok := lb.sessions[sessionID]
		lb.mu.RUnlock()

		if ok && time.Now().Before(entry.expiry) {
			for i := range lb.servers {
				if lb.servers[i].Name == entry.server && lb.servers[i].Healthy {
					// Refresh TTL.
					lb.mu.Lock()
					entry.expiry = time.Now().Add(lb.ttl)
					lb.mu.Unlock()
					return &lb.servers[i]
				}
			}
		}
	}

	// Round-robin among healthy servers.
	healthy := lb.healthyServers()
	if len(healthy) == 0 {
		return nil
	}

	idx := lb.rrIndex.Add(1) - 1
	server := healthy[idx%uint64(len(healthy))]

	if sessionID != "" {
		lb.mu.Lock()
		lb.sessions[sessionID] = &sessionEntry{
			server: server.Name,
			expiry: time.Now().Add(lb.ttl),
		}
		lb.mu.Unlock()
	}

	return server
}

// Release removes a session binding.
func (lb *SessionLB) Release(sessionID string) {
	lb.mu.Lock()
	delete(lb.sessions, sessionID)
	lb.mu.Unlock()
}

// UpdateHealth updates the health status of a server.
func (lb *SessionLB) UpdateHealth(name string, healthy bool) {
	for i := range lb.servers {
		if lb.servers[i].Name == name {
			lb.servers[i].Healthy = healthy
			return
		}
	}
}

// Cleanup removes expired sessions.
func (lb *SessionLB) Cleanup() {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	now := time.Now()
	for k, v := range lb.sessions {
		if now.After(v.expiry) {
			delete(lb.sessions, k)
		}
	}
}

func (lb *SessionLB) healthyServers() []*Server {
	var result []*Server
	for i := range lb.servers {
		if lb.servers[i].Healthy {
			result = append(result, &lb.servers[i])
		}
	}
	return result
}
