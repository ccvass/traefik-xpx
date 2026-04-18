package apimock

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"gopkg.in/yaml.v3"
)

const typeName = "APIMock"

type spec struct {
	Paths map[string]map[string]operation `yaml:"paths" json:"paths"`
}

type operation struct {
	Summary   string                    `yaml:"summary" json:"summary"`
	Responses map[string]responseObj    `yaml:"responses" json:"responses"`
}

type responseObj struct {
	Description string                    `yaml:"description" json:"description"`
	Content     map[string]mediaTypeObj   `yaml:"content" json:"content"`
}

type mediaTypeObj struct {
	Schema  map[string]interface{} `yaml:"schema" json:"schema"`
	Example interface{}            `yaml:"example" json:"example"`
}

type apiMockMiddleware struct {
	next          http.Handler
	name          string
	spec          *spec
	defaultStatus int
	addDelay      time.Duration
}

// New creates an API mocking middleware.
func New(ctx context.Context, next http.Handler, config dynamic.APIMock, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	if config.SpecFile == "" {
		return nil, fmt.Errorf("specFile is required for apiMock middleware")
	}

	data, err := os.ReadFile(config.SpecFile)
	if err != nil {
		return nil, fmt.Errorf("reading spec file %s: %w", config.SpecFile, err)
	}

	var s spec
	if err := yaml.Unmarshal(data, &s); err != nil {
		return nil, fmt.Errorf("parsing spec file: %w", err)
	}

	defaultStatus := 200
	if config.DefaultStatus > 0 {
		defaultStatus = config.DefaultStatus
	}

	return &apiMockMiddleware{
		next:          next,
		name:          name,
		spec:          &s,
		defaultStatus: defaultStatus,
		addDelay:      time.Duration(config.AddDelay),
	}, nil
}

func (m *apiMockMiddleware) GetTracingInformation() (string, string) {
	return m.name, typeName
}

func (m *apiMockMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	if m.addDelay > 0 {
		time.Sleep(m.addDelay)
	}

	// Find matching path and method in spec.
	method := strings.ToLower(req.Method)
	path := req.URL.Path

	for specPath, methods := range m.spec.Paths {
		if !matchPath(specPath, path) {
			continue
		}
		op, ok := methods[method]
		if !ok {
			continue
		}

		// Determine status code.
		status := m.defaultStatus
		if h := req.Header.Get("X-Mock-Status"); h != "" {
			if s, err := strconv.Atoi(h); err == nil {
				status = s
			}
		}

		// Find response for status.
		statusStr := strconv.Itoa(status)
		resp, ok := op.Responses[statusStr]
		if !ok {
			// Try "default" response.
			resp, ok = op.Responses["default"]
			if !ok {
				// Return first available response.
				for k, v := range op.Responses {
					resp = v
					if s, err := strconv.Atoi(k); err == nil {
						status = s
					}
					break
				}
			}
		}

		// Build response body.
		body := m.buildResponse(resp)

		rw.Header().Set("Content-Type", "application/json")
		rw.Header().Set("X-Mock", "true")
		rw.Header().Set("X-Mock-Path", specPath)
		rw.WriteHeader(status)
		rw.Write(body)
		return
	}

	// No match — pass to next handler.
	m.next.ServeHTTP(rw, req)
}

func (m *apiMockMiddleware) buildResponse(resp responseObj) []byte {
	// Try to find example in content.
	for _, media := range resp.Content {
		if media.Example != nil {
			b, _ := json.Marshal(media.Example)
			return b
		}
		// Generate from schema.
		if media.Schema != nil {
			generated := generateFromSchema(media.Schema)
			b, _ := json.Marshal(generated)
			return b
		}
	}
	// Fallback: return description.
	b, _ := json.Marshal(map[string]string{"message": resp.Description})
	return b
}

func generateFromSchema(schema map[string]interface{}) interface{} {
	typ, _ := schema["type"].(string)
	switch typ {
	case "object":
		result := make(map[string]interface{})
		if props, ok := schema["properties"].(map[string]interface{}); ok {
			for k, v := range props {
				if propSchema, ok := v.(map[string]interface{}); ok {
					result[k] = generateFromSchema(propSchema)
				}
			}
		}
		return result
	case "array":
		if items, ok := schema["items"].(map[string]interface{}); ok {
			return []interface{}{generateFromSchema(items)}
		}
		return []interface{}{}
	case "string":
		if enum, ok := schema["enum"].([]interface{}); ok && len(enum) > 0 {
			return enum[0]
		}
		return "string"
	case "integer", "number":
		return 0
	case "boolean":
		return true
	default:
		return nil
	}
}

func matchPath(specPath, reqPath string) bool {
	// Simple path matching with {param} support.
	specParts := strings.Split(strings.Trim(specPath, "/"), "/")
	reqParts := strings.Split(strings.Trim(reqPath, "/"), "/")

	if len(specParts) != len(reqParts) {
		return false
	}

	for i, sp := range specParts {
		if strings.HasPrefix(sp, "{") && strings.HasSuffix(sp, "}") {
			continue // path parameter — matches anything
		}
		if sp != reqParts[i] {
			return false
		}
	}
	return true
}
