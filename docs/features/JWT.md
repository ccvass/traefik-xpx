# JWT Authentication

Validate JSON Web Tokens on incoming requests.

## File Provider Configuration

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
      entryPoints:
        - web
      middlewares:
        - my-jwt
      service: backend
```

## Docker Swarm Labels

```yaml
services:
  my-api:
    image: my-api:latest
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.my-api.rule=Host(`api.example.com`)"
        - "traefik.http.routers.my-api.middlewares=jwt-auth"
        - "traefik.http.services.my-api.loadbalancer.server.port=8080"
        # JWT middleware
        - "traefik.http.middlewares.jwt-auth.jwtAuth.jwksUrl=https://auth.example.com/.well-known/jwks.json"
        - "traefik.http.middlewares.jwt-auth.jwtAuth.issuer=https://auth.example.com"
        - "traefik.http.middlewares.jwt-auth.jwtAuth.audience=my-api"
        - "traefik.http.middlewares.jwt-auth.jwtAuth.headerField=X-User"
```

## JWKS Support (RS256/ES256)

```yaml
http:
  middlewares:
    my-jwt-jwks:
      jwtAuth:
        jwksUrl: "https://auth.example.com/.well-known/jwks.json"
        issuer: "https://auth.example.com"
```

## Options

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| `secret` | HMAC secret for HS256/HS384/HS512 | Yes (or jwksUrl) | - |
| `jwksUrl` | URL to JWKS endpoint for RS256/ES256 | Yes (or secret) | - |
| `issuer` | Expected token issuer (validates `iss` claim) | No | - |
| `audience` | Expected token audience (validates `aud` claim) | No | - |
| `headerField` | Header to set with validated subject | No | - |
| `claimsHeaders` | Map of claim name → header name to forward downstream | No | - |

## Behavior

1. Extracts token from `Authorization: Bearer <token>` header
2. Validates signature (HMAC or RSA/ECDSA via JWKS)
3. Validates `exp`, `nbf`, `iss`, `aud` claims
4. Sets configured headers with claim values
5. Returns 401 if validation fails
