# AI Gateway — Multi-LLM Routing

Route requests to multiple LLM providers with load balancing and fallback.

## Static Configuration

```yaml
# traefik.yml
ai:
  providers:
    - name: openai
      type: openai
      endpoint: "https://api.openai.com/v1"
      models:
        - gpt-4
        - gpt-3.5-turbo
    - name: anthropic
      type: anthropic
      endpoint: "https://api.anthropic.com/v1"
      models:
        - claude-3-opus
        - claude-3-sonnet
    - name: ollama
      type: ollama
      endpoint: "http://localhost:11434/v1"
      models:
        - llama3
        - mistral
  defaultProvider: openai
  fallback:
    - anthropic
    - ollama
```

## Dynamic Middleware Configuration

```yaml
# dynamic.yml
http:
  middlewares:
    ai-cache:
      semanticCache:
        ttl: 3600
        maxEntries: 10000
        similarityThreshold: 0.92

    pii-filter:
      piiguard:
        patterns:
          - email
          - phone
          - ssn
        action: redact

  routers:
    ai-router:
      rule: "PathPrefix(`/v1/chat`)"
      middlewares:
        - pii-filter
        - ai-cache
      service: ai-gateway
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `providers[].name` | Provider identifier | Required |
| `providers[].type` | Provider type (openai, anthropic, ollama, azure, mistral) | Required |
| `providers[].endpoint` | API endpoint URL | Required |
| `providers[].models` | Supported models | Required |
| `defaultProvider` | Default provider for unmatched models | First provider |
| `fallback` | Ordered fallback providers on failure | - |
