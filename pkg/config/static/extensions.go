package static

// AIConfig holds the AI Gateway static configuration.
type AIConfig struct {
	Providers       []AIProviderConfig `json:"providers,omitempty" toml:"providers,omitempty" yaml:"providers,omitempty" export:"true"`
	DefaultProvider string             `json:"defaultProvider,omitempty" toml:"defaultProvider,omitempty" yaml:"defaultProvider,omitempty" export:"true"`
}

// AIProviderConfig holds configuration for a single LLM provider.
type AIProviderConfig struct {
	Name     string   `json:"name" toml:"name" yaml:"name" export:"true"`
	Type     string   `json:"type" toml:"type" yaml:"type" export:"true"`
	Endpoint string   `json:"endpoint" toml:"endpoint" yaml:"endpoint" export:"true"`
	Models   []string `json:"models,omitempty" toml:"models,omitempty" yaml:"models,omitempty" export:"true"`
}

// MCPConfig holds the MCP Gateway static configuration.
type MCPConfig struct {
	Servers  []MCPServerConfig  `json:"servers,omitempty" toml:"servers,omitempty" yaml:"servers,omitempty" export:"true"`
	Policies []MCPPolicyConfig  `json:"policies,omitempty" toml:"policies,omitempty" yaml:"policies,omitempty" export:"true"`
}

// MCPServerConfig holds configuration for a single MCP server.
type MCPServerConfig struct {
	Name     string `json:"name" toml:"name" yaml:"name" export:"true"`
	Endpoint string `json:"endpoint" toml:"endpoint" yaml:"endpoint" export:"true"`
	Protocol string `json:"protocol,omitempty" toml:"protocol,omitempty" yaml:"protocol,omitempty" export:"true"`
}

// MCPPolicyConfig holds a policy rule reference.
type MCPPolicyConfig struct {
	Name       string `json:"name" toml:"name" yaml:"name" export:"true"`
	Action     string `json:"action" toml:"action" yaml:"action" export:"true"`
	Priority   int    `json:"priority,omitempty" toml:"priority,omitempty" yaml:"priority,omitempty" export:"true"`
}

// APIMgmtConfig holds the API Management static configuration.
type APIMgmtConfig struct {
	Portal *APIMgmtPortalConfig `json:"portal,omitempty" toml:"portal,omitempty" yaml:"portal,omitempty" export:"true"`
}

// APIMgmtPortalConfig holds the developer portal configuration.
type APIMgmtPortalConfig struct {
	Enabled      bool   `json:"enabled,omitempty" toml:"enabled,omitempty" yaml:"enabled,omitempty" export:"true"`
	Title        string `json:"title,omitempty" toml:"title,omitempty" yaml:"title,omitempty" export:"true"`
	BasePath     string `json:"basePath,omitempty" toml:"basePath,omitempty" yaml:"basePath,omitempty" export:"true"`
}
