package linter

import (
	"fmt"
	"strings"
)

// Severity levels for lint findings.
const (
	SeverityError   = "error"
	SeverityWarning = "warning"
	SeverityInfo    = "info"
)

// Finding represents a configuration lint finding.
type Finding struct {
	Severity string `json:"severity"`
	Path     string `json:"path"`
	Message  string `json:"message"`
	Rule     string `json:"rule"`
}

// Result holds the linting results.
type Result struct {
	Valid    bool      `json:"valid"`
	Findings []Finding `json:"findings"`
}

// Rule defines a lint rule.
type Rule struct {
	Name    string
	Check   func(config map[string]any) []Finding
}

// Linter validates Traefik configuration.
type Linter struct {
	rules []Rule
}

// New creates a new configuration linter with built-in rules.
func New() *Linter {
	return &Linter{
		rules: builtinRules(),
	}
}

// Lint checks a configuration map and returns findings.
func (l *Linter) Lint(config map[string]any) Result {
	var findings []Finding
	for _, rule := range l.rules {
		findings = append(findings, rule.Check(config)...)
	}

	valid := true
	for _, f := range findings {
		if f.Severity == SeverityError {
			valid = false
			break
		}
	}

	return Result{Valid: valid, Findings: findings}
}

func builtinRules() []Rule {
	return []Rule{
		{Name: "no-empty-routers", Check: checkEmptyRouters},
		{Name: "no-duplicate-entrypoints", Check: checkDuplicateEntrypoints},
		{Name: "tls-configured", Check: checkTLSConfigured},
		{Name: "health-check-present", Check: checkHealthCheck},
	}
}

func checkEmptyRouters(config map[string]any) []Finding {
	routers, ok := config["routers"].(map[string]any)
	if !ok {
		return nil
	}
	var findings []Finding
	for name, r := range routers {
		router, ok := r.(map[string]any)
		if !ok {
			continue
		}
		if router["rule"] == nil || router["rule"] == "" {
			findings = append(findings, Finding{
				Severity: SeverityError,
				Path:     fmt.Sprintf("routers.%s.rule", name),
				Message:  "Router has no rule defined",
				Rule:     "no-empty-routers",
			})
		}
	}
	return findings
}

func checkDuplicateEntrypoints(config map[string]any) []Finding {
	entrypoints, ok := config["entryPoints"].(map[string]any)
	if !ok {
		return nil
	}
	ports := make(map[string]string)
	var findings []Finding
	for name, ep := range entrypoints {
		epMap, ok := ep.(map[string]any)
		if !ok {
			continue
		}
		addr, _ := epMap["address"].(string)
		if existing, dup := ports[addr]; dup {
			findings = append(findings, Finding{
				Severity: SeverityError,
				Path:     fmt.Sprintf("entryPoints.%s", name),
				Message:  fmt.Sprintf("Duplicate address %s (also used by %s)", addr, existing),
				Rule:     "no-duplicate-entrypoints",
			})
		}
		ports[addr] = name
	}
	return findings
}

func checkTLSConfigured(config map[string]any) []Finding {
	routers, ok := config["routers"].(map[string]any)
	if !ok {
		return nil
	}
	var findings []Finding
	for name, r := range routers {
		router, ok := r.(map[string]any)
		if !ok {
			continue
		}
		rule, _ := router["rule"].(string)
		if strings.Contains(rule, "Host(") && router["tls"] == nil {
			findings = append(findings, Finding{
				Severity: SeverityWarning,
				Path:     fmt.Sprintf("routers.%s", name),
				Message:  "Router with Host rule has no TLS configured",
				Rule:     "tls-configured",
			})
		}
	}
	return findings
}

func checkHealthCheck(config map[string]any) []Finding {
	services, ok := config["services"].(map[string]any)
	if !ok {
		return nil
	}
	var findings []Finding
	for name, s := range services {
		svc, ok := s.(map[string]any)
		if !ok {
			continue
		}
		lb, ok := svc["loadBalancer"].(map[string]any)
		if !ok {
			continue
		}
		if lb["healthCheck"] == nil {
			findings = append(findings, Finding{
				Severity: SeverityInfo,
				Path:     fmt.Sprintf("services.%s", name),
				Message:  "Service has no health check configured",
				Rule:     "health-check-present",
			})
		}
	}
	return findings
}
