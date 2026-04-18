# traefik-api-srv

Enterprise-grade API Gateway with AI/MCP capabilities, built on Traefik Proxy.

**traefik-api-srv** extends Traefik with features from Traefik Hub and Traefik Enterprise — plus exclusive AI Gateway and MCP Gateway capabilities not available in any Traefik product.

## Key Differentiators

- **AI Gateway**: Multi-LLM routing, semantic cache, PII guard
- **MCP Gateway**: Tool-Based Access Control, policy engine, audit logging for AI agents
- **Writable Dashboard**: Full CRUD from the web UI (Traefik OSS is read-only)
- **API Mocking**: Generate responses from OpenAPI specs without a backend
- **No Kubernetes Required**: Works with Docker Swarm, on-premise, or standalone

## Feature Parity

| Feature Set | Status |
|-------------|--------|
| Traefik Hub API Gateway | 100% ✅ |
| Traefik Hub API Management | 100% ✅ |
| Traefik Enterprise | ~90% (missing Raft HA, Service Mesh) |

## Quick Start

```bash
# Build
go build -o traefik-api-srv ./cmd/traefik

# Run
./traefik-api-srv --configFile=/etc/traefik/traefik.yml

# Dashboard
open http://localhost:8099/dashboard/
```

## Minimal Configuration

```yaml
# /etc/traefik/traefik.yml
entryPoints:
  web:
    address: ":80"
  traefik:
    address: ":8099"

api:
  dashboard: true
  insecure: true

providers:
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

ping:
  entryPoint: web
```

```yaml
# /etc/traefik/dynamic.yml
http:
  routers:
    my-app:
      rule: "PathPrefix(`/app`)"
      service: my-service
      middlewares:
        - my-auth

  services:
    my-service:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:8080"

  middlewares:
    my-auth:
      apiKey:
        headerName: X-API-Key
        keys:
          - value: "my-secret-key"
```

## Documentation

Full feature documentation with configuration examples:

- **[Feature Guide](docs/features/README.md)** — All features with config examples

### Feature Categories

| Category | Features |
|----------|----------|
| Authentication | JWT, OAuth 2.0, OIDC, LDAP, API Key, HMAC |
| Security | WAF (Coraza), OPA, HashiCorp Vault |
| Distributed | Rate Limit, In-Flight Limit, HTTP Cache, ACME |
| AI Gateway | Multi-LLM, Semantic Cache, PII Guard |
| MCP Gateway | TBAC, Policy Engine, Audit, Session LB |
| API Management | Versioning, Portal, OpenAPI, Mocking, Linter |
| Operations | Auto-Reload, Backup/Restore, mTLS, FIPS, Grafana |
| Dashboard | CRUD, Config Manager, Multi-cluster, Distributed view |

## Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Overview | `/` | HTTP/TCP/UDP router and service counts |
| AI Gateway | `/ai` | Configure LLM providers |
| MCP Gateway | `/mcp` | Configure MCP servers and policies |
| Security | `/security` | WAF rules, API keys, auth middlewares |
| API Management | `/api-management` | Portal settings, API catalog |
| Config Manager | `/config` | CRUD for routers/services/middlewares |
| Distributed | `/distributed` | Rate limit, cache, in-flight status |
| Multi-Cluster | `/clusters` | Instance health, entrypoints |
| Grafana | `/grafana` | Pre-built dashboard JSON export |

## API Endpoints

```
GET  /api/overview              — System overview
GET  /api/http/routers          — List HTTP routers
GET  /api/http/services         — List HTTP services
GET  /api/http/middlewares      — List HTTP middlewares
GET  /api/ai/status             — AI Gateway status
GET  /api/ai/providers          — AI provider list
GET  /api/mcp/status            — MCP Gateway status
GET  /api/mcp/servers           — MCP server list
GET  /api/mcp/policies          — MCP policy list
GET  /api/apimgmt/status        — API Management status
GET  /api/grafana/dashboards    — Grafana dashboard definitions
GET  /api/config/dynamic        — Full dynamic config
PUT  /api/config/http/routers/{name}     — Create/update router
DELETE /api/config/http/routers/{name}   — Delete router
GET  /api/config/static?section=ai       — Read static config section
PUT  /api/config/static?section=ai       — Write static config section
POST /api/reload                — Trigger graceful reload
GET  /api/config/backup         — Download config backup
POST /api/config/restore        — Restore from backup
```

## License

Apache 2.0
