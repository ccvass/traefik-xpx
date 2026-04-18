package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sync"

	"gopkg.in/yaml.v3"
)

// StaticConfigManager handles read/write of static configuration sections.
type StaticConfigManager struct {
	mu       sync.Mutex
	filePath string
}

func newStaticConfigManager(filePath string) *StaticConfigManager {
	return &StaticConfigManager{filePath: filePath}
}

func (m *StaticConfigManager) load() (map[string]interface{}, error) {
	data, err := os.ReadFile(m.filePath)
	if err != nil {
		return make(map[string]interface{}), nil
	}
	var cfg map[string]interface{}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if cfg == nil {
		cfg = make(map[string]interface{})
	}
	return cfg, nil
}

func (m *StaticConfigManager) save(cfg map[string]interface{}) error {
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(m.filePath, data, 0644)
}

// getStaticSection returns a section of the static config.
func (m *StaticConfigManager) getStaticSection(rw http.ResponseWriter, req *http.Request) {
	section := req.URL.Query().Get("section")
	m.mu.Lock()
	defer m.mu.Unlock()

	cfg, err := m.load()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	if section == "" {
		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode(cfg)
		return
	}

	val, ok := cfg[section]
	if !ok {
		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode(nil)
		return
	}
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(val)
}

// putStaticSection updates a section of the static config.
func (m *StaticConfigManager) putStaticSection(rw http.ResponseWriter, req *http.Request) {
	section := req.URL.Query().Get("section")
	if section == "" {
		http.Error(rw, "section query param required", http.StatusBadRequest)
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	cfg, err := m.load()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	body, _ := io.ReadAll(req.Body)
	var value interface{}
	if err := json.Unmarshal(body, &value); err != nil {
		http.Error(rw, "invalid JSON", http.StatusBadRequest)
		return
	}

	cfg[section] = value
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{"status": "saved", "section": section, "note": "restart required for static config changes"})
}

// deleteStaticSection removes a section from the static config.
func (m *StaticConfigManager) deleteStaticSection(rw http.ResponseWriter, req *http.Request) {
	section := req.URL.Query().Get("section")
	if section == "" {
		http.Error(rw, "section query param required", http.StatusBadRequest)
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	cfg, err := m.load()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	delete(cfg, section)
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{"status": "deleted", "section": section})
}

func findStaticConfigPath() string {
	paths := []string{
		os.Getenv("TRAEFIK_CONFIG_FILE"),
		"/etc/traefik/traefik.yml",
		"/etc/traefik/traefik.yaml",
		"/etc/traefik/traefik.toml",
		"./traefik.yml",
	}
	for _, p := range paths {
		if p == "" {
			continue
		}
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}
