package opa

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/open-policy-agent/opa/v1/rego"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const (
	typeName           = "OPA"
	defaultAllowField  = "allow"
	defaultMaxBodySize = 1024 * 1024 // 1MB
	defaultTimeout     = 5 * time.Second
)

type evaluator interface {
	evaluate(ctx context.Context, input map[string]any) (bool, error)
}

type opaMiddleware struct {
	next        http.Handler
	name        string
	evaluator   evaluator
	includeBody bool
	maxBodySize int64
}

// New creates an OPA authorization middleware.
func New(ctx context.Context, next http.Handler, config dynamic.OPA, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	maxBody := config.MaxBodySize
	if maxBody <= 0 {
		maxBody = defaultMaxBodySize
	}

	var eval evaluator
	var err error

	switch {
	case config.URL != "":
		eval, err = newRemoteEvaluator(config)
	case config.Policy != "" || config.PolicyPath != "":
		eval, err = newEmbeddedEvaluator(config)
	default:
		return nil, fmt.Errorf("OPA middleware requires either url (remote) or policy/policyPath (embedded)")
	}

	if err != nil {
		return nil, fmt.Errorf("creating OPA evaluator: %w", err)
	}

	return &opaMiddleware{
		next:        next,
		name:        name,
		evaluator:   eval,
		includeBody: config.IncludeBody,
		maxBodySize: maxBody,
	}, nil
}

func (o *opaMiddleware) GetTracingInformation() (string, string) {
	return o.name, typeName
}

func (o *opaMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), o.name, typeName)

	input, err := o.buildInput(req)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to build OPA input")
		observability.SetStatusErrorf(req.Context(), "OPA input error")
		http.Error(rw, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	allowed, err := o.evaluator.evaluate(req.Context(), input)
	if err != nil {
		logger.Error().Err(err).Msg("OPA evaluation failed")
		observability.SetStatusErrorf(req.Context(), "OPA evaluation error")
		http.Error(rw, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	if !allowed {
		logger.Debug().Msg("Request denied by OPA policy")
		observability.SetStatusErrorf(req.Context(), "Forbidden by policy")
		http.Error(rw, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	logger.Debug().Msg("Request allowed by OPA policy")
	o.next.ServeHTTP(rw, req)
}

func (o *opaMiddleware) buildInput(req *http.Request) (map[string]any, error) {
	hdrs := make(map[string]string, len(req.Header))
	for k, v := range req.Header {
		hdrs[strings.ToLower(k)] = strings.Join(v, ",")
	}

	sourceIP, _, _ := net.SplitHostPort(req.RemoteAddr)

	input := map[string]any{
		"method":    req.Method,
		"path":      req.URL.Path,
		"headers":   hdrs,
		"source_ip": sourceIP,
		"host":      req.Host,
		"scheme":    scheme(req),
		"query":     req.URL.RawQuery,
	}

	if o.includeBody && req.Body != nil {
		body, err := io.ReadAll(io.LimitReader(req.Body, o.maxBodySize))
		if err != nil {
			return nil, fmt.Errorf("reading request body: %w", err)
		}
		req.Body = io.NopCloser(bytes.NewReader(body))
		input["body"] = string(body)
	}

	return input, nil
}

func scheme(req *http.Request) string {
	if req.TLS != nil {
		return "https"
	}
	return "http"
}

// remoteEvaluator queries an external OPA REST API.
type remoteEvaluator struct {
	url        string
	allowField string
	client     *http.Client
}

func newRemoteEvaluator(config dynamic.OPA) (*remoteEvaluator, error) {
	timeout := defaultTimeout
	if config.Timeout > 0 {
		timeout = time.Duration(config.Timeout)
	}

	allowField := config.AllowField
	if allowField == "" {
		allowField = defaultAllowField
	}

	url := strings.TrimRight(config.URL, "/")
	if config.DecisionPath != "" {
		url += "/" + strings.TrimLeft(config.DecisionPath, "/")
	}

	return &remoteEvaluator{
		url:        url,
		allowField: allowField,
		client:     &http.Client{Timeout: timeout},
	}, nil
}

func (r *remoteEvaluator) evaluate(ctx context.Context, input map[string]any) (bool, error) {
	payload, err := json.Marshal(map[string]any{"input": input})
	if err != nil {
		return false, fmt.Errorf("marshaling OPA input: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.url, bytes.NewReader(payload))
	if err != nil {
		return false, fmt.Errorf("creating OPA request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		return false, fmt.Errorf("OPA request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("OPA returned status %d", resp.StatusCode)
	}

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, fmt.Errorf("decoding OPA response: %w", err)
	}

	// Navigate nested result (e.g. {"result": {"allow": true}}).
	decision, ok := result["result"]
	if !ok {
		decision = result
	}

	switch v := decision.(type) {
	case map[string]any:
		allow, _ := v[r.allowField].(bool)
		return allow, nil
	case bool:
		return v, nil
	default:
		return false, fmt.Errorf("unexpected OPA decision type: %T", decision)
	}
}

// embeddedEvaluator uses the OPA Go SDK to evaluate Rego policies locally.
type embeddedEvaluator struct {
	query      rego.PreparedEvalQuery
	allowField string
}

func newEmbeddedEvaluator(config dynamic.OPA) (*embeddedEvaluator, error) {
	allowField := config.AllowField
	if allowField == "" {
		allowField = defaultAllowField
	}

	var module string
	switch {
	case config.Policy != "":
		module = config.Policy
	case config.PolicyPath != "":
		data, err := os.ReadFile(config.PolicyPath)
		if err != nil {
			return nil, fmt.Errorf("reading policy file %s: %w", config.PolicyPath, err)
		}
		module = string(data)
	}

	queryStr := "data"
	if config.DecisionPath != "" {
		queryStr = "data." + strings.ReplaceAll(config.DecisionPath, "/", ".")
	}

	prepared, err := rego.New(
		rego.Query(queryStr),
		rego.Module("policy.rego", module),
	).PrepareForEval(context.Background())
	if err != nil {
		return nil, fmt.Errorf("preparing OPA query: %w", err)
	}

	return &embeddedEvaluator{
		query:      prepared,
		allowField: allowField,
	}, nil
}

func (e *embeddedEvaluator) evaluate(ctx context.Context, input map[string]any) (bool, error) {
	results, err := e.query.Eval(ctx, rego.EvalInput(input))
	if err != nil {
		return false, fmt.Errorf("OPA eval: %w", err)
	}

	if len(results) == 0 || len(results[0].Expressions) == 0 {
		return false, nil
	}

	val := results[0].Expressions[0].Value

	switch v := val.(type) {
	case bool:
		return v, nil
	case map[string]any:
		allow, _ := v[e.allowField].(bool)
		return allow, nil
	default:
		return false, fmt.Errorf("unexpected OPA result type: %T", val)
	}
}
