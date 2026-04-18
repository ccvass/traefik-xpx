package contentguard

import (
	"regexp"
	"strings"
)

// InjectionDetector detects prompt injection attempts.
type InjectionDetector struct {
	patterns    []*regexp.Regexp
	sensitivity string // low, medium, high
	action      string // block, log
}

// InjectionConfig holds prompt injection detection configuration.
type InjectionConfig struct {
	Enabled     bool   `json:"enabled" toml:"enabled" yaml:"enabled"`
	Action      string `json:"action,omitempty" toml:"action,omitempty" yaml:"action,omitempty"`
	Sensitivity string `json:"sensitivity,omitempty" toml:"sensitivity,omitempty" yaml:"sensitivity,omitempty"`
}

// InjectionMatch represents a detected injection attempt.
type InjectionMatch struct {
	Pattern string
	Snippet string
}

// Common prompt injection patterns by sensitivity level.
var injectionPatterns = map[string][]string{
	"high": {
		`(?i)ignore\s+(all\s+)?previous\s+instructions`,
		`(?i)ignore\s+(all\s+)?above\s+instructions`,
		`(?i)disregard\s+(all\s+)?previous`,
		`(?i)forget\s+(all\s+)?previous`,
		`(?i)you\s+are\s+now\s+(?:a|an)\s+`,
		`(?i)new\s+instructions?\s*:`,
		`(?i)system\s*:\s*you\s+are`,
		`(?i)\bDAN\b.*\bjailbreak\b`,
	},
	"medium": {
		`(?i)pretend\s+(?:you\s+are|to\s+be)`,
		`(?i)act\s+as\s+(?:if|though)`,
		`(?i)override\s+(?:your|the)\s+(?:instructions|rules|guidelines)`,
		`(?i)bypass\s+(?:your|the)\s+(?:filters?|restrictions?|safety)`,
		`(?i)do\s+not\s+follow\s+(?:your|the)\s+(?:rules|guidelines)`,
		`(?i)reveal\s+(?:your|the)\s+(?:system|initial)\s+prompt`,
		`(?i)what\s+(?:is|are)\s+your\s+(?:system|initial)\s+(?:prompt|instructions)`,
	},
	"low": {
		`(?i)(?:output|print|show|display)\s+(?:your|the)\s+(?:system|initial)\s+prompt`,
		`(?i)repeat\s+(?:your|the)\s+(?:system|initial)\s+(?:prompt|instructions)`,
		`(?i)translate\s+(?:your|the)\s+(?:system|initial)\s+prompt`,
	},
}

// NewInjectionDetector creates a new prompt injection detector.
func NewInjectionDetector(config InjectionConfig) (*InjectionDetector, error) {
	sensitivity := config.Sensitivity
	if sensitivity == "" {
		sensitivity = "medium"
	}
	action := config.Action
	if action == "" {
		action = "block"
	}

	var patterns []*regexp.Regexp

	// Include patterns for the configured sensitivity and all higher levels.
	levels := sensitivityLevels(sensitivity)
	for _, level := range levels {
		for _, p := range injectionPatterns[level] {
			re, err := regexp.Compile(p)
			if err != nil {
				return nil, err
			}
			patterns = append(patterns, re)
		}
	}

	return &InjectionDetector{
		patterns:    patterns,
		sensitivity: sensitivity,
		action:      action,
	}, nil
}

// Scan checks text for prompt injection patterns.
func (d *InjectionDetector) Scan(text string) []InjectionMatch {
	var matches []InjectionMatch
	for _, p := range d.patterns {
		loc := p.FindStringIndex(text)
		if loc != nil {
			start := loc[0]
			end := loc[1]
			// Expand snippet for context.
			if start > 20 {
				start -= 20
			} else {
				start = 0
			}
			if end+20 < len(text) {
				end += 20
			} else {
				end = len(text)
			}
			matches = append(matches, InjectionMatch{
				Pattern: p.String(),
				Snippet: strings.TrimSpace(text[start:end]),
			})
		}
	}
	return matches
}

// Action returns the configured action.
func (d *InjectionDetector) Action() string {
	return d.action
}

func sensitivityLevels(level string) []string {
	switch level {
	case "low":
		return []string{"high", "medium", "low"}
	case "medium":
		return []string{"high", "medium"}
	case "high":
		return []string{"high"}
	default:
		return []string{"high", "medium"}
	}
}
