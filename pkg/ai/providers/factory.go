package providers

import (
	"fmt"

	"github.com/traefik/traefik/v3/pkg/ai"
)

// New creates a Provider from configuration.
func New(cfg ai.ProviderConfig) (ai.Provider, error) {
	switch cfg.Type {
	case "openai":
		return NewOpenAI(cfg), nil
	case "anthropic":
		return NewAnthropic(cfg), nil
	case "ollama":
		return NewOllama(cfg), nil
	case "mistral":
		return NewMistral(cfg), nil
	case "azure":
		return NewAzureOpenAI(cfg), nil
	default:
		return nil, fmt.Errorf("unsupported AI provider type: %s", cfg.Type)
	}
}
