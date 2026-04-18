package policy

import (
	"fmt"
	"regexp"
	"time"

	"github.com/rs/zerolog/log"
)

// Rule defines a fine-grained policy rule for AI tool access.
type Rule struct {
	Name           string        `json:"name" toml:"name" yaml:"name"`
	ToolPattern    string        `json:"toolPattern" toml:"toolPattern" yaml:"toolPattern"`
	Action         string        `json:"action" toml:"action" yaml:"action"` // allow, deny, rateLimit, audit
	Conditions     []Condition   `json:"conditions,omitempty" toml:"conditions,omitempty" yaml:"conditions,omitempty"`
	RateLimit      int           `json:"rateLimit,omitempty" toml:"rateLimit,omitempty" yaml:"rateLimit,omitempty"`
	RatePeriod     time.Duration `json:"ratePeriod,omitempty" toml:"ratePeriod,omitempty" yaml:"ratePeriod,omitempty"`
	Priority       int           `json:"priority,omitempty" toml:"priority,omitempty" yaml:"priority,omitempty"`
}

// Condition defines a condition for policy evaluation.
type Condition struct {
	Field    string `json:"field" toml:"field" yaml:"field"`       // agent_id, task, scope, time
	Operator string `json:"operator" toml:"operator" yaml:"operator"` // eq, neq, in, matches, gt, lt
	Value    string `json:"value" toml:"value" yaml:"value"`
}

// Request represents a tool invocation request to evaluate.
type Request struct {
	AgentID string
	Tool    string
	Task    string
	Scope   string
	Time    time.Time
}

// Decision represents a policy evaluation result.
type Decision struct {
	Allowed bool
	Action  string
	Rule    string
	Reason  string
}

// Engine evaluates fine-grained policies for AI tool access.
type Engine struct {
	rules []compiledRule
}

type compiledRule struct {
	rule    Rule
	pattern *regexp.Regexp
}

// NewEngine creates a policy engine from rules.
func NewEngine(rules []Rule) (*Engine, error) {
	compiled := make([]compiledRule, 0, len(rules))
	for _, r := range rules {
		re, err := regexp.Compile(r.ToolPattern)
		if err != nil {
			return nil, fmt.Errorf("invalid tool pattern %q in rule %s: %w", r.ToolPattern, r.Name, err)
		}
		compiled = append(compiled, compiledRule{rule: r, pattern: re})
	}
	return &Engine{rules: compiled}, nil
}

// Evaluate checks a request against all policy rules.
func (e *Engine) Evaluate(req Request) Decision {
	for _, cr := range e.rules {
		if !cr.pattern.MatchString(req.Tool) {
			continue
		}
		if !matchConditions(cr.rule.Conditions, req) {
			continue
		}

		d := Decision{
			Action: cr.rule.Action,
			Rule:   cr.rule.Name,
		}

		switch cr.rule.Action {
		case "deny":
			d.Allowed = false
			d.Reason = "denied by policy"
		case "allow":
			d.Allowed = true
			d.Reason = "allowed by policy"
		case "audit":
			d.Allowed = true
			d.Reason = "allowed with audit"
			log.Info().Str("agent", req.AgentID).Str("tool", req.Tool).Str("rule", cr.rule.Name).Msg("Policy audit")
		default:
			d.Allowed = true
			d.Reason = "default allow"
		}

		return d
	}

	return Decision{Allowed: true, Action: "default", Rule: "none", Reason: "no matching policy"}
}

func matchConditions(conditions []Condition, req Request) bool {
	for _, c := range conditions {
		val := fieldValue(c.Field, req)
		if !evalCondition(c.Operator, val, c.Value) {
			return false
		}
	}
	return true
}

func fieldValue(field string, req Request) string {
	switch field {
	case "agent_id":
		return req.AgentID
	case "task":
		return req.Task
	case "scope":
		return req.Scope
	default:
		return ""
	}
}

func evalCondition(op, actual, expected string) bool {
	switch op {
	case "eq":
		return actual == expected
	case "neq":
		return actual != expected
	case "matches":
		matched, _ := regexp.MatchString(expected, actual)
		return matched
	default:
		return true
	}
}
