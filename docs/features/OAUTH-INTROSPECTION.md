# OAuth 2.0 Token Introspection

Validate OAuth tokens via RFC 7662 introspection endpoint.

## Configuration

```yaml
http:
  middlewares:
    my-oauth:
      oauthIntrospect:
        introspectionUrl: "https://auth.example.com/oauth/introspect"
        clientId: "resource-server"
        clientSecret: "secret"
        tokenSource: "header"
        requiredScopes:
          - read
          - write
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `introspectionUrl` | Token introspection endpoint | Required |
| `clientId` | Client ID for introspection auth | Required |
| `clientSecret` | Client secret | Required |
| `tokenSource` | Where to find token: header, query, cookie | header |
| `requiredScopes` | Scopes the token must have | - |
