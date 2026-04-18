package api

import (
	"encoding/json"
	"net/http"
)

// Extended API handlers for AI Gateway, MCP Gateway, and API Management.

type featureStatus struct {
	Enabled    bool   `json:"enabled"`
	Module     string `json:"module"`
	Status     string `json:"status"`
	Components int    `json:"components"`
}

func (h *Handler) getAIStatus(rw http.ResponseWriter, _ *http.Request) {
	cfg := h.staticConfig
	status := featureStatus{
		Enabled: cfg.AI != nil,
		Module:  "ai-gateway",
		Status:  "available",
	}
	if cfg.AI != nil {
		status.Components = len(cfg.AI.Providers)
	}
	writeJSONExt(rw, status)
}

func (h *Handler) getAIProviders(rw http.ResponseWriter, _ *http.Request) {
	cfg := h.staticConfig
	if cfg.AI == nil {
		writeJSONExt(rw, []interface{}{})
		return
	}
	type safeProvider struct {
		Name     string   `json:"name"`
		Type     string   `json:"type"`
		Endpoint string   `json:"endpoint"`
		Models   []string `json:"models,omitempty"`
	}
	providers := make([]safeProvider, 0, len(cfg.AI.Providers))
	for _, p := range cfg.AI.Providers {
		providers = append(providers, safeProvider{
			Name:     p.Name,
			Type:     p.Type,
			Endpoint: p.Endpoint,
			Models:   p.Models,
		})
	}
	writeJSONExt(rw, providers)
}

func (h *Handler) getMCPStatus(rw http.ResponseWriter, _ *http.Request) {
	cfg := h.staticConfig
	status := featureStatus{
		Enabled: cfg.MCP != nil,
		Module:  "mcp-gateway",
		Status:  "available",
	}
	if cfg.MCP != nil {
		status.Components = len(cfg.MCP.Servers)
	}
	writeJSONExt(rw, status)
}

func (h *Handler) getMCPServers(rw http.ResponseWriter, _ *http.Request) {
	cfg := h.staticConfig
	if cfg.MCP == nil {
		writeJSONExt(rw, []interface{}{})
		return
	}
	writeJSONExt(rw, cfg.MCP.Servers)
}

func (h *Handler) getMCPPolicies(rw http.ResponseWriter, _ *http.Request) {
	cfg := h.staticConfig
	if cfg.MCP == nil || cfg.MCP.Policies == nil {
		writeJSONExt(rw, []interface{}{})
		return
	}
	writeJSONExt(rw, cfg.MCP.Policies)
}

func (h *Handler) getAPIMgmtStatus(rw http.ResponseWriter, _ *http.Request) {
	cfg := h.staticConfig
	status := featureStatus{
		Enabled: cfg.APIMgmt != nil,
		Module:  "api-management",
		Status:  "available",
	}
	writeJSONExt(rw, status)
}

func (h *Handler) getAPIMgmtPortal(rw http.ResponseWriter, _ *http.Request) {
	cfg := h.staticConfig
	if cfg.APIMgmt == nil || cfg.APIMgmt.Portal == nil {
		writeJSONExt(rw, map[string]bool{"enabled": false})
		return
	}
	writeJSONExt(rw, cfg.APIMgmt.Portal)
}

func writeJSONExt(rw http.ResponseWriter, data interface{}) {
	rw.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(rw).Encode(data)
}
