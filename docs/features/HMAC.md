# HMAC Authentication

Validate HMAC-signed requests.

## Configuration

```yaml
http:
  middlewares:
    my-hmac:
      hmac:
        secret: "shared-secret-key"
        algorithm: "sha256"
        headerName: "X-Signature"
        maxAge: 300s

  routers:
    webhook:
      rule: "PathPrefix(`/webhook`)"
      middlewares:
        - my-hmac
      service: backend
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `secret` | HMAC shared secret | Required |
| `algorithm` | Hash algorithm (sha256, sha512) | sha256 |
| `headerName` | Header containing the signature | X-Signature |
| `maxAge` | Max age for timestamp validation | 300s |
