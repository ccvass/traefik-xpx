# Vault K/V TLS Certificate Store

Load and auto-refresh TLS certificates from Vault KV v2.

## Configuration

```yaml
# traefik.yml
vaultKVTLS:
  address: "http://vault:8200"
  token: "s.xxxxx"
  mountPath: "secret"
  secretPath: "tls/my-domain"
  certKey: "certificate"
  privateKey: "private_key"
```

## Vault Secret Structure

```bash
vault kv put secret/tls/my-domain \
  certificate=@cert.pem \
  private_key=@key.pem
```

## Behavior

- Loads certificates on startup
- Refreshes every 5 minutes
- Logs errors but continues serving cached cert on refresh failure

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `address` | Vault server URL | Required |
| `token` | Vault token | Required |
| `mountPath` | KV v2 mount path | secret |
| `secretPath` | Path to TLS secret | Required |
| `certKey` | Key name for certificate PEM | certificate |
| `privateKey` | Key name for private key PEM | private_key |
