# System Settings

Configure static settings from the dashboard Settings page.

## Sections

- ACME / Let's Encrypt: email, storage, DNS provider
- Entrypoints: HTTP, HTTPS, dashboard addresses
- Providers: Docker/Swarm, File, Consul, etcd
- Observability: Prometheus, tracing, access logs
- AI Providers: OpenAI, Anthropic, Ollama endpoints
- MCP Servers: server endpoints and protocols

## API

```bash
GET  /api/config/static?section=acme
PUT  /api/config/static?section=acme
POST /api/reload   # Apply changes
```
