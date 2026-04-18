package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/traefik/traefik/v3/pkg/ai"
)

const defaultTimeout = 30 * time.Second

// OpenAI implements the Provider interface for OpenAI and OpenAI-compatible APIs.
type OpenAI struct {
	name     string
	endpoint string
	apiKey   string
	models   []string
	client   *http.Client
}

// NewOpenAI creates a new OpenAI provider adapter.
func NewOpenAI(cfg ai.ProviderConfig) *OpenAI {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	endpoint := cfg.Endpoint
	if endpoint == "" {
		endpoint = "https://api.openai.com"
	}
	return &OpenAI{
		name:     cfg.Name,
		endpoint: endpoint,
		apiKey:   cfg.APIKey,
		models:   cfg.Models,
		client:   &http.Client{Timeout: timeout},
	}
}

func (o *OpenAI) Name() string { return o.name }

func (o *OpenAI) SupportsModel(model string) bool {
	if len(o.models) == 0 {
		return true
	}
	for _, m := range o.models {
		if m == model {
			return true
		}
	}
	return false
}

func (o *OpenAI) ChatCompletion(ctx context.Context, req ai.ChatRequest) (*ai.ChatResponse, error) {
	req.Stream = false
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, o.endpoint+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	o.setHeaders(httpReq)

	resp, err := o.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI returned %d: %s", resp.StatusCode, string(respBody))
	}

	var chatResp ai.ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}
	return &chatResp, nil
}

func (o *OpenAI) ChatCompletionStream(ctx context.Context, req ai.ChatRequest) (io.ReadCloser, error) {
	req.Stream = true
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, o.endpoint+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	o.setHeaders(httpReq)

	// Use a client without timeout for streaming.
	streamClient := &http.Client{}
	resp, err := streamClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI stream request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("OpenAI returned %d: %s", resp.StatusCode, string(respBody))
	}

	return resp.Body, nil
}

func (o *OpenAI) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	if o.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+o.apiKey)
	}
}
