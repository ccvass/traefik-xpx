package versioning

import (
	"net/http"
	"strings"

	"github.com/traefik/traefik/v3/pkg/apimgmt"
)

const (
	StrategyPath   = "path"
	StrategyHeader = "header"
	StrategyQuery  = "query"

	defaultHeader = "API-Version"
	defaultQuery  = "version"
)

// Router resolves the API version from an incoming request and injects lifecycle headers.
type Router struct {
	apis     map[string]*apimgmt.APIDefinition // name -> definition
	versions map[string]map[string]*apimgmt.APIVersion // apiName -> version -> APIVersion
}

// NewRouter creates a version router from API definitions.
func NewRouter(defs []apimgmt.APIDefinition) *Router {
	r := &Router{
		apis:     make(map[string]*apimgmt.APIDefinition, len(defs)),
		versions: make(map[string]map[string]*apimgmt.APIVersion, len(defs)),
	}
	for i := range defs {
		d := &defs[i]
		r.apis[d.Name] = d
		vm := make(map[string]*apimgmt.APIVersion, len(d.Versions))
		for j := range d.Versions {
			vm[d.Versions[j].Version] = &d.Versions[j]
		}
		r.versions[d.Name] = vm
	}
	return r
}

// Resolve extracts the version from the request based on the API's versioning strategy.
func (r *Router) Resolve(apiName string, req *http.Request) (string, *apimgmt.APIVersion) {
	api, ok := r.apis[apiName]
	if !ok {
		return "", nil
	}

	strategy := api.VersionStrategy
	if strategy == "" {
		strategy = StrategyPath
	}

	var version string
	switch strategy {
	case StrategyPath:
		version = extractPathVersion(req.URL.Path)
	case StrategyHeader:
		version = req.Header.Get(defaultHeader)
	case StrategyQuery:
		version = req.URL.Query().Get(defaultQuery)
	}

	if version == "" {
		// Return the latest active version.
		return r.latestActive(apiName)
	}

	vm := r.versions[apiName]
	if v, ok := vm[version]; ok {
		return version, v
	}
	return version, nil
}

// InjectHeaders adds Sunset and Deprecation headers for deprecated versions.
func InjectHeaders(rw http.ResponseWriter, v *apimgmt.APIVersion) {
	if v == nil {
		return
	}
	switch v.Status {
	case "deprecated":
		if v.DeprecatedAt != "" {
			rw.Header().Set("Deprecation", v.DeprecatedAt)
		}
		if v.SunsetAt != "" {
			rw.Header().Set("Sunset", v.SunsetAt)
		}
	case "retired":
		rw.Header().Set("Deprecation", "true")
		if v.SunsetAt != "" {
			rw.Header().Set("Sunset", v.SunsetAt)
		}
	}
}

// IsAccessible returns true if the version can serve traffic.
func IsAccessible(v *apimgmt.APIVersion) bool {
	if v == nil {
		return false
	}
	return v.Status == "active" || v.Status == "deprecated" || v.Status == ""
}

func (r *Router) latestActive(apiName string) (string, *apimgmt.APIVersion) {
	api, ok := r.apis[apiName]
	if !ok {
		return "", nil
	}
	// Return last active version in the list.
	for i := len(api.Versions) - 1; i >= 0; i-- {
		v := &api.Versions[i]
		if v.Status == "active" || v.Status == "" {
			return v.Version, v
		}
	}
	return "", nil
}

// extractPathVersion extracts version from path like /v1/users -> "v1".
func extractPathVersion(path string) string {
	parts := strings.SplitN(strings.TrimPrefix(path, "/"), "/", 2)
	if len(parts) > 0 && len(parts[0]) >= 2 && (parts[0][0] == 'v' || parts[0][0] == 'V') {
		return parts[0]
	}
	return ""
}
