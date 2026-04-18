package dashboard

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

// ClusterInfo represents a Traefik cluster/instance.
type ClusterInfo struct {
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Region    string    `json:"region,omitempty"`
	Healthy   bool      `json:"healthy"`
	LastCheck time.Time `json:"lastCheck"`
	Version   string    `json:"version,omitempty"`
	Routes    int       `json:"routes"`
	Services  int       `json:"services"`
	Uptime    string    `json:"uptime,omitempty"`
}

// Dashboard provides a multi-cluster overview API.
type Dashboard struct {
	mu       sync.RWMutex
	clusters map[string]*ClusterInfo
	client   *http.Client
}

// New creates a new multi-cluster dashboard.
func New() *Dashboard {
	return &Dashboard{
		clusters: make(map[string]*ClusterInfo),
		client:   &http.Client{Timeout: 5 * time.Second},
	}
}

// Register adds a cluster to the dashboard.
func (d *Dashboard) Register(info ClusterInfo) {
	d.mu.Lock()
	d.clusters[info.Name] = &info
	d.mu.Unlock()
}

// Deregister removes a cluster.
func (d *Dashboard) Deregister(name string) {
	d.mu.Lock()
	delete(d.clusters, name)
	d.mu.Unlock()
}

// List returns all clusters.
func (d *Dashboard) List() []ClusterInfo {
	d.mu.RLock()
	defer d.mu.RUnlock()
	result := make([]ClusterInfo, 0, len(d.clusters))
	for _, c := range d.clusters {
		result = append(result, *c)
	}
	return result
}

// ServeHTTP handles dashboard API requests.
func (d *Dashboard) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(d.List())
}
