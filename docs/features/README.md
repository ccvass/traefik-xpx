# traefik-api-srv Documentation

Complete feature documentation with configuration examples.

## Feature Guides

### Authentication & Security

- [JWT Authentication](JWT.md)
- [OAuth 2.0 Token Introspection](OAUTH-INTROSPECTION.md)
- [OAuth 2.0 Client Credentials](OAUTH-CLIENT-CREDENTIALS.md)
- [OpenID Connect (OIDC)](OIDC.md)
- [LDAP Authentication](LDAP.md)
- [API Key Authentication](API-KEY.md)
- [HMAC Authentication](HMAC.md)
- [Open Policy Agent (OPA)](OPA.md)
- [Coraza WAF](WAF.md)
- [HashiCorp Vault Integration](VAULT.md)

### Distributed Features

- [Distributed Rate Limiting](DISTRIBUTED-RATE-LIMIT.md)
- [Distributed In-Flight Request Limiting](DISTRIBUTED-INFLIGHT.md)
- [HTTP Caching](HTTP-CACHE.md)
- [Distributed ACME (Let's Encrypt)](DISTRIBUTED-ACME.md)
- [Vault PKI Certificate Resolver](VAULT-PKI.md)
- [Vault K/V TLS Store](VAULT-KV-TLS.md)

### AI Gateway

- [Multi-LLM Gateway](AI-GATEWAY.md)
- [Semantic Cache](SEMANTIC-CACHE.md)
- [PII Guard](PII-GUARD.md)

### MCP Gateway

- [MCP Gateway Overview](MCP-GATEWAY.md)
- [Tool-Based Access Control (TBAC)](MCP-TBAC.md)
- [MCP Policy Engine](MCP-POLICY.md)
- [MCP Audit Logger](MCP-AUDIT.md)

### API Management

- [API Versioning](API-VERSIONING.md)
- [Developer Portal](DEVELOPER-PORTAL.md)
- [OpenAPI Support](OPENAPI.md)
- [API Mocking](API-MOCKING.md)
- [Configuration Linter](CONFIG-LINTER.md)

### Operations

- [Static Config Auto-Reload](STATIC-RELOAD.md)
- [Backup and Restore](BACKUP-RESTORE.md)
- [Encrypted Cluster Communication (mTLS)](CLUSTER-MTLS.md)
- [Dashboard CRUD](DASHBOARD-CRUD.md)
- [Grafana Dashboards](GRAFANA.md)
- [FIPS 140-2 Compliance](FIPS.md)
