<p align="center"><img src="docs/assets/logo-light.svg" alt="Traefik-XP" width="400"></p>

# Traefik-XP

**The open-source API Gateway that replaces 5 commercial Traefik products in one.**

Traefik-XP combines Traefik Proxy + Hub API Gateway + Hub API Management + AI Gateway + MCP Gateway — all free, all open source.

## Why Traefik-XP?

| | Traefik Proxy | Traefik Hub | Traefik Enterprise | **Traefik-XP** |
|---|:---:|:---:|:---:|:---:|
| Price | Free | $$$$ | $$$$ | **Free** |
| Dashboard | Read-only | K8s only | Read-only | **Full CRUD** |
| AI Gateway | No | Paid | No | **Yes** |
| MCP Gateway | No | Paid | No | **Yes** |
| Docker Swarm | Yes | No | Yes | **Yes** |
| Kubernetes required | No | **Yes** | No | **No** |

## Features

- **API Gateway**: 22+ middleware types, load balancing, circuit breaker, retry, health checks
- **AI Gateway**: Multi-LLM routing (OpenAI, Anthropic, Ollama), semantic cache, PII guard
- **MCP Gateway**: Tool-Based Access Control, policy engine, audit logging
- **Security**: WAF, JWT, OIDC, LDAP, API Key, HMAC, OPA
- **Distributed**: Rate limiting, HTTP cache, in-flight limits (Valkey-backed)
- **Dashboard**: Dark theme React UI with full CRUD, logs, metrics, health checks
- **Auth**: Login page, JWT sessions, user management, Valkey-backed HA
- **Operations**: Backup/restore, auto-reload, multi-cluster, Grafana dashboards

## Quick Start

```bash
# Docker
docker pull alfonsodg/traefik-xp:latest
docker run -d -p 80:80 -p 8099:8099 alfonsodg/traefik-xp:latest

# Docker Swarm
docker stack deploy -c docker-compose.yml traefik-xp

# Binary
go build -o traefik-xp ./cmd/traefik
./traefik-xp --configFile=/etc/traefik/traefik.yml
```

Dashboard: `http://localhost:8099/dashboard/`

## Documentation

- [Installation Guide](docs/INSTALLATION.md) — Docker, Swarm, binary, systemd
- [Feature Guide](docs/features/README.md) — All features with config examples
- [Migration from Traefik 2.x](docs/MIGRATION-VERTIX.md) — Step-by-step migration plan
- [Disaster Recovery](docs/DISASTER-RECOVERY.md) — Backup, restore, rollback
- [Development Standards](docs/STANDARDS.md) — Build, test, deploy

## Stack

- **Backend**: Go 1.24, Traefik v3 core
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide icons
- **State**: Valkey 9 (optional, for HA)
- **Build**: Multi-stage Docker, FIPS 140-2 option

## License

Apache 2.0
