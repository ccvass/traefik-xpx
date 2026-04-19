package api

import (
	"bufio"
	"encoding/json"
	"net/http"
	"os"
	"strings"
)

// handleLogs returns the last N lines of the access log or traefik log.
func handleLogs(rw http.ResponseWriter, req *http.Request) {
	logType := req.URL.Query().Get("type")
	lines := 100

	var logPath string
	switch logType {
	case "access":
		logPath = "/var/log/traefik/access.log"
	default:
		logPath = "/var/log/traefik/traefik.log"
	}

	f, err := os.Open(logPath)
	if err != nil {
		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode(map[string]string{"error": "log file not found: " + logPath})
		return
	}
	defer f.Close()

	// Read all lines, keep last N
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)
	var all []string
	for scanner.Scan() {
		all = append(all, scanner.Text())
	}

	start := 0
	if len(all) > lines {
		start = len(all) - lines
	}
	result := all[start:]

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]interface{}{
		"type":  logType,
		"path":  logPath,
		"lines": result,
		"total": len(all),
	})
}

// handleHealthChecks returns health status of services.
func (h *Handler) handleHealthChecks(rw http.ResponseWriter, _ *http.Request) {
	if h.runtimeConfiguration == nil {
		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode([]interface{}{})
		return
	}

	type svcHealth struct {
		Name    string `json:"name"`
		Status  string `json:"status"`
		Servers int    `json:"servers"`
	}

	var results []svcHealth
	for name, svc := range h.runtimeConfiguration.Services {
		status := "unknown"
		servers := 0
		if svc.LoadBalancer != nil {
			servers = len(svc.LoadBalancer.Servers)
			status = "healthy"
		}
		if strings.Contains(svc.Status, "error") || strings.Contains(svc.Status, "disabled") {
			status = "unhealthy"
		} else if svc.Status == "enabled" {
			status = "healthy"
		}
		results = append(results, svcHealth{Name: name, Status: status, Servers: servers})
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(results)
}

// handleMetrics returns basic internal metrics.
func (h *Handler) handleMetrics(rw http.ResponseWriter, _ *http.Request) {
	if h.runtimeConfiguration == nil {
		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode(map[string]int{})
		return
	}

	metrics := map[string]int{
		"httpRouters":     len(h.runtimeConfiguration.Routers),
		"httpServices":    len(h.runtimeConfiguration.Services),
		"httpMiddlewares": len(h.runtimeConfiguration.Middlewares),
		"tcpRouters":      len(h.runtimeConfiguration.TCPRouters),
		"tcpServices":     len(h.runtimeConfiguration.TCPServices),
		"udpRouters":      len(h.runtimeConfiguration.UDPRouters),
		"udpServices":     len(h.runtimeConfiguration.UDPServices),
	}

	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(metrics)
}
