package grafana

import (
	"encoding/json"
	"net/http"
)

// Dashboard represents a Grafana dashboard definition.
type Dashboard struct {
	Title       string  `json:"title"`
	UID         string  `json:"uid"`
	Description string  `json:"description,omitempty"`
	Panels      []Panel `json:"panels"`
	Templating  []Var   `json:"templating,omitempty"`
}

// Panel represents a Grafana panel.
type Panel struct {
	Title   string  `json:"title"`
	Type    string  `json:"type"` // graph, stat, gauge, table, heatmap
	GridPos GridPos `json:"gridPos"`
	Targets []Target `json:"targets"`
}

// GridPos defines panel position.
type GridPos struct {
	H int `json:"h"`
	W int `json:"w"`
	X int `json:"x"`
	Y int `json:"y"`
}

// Target holds a Prometheus query.
type Target struct {
	Expr   string `json:"expr"`
	Legend string `json:"legendFormat,omitempty"`
}

// Var holds a template variable.
type Var struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Query string `json:"query,omitempty"`
}

// BuiltinDashboards returns all pre-built dashboard definitions.
func BuiltinDashboards() []Dashboard {
	return []Dashboard{
		overviewDashboard(),
		authDashboard(),
		aiGatewayDashboard(),
		mcpGatewayDashboard(),
		securityDashboard(),
	}
}

func overviewDashboard() Dashboard {
	return Dashboard{
		Title: "Traefik Overview", UID: "traefik-overview",
		Description: "Request rates, error rates, latency percentiles, active connections",
		Panels: []Panel{
			{Title: "Requests/s", Type: "graph", GridPos: GridPos{8, 12, 0, 0}, Targets: []Target{{Expr: `rate(traefik_entrypoint_requests_total[5m])`, Legend: "{{entrypoint}}"}}},
			{Title: "Error Rate", Type: "graph", GridPos: GridPos{8, 12, 12, 0}, Targets: []Target{{Expr: `rate(traefik_entrypoint_requests_total{code=~"5.."}[5m]) / rate(traefik_entrypoint_requests_total[5m])`, Legend: "{{entrypoint}}"}}},
			{Title: "Latency p95", Type: "graph", GridPos: GridPos{8, 12, 0, 8}, Targets: []Target{{Expr: `histogram_quantile(0.95, rate(traefik_entrypoint_request_duration_seconds_bucket[5m]))`, Legend: "p95"}}},
			{Title: "Active Connections", Type: "stat", GridPos: GridPos{4, 6, 12, 8}, Targets: []Target{{Expr: `traefik_entrypoint_open_connections`}}},
		},
	}
}

func authDashboard() Dashboard {
	return Dashboard{
		Title: "Authentication", UID: "traefik-auth",
		Panels: []Panel{
			{Title: "Auth Success Rate", Type: "gauge", GridPos: GridPos{6, 8, 0, 0}, Targets: []Target{{Expr: `sum(rate(traefik_middleware_requests_total{middleware_type=~"JWTAuth|OIDC|APIKey|LDAP|HMAC",code!~"4.."}[5m])) / sum(rate(traefik_middleware_requests_total{middleware_type=~"JWTAuth|OIDC|APIKey|LDAP|HMAC"}[5m]))`}}},
			{Title: "Auth Failures by Type", Type: "graph", GridPos: GridPos{8, 16, 8, 0}, Targets: []Target{{Expr: `rate(traefik_middleware_requests_total{middleware_type=~"JWTAuth|OIDC|APIKey|LDAP|HMAC",code=~"4.."}[5m])`, Legend: "{{middleware_type}}"}}},
		},
	}
}

func aiGatewayDashboard() Dashboard {
	return Dashboard{
		Title: "AI Gateway", UID: "traefik-ai",
		Panels: []Panel{
			{Title: "AI Requests/s", Type: "graph", GridPos: GridPos{8, 12, 0, 0}, Targets: []Target{{Expr: `rate(ai_requests_total[5m])`, Legend: "{{ai_provider}}"}}},
			{Title: "Token Usage", Type: "graph", GridPos: GridPos{8, 12, 12, 0}, Targets: []Target{{Expr: `rate(ai_tokens_total[5m])`, Legend: "{{ai_model}}"}}},
			{Title: "Estimated Cost (USD/h)", Type: "stat", GridPos: GridPos{4, 6, 0, 8}, Targets: []Target{{Expr: `rate(ai_cost_total_usd[1h]) * 3600`}}},
			{Title: "Latency by Provider", Type: "graph", GridPos: GridPos{8, 12, 6, 8}, Targets: []Target{{Expr: `histogram_quantile(0.95, rate(ai_request_duration_seconds_bucket[5m]))`, Legend: "{{ai_provider}} p95"}}},
			{Title: "Cache Hit Rate", Type: "gauge", GridPos: GridPos{4, 6, 18, 8}, Targets: []Target{{Expr: `sum(rate(ai_cache_hits_total[5m])) / sum(rate(ai_requests_total[5m]))`}}},
		},
	}
}

func mcpGatewayDashboard() Dashboard {
	return Dashboard{
		Title: "MCP Gateway", UID: "traefik-mcp",
		Panels: []Panel{
			{Title: "Tool Invocations/s", Type: "graph", GridPos: GridPos{8, 12, 0, 0}, Targets: []Target{{Expr: `rate(mcp_tool_invocations_total[5m])`, Legend: "{{tool}}"}}},
			{Title: "Policy Decisions", Type: "graph", GridPos: GridPos{8, 12, 12, 0}, Targets: []Target{{Expr: `rate(mcp_policy_decisions_total[5m])`, Legend: "{{action}}"}}},
			{Title: "Active Sessions", Type: "stat", GridPos: GridPos{4, 6, 0, 8}, Targets: []Target{{Expr: `mcp_active_sessions`}}},
		},
	}
}

func securityDashboard() Dashboard {
	return Dashboard{
		Title: "Security", UID: "traefik-security",
		Panels: []Panel{
			{Title: "WAF Blocks/s", Type: "graph", GridPos: GridPos{8, 8, 0, 0}, Targets: []Target{{Expr: `rate(traefik_middleware_requests_total{middleware_type="WAF",code="403"}[5m])`}}},
			{Title: "OPA Denials/s", Type: "graph", GridPos: GridPos{8, 8, 8, 0}, Targets: []Target{{Expr: `rate(traefik_middleware_requests_total{middleware_type="OPA",code="403"}[5m])`}}},
			{Title: "PII Detections", Type: "stat", GridPos: GridPos{4, 8, 16, 0}, Targets: []Target{{Expr: `sum(increase(ai_pii_detections_total[24h]))`}}},
		},
	}
}

// ServeHTTP serves dashboard definitions as JSON.
func ServeHTTP(rw http.ResponseWriter, _ *http.Request) {
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(BuiltinDashboards())
}
