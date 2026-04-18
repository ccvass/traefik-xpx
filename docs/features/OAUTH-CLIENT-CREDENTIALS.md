# OAuth 2.0 Client Credentials

Machine-to-machine authentication via client credentials grant.

## Configuration

```yaml
http:
  middlewares:
    my-m2m:
      oauthClientCreds:
        tokenUrl: "https://auth.example.com/oauth/token"
        clientId: "service-a"
        clientSecret: "secret"
        scopes:
          - api.read
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `tokenUrl` | Token endpoint URL | Required |
| `clientId` | Client ID | Required |
| `clientSecret` | Client secret | Required |
| `scopes` | Requested scopes | - |
