package contentguard

import (
	"github.com/rs/zerolog/log"
)

// Config holds the content guard configuration.
type Config struct {
	PIIDetection    *PIIConfig       `json:"piiDetection,omitempty" toml:"piiDetection,omitempty" yaml:"piiDetection,omitempty"`
	PromptInjection *InjectionConfig `json:"promptInjection,omitempty" toml:"promptInjection,omitempty" yaml:"promptInjection,omitempty"`
}

// Result holds the outcome of a content guard scan.
type Result struct {
	Blocked          bool
	Redacted         bool
	RedactedText     string
	PIIMatches       []PIIMatch
	InjectionMatches []InjectionMatch
}

// Guard performs content filtering on AI requests and responses.
type Guard struct {
	pii       *PIIDetector
	injection *InjectionDetector
}

// New creates a new content guard.
func New(config Config) (*Guard, error) {
	g := &Guard{}

	if config.PIIDetection != nil && config.PIIDetection.Enabled {
		pii, err := NewPIIDetector(*config.PIIDetection)
		if err != nil {
			return nil, err
		}
		g.pii = pii
	}

	if config.PromptInjection != nil && config.PromptInjection.Enabled {
		inj, err := NewInjectionDetector(*config.PromptInjection)
		if err != nil {
			return nil, err
		}
		g.injection = inj
	}

	return g, nil
}

// ScanRequest scans request content (prompt) for PII and injection.
func (g *Guard) ScanRequest(text string) Result {
	result := Result{RedactedText: text}

	if g.injection != nil {
		matches := g.injection.Scan(text)
		if len(matches) > 0 {
			result.InjectionMatches = matches
			for _, m := range matches {
				log.Warn().Str("pattern", m.Pattern).Str("snippet", m.Snippet).Msg("Prompt injection detected")
			}
			if g.injection.Action() == "block" {
				result.Blocked = true
				return result
			}
		}
	}

	if g.pii != nil {
		matches := g.pii.Scan(text)
		if len(matches) > 0 {
			result.PIIMatches = matches
			for _, m := range matches {
				log.Warn().Str("entity", m.Entity).Msg("PII detected in request")
			}
			switch g.pii.Action() {
			case "block":
				result.Blocked = true
				return result
			case "redact":
				result.RedactedText = g.pii.Redact(text)
				result.Redacted = true
			}
		}
	}

	return result
}

// ScanResponse scans response content (completion) for PII.
func (g *Guard) ScanResponse(text string) Result {
	result := Result{RedactedText: text}

	if g.pii != nil {
		matches := g.pii.Scan(text)
		if len(matches) > 0 {
			result.PIIMatches = matches
			for _, m := range matches {
				log.Warn().Str("entity", m.Entity).Msg("PII detected in response")
			}
			switch g.pii.Action() {
			case "block":
				result.Blocked = true
			case "redact":
				result.RedactedText = g.pii.Redact(text)
				result.Redacted = true
			}
		}
	}

	return result
}
