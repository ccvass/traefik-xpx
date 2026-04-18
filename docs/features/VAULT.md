# HashiCorp Vault Integration

Secrets management via HashiCorp Vault.

## Configuration

```yaml
# traefik.yml
vault:
  address: "http://vault:8200"
  token: "s.xxxxx"
  # Or use AppRole:
  # authMethod: approle
  # roleId: "role-id"
  # secretId: "secret-id"
```

## Use Cases

- Store API keys and secrets referenced by middlewares
- TLS certificate storage (see [Vault KV TLS](VAULT-KV-TLS.md))
- Certificate issuance (see [Vault PKI](VAULT-PKI.md))
- Dynamic secret rotation
