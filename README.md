<p align="center">
  <img src="docs/content/assets/img/traefik.logo.png" alt="traefik-api-srv" width="300">
</p>

<h1 align="center">traefik-api-srv</h1>

<p align="center">
  <strong>Enterprise API Gateway with AI & MCP capabilities</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#docker-swarm">Docker Swarm</a> •
  <a href="#dashboard">Dashboard</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#api-reference">API Reference</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go" alt="Go">
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/Traefik-v3-orange?style=flat" alt="Traefik v3">
  <img src="https://img.shields.io/badge/Docker%20Swarm-Ready-2496ED?style=flat&logo=docker" alt="Docker Swarm">
</p>

---

**traefik-api-srv** is a fully-featured API Gateway built on Traefik Proxy that combines the capabilities of Traefik Hub + Traefik Enterprise — plus exclusive AI Gateway and MCP Gateway features not available in any commercial Traefik product.

## Why traefik-api-srv?

| | Traefik OSS | Traefik Hub | Traefik Enterprise | **traefik-api-srv** |
|---|:---:|:---:|:---:|:---:|
| Dashboard | Read-only | Read/Write (K8s only) | Read-only | **Read/Write (any infra)** |
| AI Gateway | ❌ | ❌ | ❌ | ✅ |
| MCP Gateway | ❌ | ❌ | ❌ | ✅ |
| API Mocking | ❌ | Via Microcks | ❌ | ✅ Native |
| Docker Swarm | ✅ | ❌ | ✅ | ✅ |
| Kubernetes required | No | **Yes** | No | No |
| License | Apache 2.0 | Commercial | Commercial | **Apache 2.0** |
| Price | Free | $$$$ | $$$$ | **Free** |

---

## Features

### 🔐 Authentication (7 methods)

| Method | Description |
|--------|-------------|
| JWT | HS256/RS256/ES256 with JWKS support |
| OAuth 2.0 Introspection | RFC 7662 token validation |
| OAuth 2.0 Client Credentials | Machine-to-machine auth |
| OpenID Connect | Auto-discovery, session management |
| LDAP | Active Directory / OpenLDAP |
| API Key | Header or query parameter |
| HMAC | Request signature validation |

### 🛡️ Security

| Feature | Description |
|---------|-------------|
| Coraza WAF | OWASP ModSecurity rules, SQLi/XSS protection |
| Open Policy Agent | External policy evaluation |
| HashiCorp Vault | Secrets, PKI certs, KV TLS store |
| FIPS 140-2 | BoringCrypto compliance build |

### ⚡ Distributed (Valkey-backed)

| Feature | Description |
|---------|-------------|
| Rate Limiting | Shared rate limits across instances |
| In-Flight Limiting | Concurrent request caps |
| HTTP Cache | Response caching with auth protection |
| ACME | Shared Let's Encrypt certificates |

### 🤖 AI Gateway

| Feature | Description |
|---------|-------------|
| Multi-LLM Routing | OpenAI, Anthropic, Ollama, Azure, Mistral |
| Semantic Cache | Cache by prompt similarity |
| PII Guard | Redact personal data from requests |
| Load Balancing | Round-robin, least-latency, cost-based |

### 🔧 MCP Gateway

| Feature | Description |
|---------|-------------|
| TBAC | Tool-Based Access Control for AI agents |
| Policy Engine | Priority-sorted rules, fail-closed |
| Audit Logger | JSON audit trail of tool invocations |
| Session Load Balancer | Sticky sessions for stateful tools |

### 📦 API Management

| Feature | Description |
|---------|-------------|
| Developer Portal | Self-service API discovery and key management |
| API Versioning | Header/path-based version routing |
| OpenAPI Validation | Request validation from specs |
| API Mocking | Generate responses from OpenAPI specs |
| Config Linter | Detect misconfigurations |
| Grafana Dashboards | 5 pre-built dashboards |

### 🖥️ Operations

| Feature | Description |
|---------|-------------|
| Dashboard CRUD | Create/edit/delete config from UI |
| Static Auto-Reload | File watcher + graceful reload |
| Backup/Restore | Export/import full config state |
| Cluster mTLS | Auto-generated internal CA |

---

## Quick Start

### Binary

```bash
# Build
go build -o traefik-api-srv ./cmd/traefik

# Run
./traefik-api-srv --configFile=/etc/traefik/traefik.yml
```

### Docker

```bash
docker run -d \
  -p 80:80 -p 8099:8099 \
  -v /etc/traefik:/etc/traefik \
  traefik-api-srv --configFile=/etc/traefik/traefik.yml
```

### Minimal Configuration

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
      entryPoints:
        - web
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
            metadata: "admin"
```

---

## Docker Swarm

### Deploy as Swarm Service

```yaml
# docker-compose.yml
version: "3.8"

services:
  traefik:
    image: traefik-api-srv:latest
    command:
      - --entryPoints.web.address=:80
      - --entryPoints.websecure.address=:443
      - --entryPoints.traefik.address=:8099
      - --api.dashboard=true
      - --api.insecure=true
      - --providers.swarm.endpoint=unix:///var/run/docker.sock
      - --providers.swarm.exposedByDefault=false
      - --providers.file.filename=/etc/traefik/dynamic.yml
      - --providers.file.watch=true
      - --ping.entryPoint=web
    ports:
      - "80:80"
      - "443:443"
      - "8099:8099"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /etc/traefik:/etc/traefik
    networks:
      - traefik-public
    deploy:
      mode: global
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"

networks:
  traefik-public:
    driver: overlay
    attachable: true
