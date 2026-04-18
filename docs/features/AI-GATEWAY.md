# AI Gateway — Multi-LLM Routing

Route requests to multiple LLM providers with load balancing, fallback, and caching.

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
        - gpt-4-turbo
        - gpt-3.5-turbo
    - name: anthropic
      type: anthropic
      endpoint: "https://api.anthropic.com/v1"
      models:
        - claude-3-opus
        - claude-3-sonnet
        - claude-3-haiku
    - name: ollama-local
      type: ollama
      endpoint: "http://ollama:11434/v1"
      models:
        - llama3
        - mistral
        - codellama
    - name: azure-openai
      type: azure
      endpoint: "https://myinstance.openai.azure.com"
      models:
        - gpt-4
  defaultProvider: openai
  fallback:
    - anthropic
    - ollama-local
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
        embeddingModel: "text-embedding-3-small"

    pii-filter:
      piiguard:
        patterns:
          - email
          - phone
          - ssn
          - credit_card
          - ip_address
        action: redact
        replacement: "[REDACTED]"

  routers:
    ai-completions:
      rule: "PathPrefix(`/v1/chat`)"
      entryPoints:
        - web
      middlewares:
        - pii-filter
        - ai-cache
      service: ai-gateway

    ai-embeddings:
      rule: "PathPrefix(`/v1/embeddings`)"
      entryPoints:
        - web
      service: ai-gateway
```

## Docker Swarm Deployment

```yaml
version: "3.8"

services:
  traefik:
    image: traefik-api-srv:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml
      - ./dynamic.yml:/etc/traefik/dynamic.yml
    ports:
      - "80:80"
      - "8099:8099"
    deploy:
      mode: global
      placement:
        constraints: [node.role == manager]

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama-data:/root/.ollama
    deploy:
      replicas: 1
      placement:
        constraints: [node.labels.gpu == true]

volumes:
  ollama-data:
```

## How It Works

1. Request arrives at `/v1/chat/completions`
2. PII Guard scans and redacts personal data from the prompt
3. Semantic Cache checks if a similar prompt was answered recently
4. If cache miss, routes to the appropriate provider based on model
5. If provider fails, tries fallback providers in order
6. Response is cached for future similar prompts

## Provider Options

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| `providers[].name` | Unique provider identifier | Yes | - |
| `providers[].type` | Provider type | Yes | - |
| `providers[].endpoint` | API endpoint URL | Yes | - |
| `providers[].models` | Supported model names | Yes | - |
| `providers[].maxRetries` | Retries on failure | No | 2 |
| `providers[].timeout` | Request timeout | No | 30s |
| `defaultProvider` | Default when model not matched | No | First provider |
| `fallback` | Ordered fallback on failure | No | - |

## Supported Provider Types

| Type | Description |
|------|-------------|
| `openai` | OpenAI API (GPT-4, GPT-3.5) |
| `anthropic` | Anthropic API (Claude 3) |
| `ollama` | Ollama local models |
| `azure` | Azure OpenAI Service |
| `mistral` | Mistral AI API |
