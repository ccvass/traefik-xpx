package ai

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync/atomic"

	"github.com/rs/zerolog/log"
)

// Gateway is the AI gateway HTTP handler that routes requests to LLM providers.
type Gateway struct {
	providers       []Provider
	defaultProvider string
	fallback        []string
	modelMap        map[string]Provider // model -> provider
	rrIndex         atomic.Uint64
}

// NewGateway creates a new AI gateway from configuration.
func NewGateway(providers []Provider, config GatewayConfig) (*Gateway, error) {
	if len(providers) == 0 {
		return nil, fmt.Errorf("at least one AI provider is required")
	}

	modelMap := make(map[string]Provider)
	for _, p := range providers {
		for _, cfg := range config.Providers {
			if cfg.Name == p.Name() {
				for _, m := range cfg.Models {
					modelMap[m] = p
				}
			}
		}
	}

	return &Gateway{
		providers:       providers,
		defaultProvider: config.DefaultProvider,
		fallback:        config.Fallback,
		modelMap:        modelMap,
	}, nil
}

// ServeHTTP handles /v1/chat/completions requests.
func (g *Gateway) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(rw, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var chatReq ChatRequest
	if err := json.NewDecoder(req.Body).Decode(&chatReq); err != nil {
		http.Error(rw, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	provider := g.selectProvider(chatReq.Model)
	if provider == nil {
		http.Error(rw, fmt.Sprintf("No provider available for model: %s", chatReq.Model), http.StatusBadGateway)
		return
	}

	if chatReq.Stream {
		g.handleStream(rw, req, chatReq, provider)
		return
	}

	g.handleCompletion(rw, req, chatReq, provider)
}

func (g *Gateway) handleCompletion(rw http.ResponseWriter, req *http.Request, chatReq ChatRequest, primary Provider) {
	chain := g.buildChain(primary)

	for _, p := range chain {
		resp, err := p.ChatCompletion(req.Context(), chatReq)
		if err != nil {
			log.Warn().Err(err).Str("provider", p.Name()).Msg("AI provider failed, trying next")
			continue
		}

		rw.Header().Set("Content-Type", "application/json")
		rw.Header().Set("X-AI-Provider", p.Name())
		json.NewEncoder(rw).Encode(resp)
		return
	}

	http.Error(rw, "All AI providers failed", http.StatusBadGateway)
}

func (g *Gateway) handleStream(rw http.ResponseWriter, req *http.Request, chatReq ChatRequest, primary Provider) {
	chain := g.buildChain(primary)

	for _, p := range chain {
		stream, err := p.ChatCompletionStream(req.Context(), chatReq)
		if err != nil {
			log.Warn().Err(err).Str("provider", p.Name()).Msg("AI provider stream failed, trying next")
			continue
		}
		defer stream.Close()

		rw.Header().Set("Content-Type", "text/event-stream")
		rw.Header().Set("Cache-Control", "no-cache")
		rw.Header().Set("Connection", "keep-alive")
		rw.Header().Set("X-AI-Provider", p.Name())
		rw.WriteHeader(http.StatusOK)

		flusher, _ := rw.(http.Flusher)
		buf := make([]byte, 4096)
		for {
			n, err := stream.Read(buf)
			if n > 0 {
				rw.Write(buf[:n])
				if flusher != nil {
					flusher.Flush()
				}
			}
			if err == io.EOF {
				break
			}
			if err != nil {
				break
			}
		}
		return
	}

	http.Error(rw, "All AI providers failed", http.StatusBadGateway)
}

func (g *Gateway) selectProvider(model string) Provider {
	// Model-specific routing.
	if p, ok := g.modelMap[model]; ok {
		return p
	}

	// Default provider.
	if g.defaultProvider != "" {
		for _, p := range g.providers {
			if p.Name() == g.defaultProvider && p.SupportsModel(model) {
				return p
			}
		}
	}

	// Round-robin among providers that support the model.
	candidates := g.candidatesForModel(model)
	if len(candidates) == 0 {
		return nil
	}
	idx := g.rrIndex.Add(1) - 1
	return candidates[idx%uint64(len(candidates))]
}

func (g *Gateway) candidatesForModel(model string) []Provider {
	var result []Provider
	for _, p := range g.providers {
		if p.SupportsModel(model) {
			result = append(result, p)
		}
	}
	return result
}

func (g *Gateway) buildChain(primary Provider) []Provider {
	chain := []Provider{primary}

	for _, name := range g.fallback {
		for _, p := range g.providers {
			if p.Name() == name && p.Name() != primary.Name() {
				chain = append(chain, p)
			}
		}
	}

	return chain
}
