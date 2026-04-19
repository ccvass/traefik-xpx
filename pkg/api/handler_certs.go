package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type certManager struct {
	mu      sync.Mutex
	certDir string
}

type certEntry struct {
	Name     string `json:"name"`
	CertFile string `json:"certFile"`
	KeyFile  string `json:"keyFile"`
}

func newCertManager(certDir string) *certManager {
	if certDir == "" {
		certDir = "/etc/traefik/certs"
	}
	os.MkdirAll(certDir, 0700)
	return &certManager{certDir: certDir}
}

func (cm *certManager) handleListCerts(rw http.ResponseWriter, _ *http.Request) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	entries, _ := os.ReadDir(cm.certDir)
	certs := []certEntry{}
	seen := map[string]bool{}
	for _, e := range entries {
		name := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		if seen[name] {
			continue
		}
		certPath := filepath.Join(cm.certDir, name+".pem")
		keyPath := filepath.Join(cm.certDir, name+"-key.pem")
		if _, err := os.Stat(certPath); err == nil {
			seen[name] = true
			certs = append(certs, certEntry{Name: name, CertFile: certPath, KeyFile: keyPath})
		}
	}
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(certs)
}

func (cm *certManager) handleUploadCert(rw http.ResponseWriter, req *http.Request) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	var body struct {
		Name string `json:"name"`
		Cert string `json:"cert"`
		Key  string `json:"key"`
	}
	data, _ := io.ReadAll(req.Body)
	if err := json.Unmarshal(data, &body); err != nil || body.Name == "" || body.Cert == "" || body.Key == "" {
		http.Error(rw, `{"error":"name, cert, and key required"}`, http.StatusBadRequest)
		return
	}

	certPath := filepath.Join(cm.certDir, body.Name+".pem")
	keyPath := filepath.Join(cm.certDir, body.Name+"-key.pem")

	if err := os.WriteFile(certPath, []byte(body.Cert), 0644); err != nil {
		http.Error(rw, `{"error":"writing cert: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(keyPath, []byte(body.Key), 0600); err != nil {
		http.Error(rw, `{"error":"writing key: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{"status": "uploaded", "name": body.Name, "certFile": certPath, "keyFile": keyPath})
}

func (cm *certManager) handleDeleteCert(rw http.ResponseWriter, req *http.Request) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	var body struct {
		Name string `json:"name"`
	}
	json.NewDecoder(req.Body).Decode(&body)
	if body.Name == "" {
		http.Error(rw, `{"error":"name required"}`, http.StatusBadRequest)
		return
	}

	os.Remove(filepath.Join(cm.certDir, body.Name+".pem"))
	os.Remove(filepath.Join(cm.certDir, body.Name+"-key.pem"))

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{"status": "deleted", "name": body.Name})
}
