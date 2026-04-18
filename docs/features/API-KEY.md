# API Key Authentication

Validate API keys from headers or query parameters.

## Configuration

```yaml
http:
  middlewares:
    my-apikey:
      apiKey:
        headerName: X-API-Key
        keys:
          - value: "key-abc-123"
            metadata: "client-a"
          - value: "key-def-456"
            metadata: "client-b"

  routers:
    api-route:
      rule: "PathPrefix(`/api`)"
      middlewares:
        - my-apikey
      service: backend
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `headerName` | Header containing the API key | `X-API-Key` |
| `queryParam` | Query parameter name (alternative to header) | - |
| `keys[].value` | The API key value | Required |
| `keys[].metadata` | Metadata forwarded as `X-API-Key-Metadata` header | - |
