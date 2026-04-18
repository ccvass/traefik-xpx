# traefik-api-srv Documentation

Complete documentation for all features with configuration examples.

## Feature Guides

See [features/](features/README.md) for the full index with configuration examples for every feature.

### Categories

| Category | Features |
|----------|----------|
| [Authentication](features/JWT.md) | JWT, OAuth 2.0, OIDC, LDAP, API Key, HMAC |
| [Security](features/WAF.md) | WAF (Coraza), OPA, HashiCorp Vault |
| [Distributed](features/DISTRIBUTED-RATE-LIMIT.md) | Rate Limit, In-Flight, HTTP Cache, ACME |
| [AI Gateway](features/AI-GATEWAY.md) | Multi-LLM, Semantic Cache, PII Guard |
| [MCP Gateway](features/MCP-GATEWAY.md) | TBAC, Policy Engine, Audit, Session LB |
| [API Management](features/DEVELOPER-PORTAL.md) | Versioning, Portal, OpenAPI, Mocking, Linter |
| [Operations](features/DASHBOARD-CRUD.md) | Auto-Reload, Backup/Restore, mTLS, FIPS, Grafana |

## Building Documentation Locally

```bash
pip install -r requirements.txt
mkdocs serve
```

## API Reference

See the [main README](../README.md) for the full API endpoint reference.
