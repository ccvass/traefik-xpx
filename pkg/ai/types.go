package ai

import (
	"time"
)

// GatewayConfig holds the AI gateway static configuration.
type GatewayConfig struct {
	Providers       []ProviderConfig `json:"providers" toml:"providers" yaml:"providers"`
	DefaultProvider string           `json:"defaultProvider,omitempty" toml:"defaultProvider,omitempty" yaml:"defaultProvider,omitempty"`
	Fallback        []string         `json:"fallback,omitempty" toml:"fallback,omitempty" yaml:"fallback,omitempty"`
	LoadBalancing   string           `json:"loadBalancing,omitempty" toml:"loadBalancing,omitempty" yaml:"loadBalancing,omitempty"` // roundRobin, leastLatency, cost
}

// ProviderConfig holds configuration for a single LLM provider.
type ProviderConfig struct {
	Name       string        `json:"name" toml:"name" yaml:"name"`
	Type       string        `json:"type" toml:"type" yaml:"type"` // openai, anthropic, azure, ollama, mistral
	Endpoint   string        `json:"endpoint" toml:"endpoint" yaml:"endpoint"`
	APIKey     string        `json:"apiKey,omitempty" toml:"apiKey,omitempty" yaml:"apiKey,omitempty"`
	Models     []string      `json:"models,omitempty" toml:"models,omitempty" yaml:"models,omitempty"`
	MaxRetries int           `json:"maxRetries,omitempty" toml:"maxRetries,omitempty" yaml:"maxRetries,omitempty"`
	Timeout    time.Duration `json:"timeout,omitempty" toml:"timeout,omitempty" yaml:"timeout,omitempty"`
}

// ChatRequest is the unified OpenAI-compatible chat completion request.
type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature *float64      `json:"temperature,omitempty"`
	MaxTokens   *int          `json:"max_tokens,omitempty"`
	Stream      bool          `json:"stream,omitempty"`
	TopP        *float64      `json:"top_p,omitempty"`
	Stop        []string      `json:"stop,omitempty"`
}

// ChatMessage represents a single message in a chat conversation.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse is the unified OpenAI-compatible chat completion response.
type ChatResponse struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []ChatChoice   `json:"choices"`
	Usage   *ChatUsage     `json:"usage,omitempty"`
}

// ChatChoice represents a single completion choice.
type ChatChoice struct {
	Index        int          `json:"index"`
	Message      ChatMessage  `json:"message"`
	FinishReason string       `json:"finish_reason"`
}

// ChatUsage holds token usage information.
type ChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// StreamChunk is a single SSE chunk in a streaming response.
type StreamChunk struct {
	ID      string              `json:"id"`
	Object  string              `json:"object"`
	Created int64               `json:"created"`
	Model   string              `json:"model"`
	Choices []StreamChunkChoice `json:"choices"`
}

// StreamChunkChoice represents a delta in a streaming chunk.
type StreamChunkChoice struct {
	Index        int              `json:"index"`
	Delta        ChatMessageDelta `json:"delta"`
	FinishReason *string          `json:"finish_reason"`
}

// ChatMessageDelta is a partial message in a streaming response.
type ChatMessageDelta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}
