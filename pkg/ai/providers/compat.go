package providers

import (
	"github.com/traefik/traefik/v3/pkg/ai"
)

// NewOllama creates a new Ollama provider adapter.
// Ollama exposes an OpenAI-compatible API, so we reuse the OpenAI adapter.
func NewOllama(cfg ai.ProviderConfig) *OpenAI {
	if cfg.Endpoint == "" {
		cfg.Endpoint = "http://localhost:11434"
	}
	return NewOpenAI(cfg)
}

// NewMistral creates a new Mistral provider adapter.
// Mistral exposes an OpenAI-compatible API.
func NewMistral(cfg ai.ProviderConfig) *OpenAI {
	if cfg.Endpoint == "" {
		cfg.Endpoint = "https://api.mistral.ai"
	}
	return NewOpenAI(cfg)
}

// NewAzureOpenAI creates a new Azure OpenAI provider adapter.
// Azure OpenAI uses a slightly different URL pattern but the same request format.
func NewAzureOpenAI(cfg ai.ProviderConfig) *OpenAI {
	return NewOpenAI(cfg)
}
