package tbac

import (
	"fmt"
	"regexp"
	"time"

	"github.com/rs/zerolog/log"
)

// Policy defines task-based access control rules.
type Policy struct {
	Name          string     `json:"name" toml:"name" yaml:"name"`
	Tasks         []TaskRule `json:"tasks" toml:"tasks" yaml:"tasks"`
	DefaultAction string     `json:"defaultAction,omitempty" toml:"defaultAction,omitempty" yaml:"defaultAction,omitempty"`
}

// TaskRule defines access rules for a specific task pattern.
type TaskRule struct {
	TaskPattern      string        `json:"taskPattern" toml:"taskPattern" yaml:"taskPattern"`
	AllowedTools     []string      `json:"allowedTools,omitempty" toml:"allowedTools,omitempty" yaml:"allowedTools,omitempty"`
	DeniedTools      []string      `json:"deniedTools,omitempty" toml:"deniedTools,omitempty" yaml:"deniedTools,omitempty"`
	AllowedResources []string      `json:"allowedResources,omitempty" toml:"allowedResources,omitempty" yaml:"allowedResources,omitempty"`
	MaxConcurrent    int           `json:"maxConcurrent,omitempty" toml:"maxConcurrent,omitempty" yaml:"maxConcurrent,omitempty"`
	TimeLimit        time.Duration `json:"timeLimit,omitempty" toml:"timeLimit,omitempty" yaml:"timeLimit,omitempty"`
	compiled         *regexp.Regexp
}

// AccessRequest represents a request to access a tool or resource.
type AccessRequest struct {
	AgentID  string
	TaskName string
	Tool     string
	Resource string
}

// Decision represents an access control decision.
type Decision struct {
	Allowed bool
	Reason  string
	Rule    string
}

// Engine evaluates TBAC policies.
type Engine struct {
	policies []compiledPolicy
	defAction string
}

type compiledPolicy struct {
	name  string
	rules []compiledRule
}

type compiledRule struct {
	pattern          *regexp.Regexp
	allowedTools     map[string]bool
	deniedTools      map[string]bool
	allowedResources map[string]bool
	maxConcurrent    int
	timeLimit        time.Duration
}

// NewEngine creates a TBAC engine from policies.
func NewEngine(policies []Policy) (*Engine, error) {
	defAction := "deny"
	var compiled []compiledPolicy

	for _, p := range policies {
		if p.DefaultAction != "" {
			defAction = p.DefaultAction
		}
		cp := compiledPolicy{name: p.Name}
		for _, r := range p.Tasks {
			re, err := regexp.Compile(r.TaskPattern)
			if err != nil {
				return nil, fmt.Errorf("invalid task pattern %q: %w", r.TaskPattern, err)
			}
			cp.rules = append(cp.rules, compiledRule{
				pattern:          re,
				allowedTools:     toSet(r.AllowedTools),
				deniedTools:      toSet(r.DeniedTools),
				allowedResources: toSet(r.AllowedResources),
				maxConcurrent:    r.MaxConcurrent,
				timeLimit:        r.TimeLimit,
			})
		}
		compiled = append(compiled, cp)
	}

	return &Engine{policies: compiled, defAction: defAction}, nil
}

// Evaluate checks if an access request is allowed.
func (e *Engine) Evaluate(req AccessRequest) Decision {
	for _, p := range e.policies {
		for _, r := range p.rules {
			if !r.pattern.MatchString(req.TaskName) {
				continue
			}

			// Check denied tools first.
			if req.Tool != "" && r.deniedTools[req.Tool] {
				d := Decision{Allowed: false, Reason: "tool explicitly denied", Rule: p.name}
				e.audit(req, d)
				return d
			}

			// Check allowed tools.
			if req.Tool != "" && len(r.allowedTools) > 0 {
				if !r.allowedTools[req.Tool] {
					d := Decision{Allowed: false, Reason: "tool not in allowed list", Rule: p.name}
					e.audit(req, d)
					return d
				}
			}

			// Check allowed resources.
			if req.Resource != "" && len(r.allowedResources) > 0 {
				if !r.allowedResources[req.Resource] {
					d := Decision{Allowed: false, Reason: "resource not in allowed list", Rule: p.name}
					e.audit(req, d)
					return d
				}
			}

			d := Decision{Allowed: true, Reason: "matched task rule", Rule: p.name}
			e.audit(req, d)
			return d
		}
	}

	// No matching rule — apply default action.
	allowed := e.defAction == "allow"
	d := Decision{Allowed: allowed, Reason: "default action: " + e.defAction, Rule: "default"}
	e.audit(req, d)
	return d
}

func (e *Engine) audit(req AccessRequest, d Decision) {
	log.Info().
		Str("agent", req.AgentID).
		Str("task", req.TaskName).
		Str("tool", req.Tool).
		Str("resource", req.Resource).
		Bool("allowed", d.Allowed).
		Str("reason", d.Reason).
		Str("rule", d.Rule).
		Msg("TBAC access decision")
}

func toSet(items []string) map[string]bool {
	if len(items) == 0 {
		return nil
	}
	s := make(map[string]bool, len(items))
	for _, item := range items {
		s[item] = true
	}
	return s
}
