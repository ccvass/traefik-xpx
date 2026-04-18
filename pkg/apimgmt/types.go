package apimgmt

// APIDefinition represents a logical API with versioning.
type APIDefinition struct {
	Name            string       `json:"name" toml:"name" yaml:"name"`
	Group           string       `json:"group,omitempty" toml:"group,omitempty" yaml:"group,omitempty"`
	Versions        []APIVersion `json:"versions" toml:"versions" yaml:"versions"`
	VersionStrategy string       `json:"versionStrategy,omitempty" toml:"versionStrategy,omitempty" yaml:"versionStrategy,omitempty"` // path, header, query
}

// APIVersion represents a specific version of an API.
type APIVersion struct {
	Version      string   `json:"version" toml:"version" yaml:"version"`
	Routes       []string `json:"routes" toml:"routes" yaml:"routes"`
	Status       string   `json:"status,omitempty" toml:"status,omitempty" yaml:"status,omitempty"` // draft, active, deprecated, retired
	DeprecatedAt string   `json:"deprecatedAt,omitempty" toml:"deprecatedAt,omitempty" yaml:"deprecatedAt,omitempty"`
	SunsetAt     string   `json:"sunsetAt,omitempty" toml:"sunsetAt,omitempty" yaml:"sunsetAt,omitempty"`
}

// APIGroup represents a logical grouping of APIs.
type APIGroup struct {
	Name        string          `json:"name" toml:"name" yaml:"name"`
	Description string          `json:"description,omitempty" toml:"description,omitempty" yaml:"description,omitempty"`
	APIs        []APIDefinition `json:"apis,omitempty" toml:"apis,omitempty" yaml:"apis,omitempty"`
}
