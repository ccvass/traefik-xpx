# Vault PKI Certificate Resolver

Issue TLS certificates from HashiCorp Vault PKI engine.

## Configuration

```yaml
# traefik.yml
certificatesResolvers:
  vault-pki:
    vaultPKI:
      address: "http://vault:8200"
      token: "s.xxxxx"
      mountPath: "pki"
      role: "web-certs"
      ttl: "720h"
```

## Usage in Routers

```yaml
http:
  routers:
    secure-route:
      rule: "Host(`app.example.com`)"
      tls:
        certResolver: vault-pki
      service: backend
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `address` | Vault server URL | Required |
| `token` | Vault token | Required |
| `mountPath` | PKI engine mount path | pki |
| `role` | PKI role name | Required |
| `ttl` | Certificate TTL | 720h |
| `altNames` | Additional SANs | - |
