package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/mux"
	"gopkg.in/yaml.v3"
)

// DynamicConfigManager handles CRUD operations on the dynamic configuration file.
type DynamicConfigManager struct {
	mu       sync.Mutex
	filePath string
}

// dynamicConfig represents the dynamic configuration structure.
type dynamicConfig struct {
	HTTP *httpConfig `yaml:"http,omitempty" json:"http,omitempty"`
}

type httpConfig struct {
	Routers     map[string]interface{} `yaml:"routers,omitempty" json:"routers,omitempty"`
	Services    map[string]interface{} `yaml:"services,omitempty" json:"services,omitempty"`
	Middlewares map[string]interface{} `yaml:"middlewares,omitempty" json:"middlewares,omitempty"`
}

func newDynamicConfigManager(filePath string) *DynamicConfigManager {
	return &DynamicConfigManager{filePath: filePath}
}

func (m *DynamicConfigManager) load() (*dynamicConfig, error) {
	data, err := os.ReadFile(m.filePath)
	if err != nil {
		return &dynamicConfig{HTTP: &httpConfig{
			Routers:     make(map[string]interface{}),
			Services:    make(map[string]interface{}),
			Middlewares: make(map[string]interface{}),
		}}, nil
	}
	var cfg dynamicConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if cfg.HTTP == nil {
		cfg.HTTP = &httpConfig{
			Routers:     make(map[string]interface{}),
			Services:    make(map[string]interface{}),
			Middlewares: make(map[string]interface{}),
		}
	}
	if cfg.HTTP.Routers == nil {
		cfg.HTTP.Routers = make(map[string]interface{})
	}
	if cfg.HTTP.Services == nil {
		cfg.HTTP.Services = make(map[string]interface{})
	}
	if cfg.HTTP.Middlewares == nil {
		cfg.HTTP.Middlewares = make(map[string]interface{})
	}
	return &cfg, nil
}

func (m *DynamicConfigManager) save(cfg *dynamicConfig) error {
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(m.filePath, data, 0644)
}

// RegisterCRUDRoutes registers CRUD endpoints on the given router.
func (m *DynamicConfigManager) RegisterCRUDRoutes(router *mux.Router) {
	router.Methods(http.MethodGet).Path("/api/config/dynamic").HandlerFunc(m.getDynamic)

	router.Methods(http.MethodPut).Path("/api/config/http/routers/{name}").HandlerFunc(m.putRouter)
	router.Methods(http.MethodDelete).Path("/api/config/http/routers/{name}").HandlerFunc(m.deleteRouter)

	router.Methods(http.MethodPut).Path("/api/config/http/services/{name}").HandlerFunc(m.putService)
	router.Methods(http.MethodDelete).Path("/api/config/http/services/{name}").HandlerFunc(m.deleteService)

	router.Methods(http.MethodPut).Path("/api/config/http/middlewares/{name}").HandlerFunc(m.putMiddleware)
	router.Methods(http.MethodDelete).Path("/api/config/http/middlewares/{name}").HandlerFunc(m.deleteMiddleware)
}

func (m *DynamicConfigManager) getDynamic(rw http.ResponseWriter, _ *http.Request) {
	m.mu.Lock()
	defer m.mu.Unlock()

	cfg, err := m.load()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(cfg)
}

func (m *DynamicConfigManager) putRouter(rw http.ResponseWriter, req *http.Request) {
	name := mux.Vars(req)["name"]
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

	cfg.HTTP.Routers[name] = value
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "saved", "name": name})
}

func (m *DynamicConfigManager) deleteRouter(rw http.ResponseWriter, req *http.Request) {
	name := mux.Vars(req)["name"]
	m.mu.Lock()
	defer m.mu.Unlock()

	cfg, err := m.load()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	delete(cfg.HTTP.Routers, name)
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "deleted", "name": name})
}

func (m *DynamicConfigManager) putService(rw http.ResponseWriter, req *http.Request) {
	name := mux.Vars(req)["name"]
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

	cfg.HTTP.Services[name] = value
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "saved", "name": name})
}

func (m *DynamicConfigManager) deleteService(rw http.ResponseWriter, req *http.Request) {
	name := mux.Vars(req)["name"]
	m.mu.Lock()
	defer m.mu.Unlock()

	cfg, err := m.load()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	delete(cfg.HTTP.Services, name)
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "deleted", "name": name})
}

func (m *DynamicConfigManager) putMiddleware(rw http.ResponseWriter, req *http.Request) {
	name := mux.Vars(req)["name"]
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

	cfg.HTTP.Middlewares[name] = value
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "saved", "name": name})
}

func (m *DynamicConfigManager) deleteMiddleware(rw http.ResponseWriter, req *http.Request) {
	name := mux.Vars(req)["name"]
	m.mu.Lock()
	defer m.mu.Unlock()

	cfg, err := m.load()
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	delete(cfg.HTTP.Middlewares, name)
	if err := m.save(cfg); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "deleted", "name": name})
}
