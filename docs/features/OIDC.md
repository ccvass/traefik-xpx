# OIDC Authentication

OpenID Connect authentication with automatic discovery.

## Configuration

```yaml
http:
  middlewares:
    my-oidc:
      oidc:
        issuerUrl: "https://accounts.google.com"
        clientId: "your-client-id"
        clientSecret: "your-client-secret"
        redirectUrl: "https://app.example.com/callback"
        scopes:
          - openid
          - profile
          - email

  routers:
    protected:
      rule: "PathPrefix(`/app`)"
      middlewares:
        - my-oidc
      service: backend
```

## Options

| Field | Description | Required |
|-------|-------------|----------|
| `issuerUrl` | OIDC issuer URL (auto-discovers endpoints) | Yes |
| `clientId` | OAuth client ID | Yes |
| `clientSecret` | OAuth client secret | Yes |
| `redirectUrl` | Callback URL after auth | Yes |
| `scopes` | Requested scopes | No (default: openid) |
