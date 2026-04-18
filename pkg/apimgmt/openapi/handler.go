package openapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"
)

// Config holds OpenAPI support configuration.
type Config struct {
	SpecPath         string `json:"specPath,omitempty" toml:"specPath,omitempty" yaml:"specPath,omitempty"`
	SpecURL          string `json:"specUrl,omitempty" toml:"specUrl,omitempty" yaml:"specUrl,omitempty"`
	ValidateRequest  bool   `json:"validateRequest,omitempty" toml:"validateRequest,omitempty" yaml:"validateRequest,omitempty"`
	ValidateResponse bool   `json:"validateResponse,omitempty" toml:"validateResponse,omitempty" yaml:"validateResponse,omitempty"`
	ServeSpec        bool   `json:"serveSpec,omitempty" toml:"serveSpec,omitempty" yaml:"serveSpec,omitempty"`
	SpecEndpoint     string `json:"specEndpoint,omitempty" toml:"specEndpoint,omitempty" yaml:"specEndpoint,omitempty"`
}

// RouteInfo holds extracted route information from an OpenAPI spec.
type RouteInfo struct {
	Path    string
	Method  string
	Summary string
	Tags    []string
}

// Handler provides OpenAPI spec serving and request validation.
type Handler struct {
	doc          *openapi3.T
	router       routers.Router
	specJSON     []byte
	config       Config
	specEndpoint string
}

// New creates a new OpenAPI handler from configuration.
func New(config Config) (*Handler, error) {
	var doc *openapi3.T
	var err error

	loader := openapi3.NewLoader()

	switch {
	case config.SpecPath != "":
		doc, err = loader.LoadFromFile(config.SpecPath)
	case config.SpecURL != "":
		u, parseErr := url.Parse(config.SpecURL)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid spec URL: %w", parseErr)
		}
		doc, err = loader.LoadFromURI(u)
	default:
		return nil, fmt.Errorf("specPath or specUrl is required")
	}
	if err != nil {
		return nil, fmt.Errorf("loading OpenAPI spec: %w", err)
	}

	if err := doc.Validate(context.Background()); err != nil {
		return nil, fmt.Errorf("invalid OpenAPI spec: %w", err)
	}

	router, err := gorillamux.NewRouter(doc)
	if err != nil {
		return nil, fmt.Errorf("creating OpenAPI router: %w", err)
	}

	specJSON, err := json.Marshal(doc)
	if err != nil {
		return nil, fmt.Errorf("marshaling spec: %w", err)
	}

	endpoint := config.SpecEndpoint
	if endpoint == "" {
		endpoint = "/openapi.json"
	}

	return &Handler{
		doc:          doc,
		router:       router,
		specJSON:     specJSON,
		config:       config,
		specEndpoint: endpoint,
	}, nil
}

// ExtractRoutes returns all routes defined in the OpenAPI spec.
func (h *Handler) ExtractRoutes() []RouteInfo {
	var routes []RouteInfo
	for path, item := range h.doc.Paths.Map() {
		for method, op := range item.Operations() {
			ri := RouteInfo{
				Path:    path,
				Method:  strings.ToUpper(method),
				Summary: op.Summary,
				Tags:    op.Tags,
			}
			routes = append(routes, ri)
		}
	}
	return routes
}

// ValidateRequest validates an HTTP request against the OpenAPI spec.
func (h *Handler) ValidateRequest(req *http.Request) error {
	if !h.config.ValidateRequest {
		return nil
	}

	route, pathParams, err := h.router.FindRoute(req)
	if err != nil {
		return fmt.Errorf("route not found in spec: %w", err)
	}

	input := &openapi3filter.RequestValidationInput{
		Request:    req,
		PathParams: pathParams,
		Route:      route,
		Options: &openapi3filter.Options{
			AuthenticationFunc: openapi3filter.NoopAuthenticationFunc,
		},
	}

	return openapi3filter.ValidateRequest(req.Context(), input)
}

// ServeSpec serves the OpenAPI spec as JSON.
func (h *Handler) ServeSpec(rw http.ResponseWriter, req *http.Request) {
	rw.Header().Set("Content-Type", "application/json")
	rw.Header().Set("Access-Control-Allow-Origin", "*")
	rw.Write(h.specJSON)
}

// SpecEndpoint returns the configured spec endpoint path.
func (h *Handler) SpecEndpoint() string {
	return h.specEndpoint
}

// LoadFromFile loads an OpenAPI spec from a file path.
func LoadFromFile(path string) (*openapi3.T, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromData(data)
	if err != nil {
		return nil, err
	}

	return doc, doc.Validate(context.Background())
}