```

### Service with Labels

```yaml
services:
  my-api:
    image: my-api:latest
    networks:
      - traefik-public
    deploy:
      replicas: 3
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.my-api.rule=Host(`api.example.com`)"
        - "traefik.http.routers.my-api.entryPoints=websecure"
        - "traefik.http.routers.my-api.tls.certResolver=letsencrypt"
        - "traefik.http.routers.my-api.middlewares=api-auth,api-ratelimit"
        - "traefik.http.services.my-api.loadbalancer.server.port=8080"
        # API Key auth
        - "traefik.http.middlewares.api-auth.apiKey.headerName=X-API-Key"
        - "traefik.http.middlewares.api-auth.apiKey.keys[0].value=production-key"
        # Rate limiting
        - "traefik.http.middlewares.api-ratelimit.rateLimit.average=100"
        - "traefik.http.middlewares.api-ratelimit.rateLimit.burst=50"
```

### Swarm with WAF Protection

```yaml
services:
  secure-app:
    image: my-app:latest
    networks:
      - traefik-public
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.secure.rule=Host(`app.example.com`)"
        - "traefik.http.routers.secure.middlewares=waf,jwt-auth"
        # WAF
        - "traefik.http.middlewares.waf.waf.inlineRules=SecRuleEngine On\nSecRule ARGS \"@detectSQLi\" \"id:1,phase:2,deny,status:403\"\nSecRule ARGS \"@detectXSS\" \"id:2,phase:2,deny,status:403\""
        # JWT
        - "traefik.http.middlewares.jwt-auth.jwtAuth.jwksUrl=https://auth.example.com/.well-known/jwks.json"
        - "traefik.http.middlewares.jwt-auth.jwtAuth.issuer=https://auth.example.com"
```

### Swarm with AI Gateway

```yaml
# /etc/traefik/traefik.yml (on manager node)
ai:
  providers:
    - name: openai
      type: openai
      endpoint: "https://api.openai.com/v1"
      models: [gpt-4, gpt-3.5-turbo]
    - name: ollama
      type: ollama
      endpoint: "http://ollama:11434/v1"
      models: [llama3, mistral]
  defaultProvider: openai
  fallback: [ollama]
```

```yaml
# /etc/traefik/dynamic.yml
http:
  routers:
    ai-router:
      rule: "PathPrefix(`/v1/chat`)"
      middlewares:
        - pii-guard
        - semantic-cache
      service: ai-gateway

  middlewares:
    pii-guard:
      piiguard:
        patterns: [email, phone, ssn]
        action: redact
    semantic-cache:
      semanticCache:
        ttl: 3600
        similarityThreshold: 0.92
```

---

## Dashboard

Access the dashboard at `http://your-host:8099/dashboard/`

### Pages

| Page | URL | Description |
|------|-----|-------------|
| Overview | `/#/` | System health, router/service counts |
| HTTP | `/#/http` | HTTP routers, services, middlewares |
| AI Gateway | `/#/ai` | Configure LLM providers |
| MCP Gateway | `/#/mcp` | Configure MCP servers and policies |
| Security | `/#/security` | WAF rules, API keys, auth middlewares |
| API Management | `/#/api-management` | Portal settings, API catalog |
| Config Manager | `/#/config` | **CRUD** for routers/services/middlewares |
| Distributed | `/#/distributed` | Rate limit, cache, in-flight status |
| Multi-Cluster | `/#/clusters` | Instance health, entrypoints |
| Grafana | `/#/grafana` | Pre-built dashboard JSON export |

---

## Documentation

Full feature documentation with configuration examples:

📖 **[Feature Guide →](docs/features/README.md)**

Each feature has its own doc with:
- YAML configuration examples (file provider + Docker Swarm labels)
- Options table with descriptions and defaults
- Security notes and best practices

---

## API Reference

### Read Endpoints

```
GET  /api/overview                        — System overview
GET  /api/http/routers                    — List HTTP routers
GET  /api/http/services                   — List HTTP services
GET  /api/http/middlewares                — List HTTP middlewares
GET  /api/entrypoints                     — List entry points
GET  /api/ai/status                       — AI Gateway status
GET  /api/ai/providers                    — AI provider list (keys stripped)
GET  /api/mcp/status                      — MCP Gateway status
GET  /api/mcp/servers                     — MCP server list
GET  /api/mcp/policies                    — MCP policy list
GET  /api/apimgmt/status                  — API Management status
GET  /api/grafana/dashboards              — Grafana dashboard definitions
GET  /api/reload                          — Reload status
```

### Write Endpoints

```
GET    /api/config/dynamic                — Full dynamic config (JSON)
PUT    /api/config/http/routers/{name}    — Create/update router
DELETE /api/config/http/routers/{name}    — Delete router
PUT    /api/config/http/services/{name}   — Create/update service
DELETE /api/config/http/services/{name}   — Delete service
PUT    /api/config/http/middlewares/{name} — Create/update middleware
DELETE /api/config/http/middlewares/{name} — Delete middleware
GET    /api/config/static?section=X       — Read static config section
PUT    /api/config/static?section=X       — Write static config section
POST   /api/reload                        — Trigger graceful reload
GET    /api/config/backup                 — Download config backup (tar.gz)
POST   /api/config/restore                — Restore from backup
```

---

## Building

```bash
# Standard build
go build -o traefik-api-srv ./cmd/traefik

# FIPS 140-2 compliant build
CGO_ENABLED=1 GOEXPERIMENT=boringcrypto go build -o traefik-api-srv ./cmd/traefik

# Build webui
cd webui && yarn install && yarn build
```

---

## License

Apache 2.0 — Free for commercial and personal use.
