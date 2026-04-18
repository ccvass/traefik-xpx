# JWT Authentication

Validate JSON Web Tokens on incoming requests.

## Configuration

```yaml
# dynamic.yml
http:
  middlewares:
    my-jwt:
      jwtAuth:
        secret: "your-hmac-secret"
        issuer: "https://auth.example.com"
        audience: "my-api"
        headerField: "X-User"
        claimsHeaders:
          sub: "X-User-ID"
          email: "X-User-Email"

  routers:
    protected-api:
      rule: "PathPrefix(`/api`)"
      middlewares:
        - my-jwt
      service: backend
```

## JWKS Support

```yaml
http:
  middlewares:
    my-jwt-jwks:
      jwtAuth:
        jwksUrl: "https://auth.example.com/.well-known/jwks.json"
        issuer: "https://auth.example.com"
```

## Options

| Field | Description | Required |
|-------|-------------|----------|
| `secret` | HMAC secret for HS256/HS384/HS512 | Yes (or jwksUrl) |
| `jwksUrl` | URL to JWKS endpoint for RS256/ES256 | Yes (or secret) |
| `issuer` | Expected token issuer | No |
| `audience` | Expected token audience | No |
| `headerField` | Header to set with validated subject | No |
| `claimsHeaders` | Map of claim → header to forward | No |
