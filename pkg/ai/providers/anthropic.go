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

// Anthropic implements the Provider interface for Anthropic's Claude API.
type Anthropic struct {
	name     string
	endpoint string
	apiKey   string
	models   []string
	client   *http.Client
}

// NewAnthropic creates a new Anthropic provider adapter.
func NewAnthropic(cfg ai.ProviderConfig) *Anthropic {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	endpoint := cfg.Endpoint
	if endpoint == "" {
		endpoint = "https://api.anthropic.com"
	}
	return &Anthropic{
		name:     cfg.Name,
		endpoint: endpoint,
		apiKey:   cfg.APIKey,
		models:   cfg.Models,
		client:   &http.Client{Timeout: timeout},
	}
}

func (a *Anthropic) Name() string { return a.name }

func (a *Anthropic) SupportsModel(model string) bool {
	if len(a.models) == 0 {
		return true
	}
	for _, m := range a.models {
		if m == model {
			return true
		}
	}
	return false
}

// anthropicRequest is the Anthropic-specific request format.
type anthropicRequest struct {
	Model       string               `json:"model"`
	Messages    []anthropicMessage   `json:"messages"`
	MaxTokens   int                  `json:"max_tokens"`
	Temperature *float64             `json:"temperature,omitempty"`
	TopP        *float64             `json:"top_p,omitempty"`
	Stream      bool                 `json:"stream,omitempty"`
	System      string               `json:"system,omitempty"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Model   string `json:"model"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason string `json:"stop_reason"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

func (a *Anthropic) ChatCompletion(ctx context.Context, req ai.ChatRequest) (*ai.ChatResponse, error) {
	anthropicReq := a.toAnthropicRequest(req)
	anthropicReq.Stream = false

	body, err := json.Marshal(anthropicReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.endpoint+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	a.setHeaders(httpReq)

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Anthropic request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Anthropic returned %d: %s", resp.StatusCode, string(respBody))
	}

	var anthropicResp anthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return a.toUnifiedResponse(anthropicResp), nil
}

func (a *Anthropic) ChatCompletionStream(ctx context.Context, req ai.ChatRequest) (io.ReadCloser, error) {
	anthropicReq := a.toAnthropicRequest(req)
	anthropicReq.Stream = true

	body, err := json.Marshal(anthropicReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.endpoint+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	a.setHeaders(httpReq)

	streamClient := &http.Client{}
	resp, err := streamClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Anthropic stream request failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("Anthropic returned %d: %s", resp.StatusCode, string(respBody))
	}

	return resp.Body, nil
}

func (a *Anthropic) toAnthropicRequest(req ai.ChatRequest) anthropicRequest {
	ar := anthropicRequest{
		Model:       req.Model,
		Temperature: req.Temperature,
		TopP:        req.TopP,
		MaxTokens:   4096,
	}
	if req.MaxTokens != nil {
		ar.MaxTokens = *req.MaxTokens
	}

	for _, msg := range req.Messages {
		if msg.Role == "system" {
			ar.System = msg.Content
			continue
		}
		ar.Messages = append(ar.Messages, anthropicMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}
	return ar
}

func (a *Anthropic) toUnifiedResponse(resp anthropicResponse) *ai.ChatResponse {
	content := ""
	if len(resp.Content) > 0 {
		content = resp.Content[0].Text
	}

	return &ai.ChatResponse{
		ID:      resp.ID,
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Model:   resp.Model,
		Choices: []ai.ChatChoice{{
			Index:        0,
			Message:      ai.ChatMessage{Role: "assistant", Content: content},
			FinishReason: resp.StopReason,
		}},
		Usage: &ai.ChatUsage{
			PromptTokens:     resp.Usage.InputTokens,
			CompletionTokens: resp.Usage.OutputTokens,
			TotalTokens:      resp.Usage.InputTokens + resp.Usage.OutputTokens,
		},
	}
}

func (a *Anthropic) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("anthropic-version", "2023-06-01")
	if a.apiKey != "" {
		req.Header.Set("x-api-key", a.apiKey)
	}
}
