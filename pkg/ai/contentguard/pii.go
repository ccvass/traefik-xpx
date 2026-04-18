package contentguard

import (
	"regexp"
	"strings"
)

// PIIDetector detects and redacts PII from text.
type PIIDetector struct {
	patterns []*piiPattern
	action   string // redact, block, log
}

type piiPattern struct {
	name    string
	regex   *regexp.Regexp
	replace string
}

// PIIConfig holds PII detection configuration.
type PIIConfig struct {
	Enabled        bool              `json:"enabled" toml:"enabled" yaml:"enabled"`
	Action         string            `json:"action,omitempty" toml:"action,omitempty" yaml:"action,omitempty"`
	Entities       []string          `json:"entities,omitempty" toml:"entities,omitempty" yaml:"entities,omitempty"`
	CustomPatterns []CustomPIIPattern `json:"customPatterns,omitempty" toml:"customPatterns,omitempty" yaml:"customPatterns,omitempty"`
}

// CustomPIIPattern defines a user-provided PII pattern.
type CustomPIIPattern struct {
	Name    string `json:"name" toml:"name" yaml:"name"`
	Pattern string `json:"pattern" toml:"pattern" yaml:"pattern"`
}

// builtinPatterns maps entity names to regex patterns.
var builtinPatterns = map[string]*piiPattern{
	"email": {
		name:    "email",
		regex:   regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`),
		replace: "[EMAIL_REDACTED]",
	},
	"phone": {
		name:    "phone",
		regex:   regexp.MustCompile(`(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}`),
		replace: "[PHONE_REDACTED]",
	},
	"ssn": {
		name:    "ssn",
		regex:   regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`),
		replace: "[SSN_REDACTED]",
	},
	"credit_card": {
		name:    "credit_card",
		regex:   regexp.MustCompile(`\b(?:\d{4}[-\s]?){3}\d{4}\b`),
		replace: "[CC_REDACTED]",
	},
	"ip_address": {
		name:    "ip_address",
		regex:   regexp.MustCompile(`\b(?:\d{1,3}\.){3}\d{1,3}\b`),
		replace: "[IP_REDACTED]",
	},
	"passport": {
		name:    "passport",
		regex:   regexp.MustCompile(`\b[A-Z]{1,2}\d{6,9}\b`),
		replace: "[PASSPORT_REDACTED]",
	},
}

// NewPIIDetector creates a new PII detector from configuration.
func NewPIIDetector(config PIIConfig) (*PIIDetector, error) {
	action := config.Action
	if action == "" {
		action = "redact"
	}

	var patterns []*piiPattern

	entities := config.Entities
	if len(entities) == 0 {
		entities = []string{"email", "phone", "ssn", "credit_card", "ip_address"}
	}

	for _, entity := range entities {
		if p, ok := builtinPatterns[entity]; ok {
			patterns = append(patterns, p)
		}
	}

	for _, cp := range config.CustomPatterns {
		re, err := regexp.Compile(cp.Pattern)
		if err != nil {
			return nil, err
		}
		patterns = append(patterns, &piiPattern{
			name:    cp.Name,
			regex:   re,
			replace: "[" + strings.ToUpper(cp.Name) + "_REDACTED]",
		})
	}

	return &PIIDetector{patterns: patterns, action: action}, nil
}

// PIIMatch represents a detected PII entity.
type PIIMatch struct {
	Entity string
	Value  string
	Start  int
	End    int
}

// Scan detects PII in text and returns matches.
func (d *PIIDetector) Scan(text string) []PIIMatch {
	var matches []PIIMatch
	for _, p := range d.patterns {
		locs := p.regex.FindAllStringIndex(text, -1)
		for _, loc := range locs {
			matches = append(matches, PIIMatch{
				Entity: p.name,
				Value:  text[loc[0]:loc[1]],
				Start:  loc[0],
				End:    loc[1],
			})
		}
	}
	return matches
}

// Redact replaces all PII in text with redaction placeholders.
func (d *PIIDetector) Redact(text string) string {
	for _, p := range d.patterns {
		text = p.regex.ReplaceAllString(text, p.replace)
	}
	return text
}

// Action returns the configured action for PII detection.
func (d *PIIDetector) Action() string {
	return d.action
}
