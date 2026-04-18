package ai

import (
	"context"
	"io"
)

// Provider is the interface that all LLM provider adapters must implement.
type Provider interface {
	// Name returns the provider's configured name.
	Name() string
	// ChatCompletion sends a non-streaming chat completion request.
	ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error)
	// ChatCompletionStream sends a streaming chat completion request.
	// The caller must close the returned ReadCloser.
	ChatCompletionStream(ctx context.Context, req ChatRequest) (io.ReadCloser, error)
	// SupportsModel returns true if this provider can serve the given model.
	SupportsModel(model string) bool
}
