# HTTP Caching

In-memory HTTP response caching with auth protection.

## Configuration

```yaml
http:
  middlewares:
    my-cache:
      httpCache:
        defaultTtl: 300s
        maxEntries: 5000
        methods:
          - GET
          - HEAD
        statusCodes:
          - 200
          - 301
        varyHeaders:
          - Accept
          - Accept-Language

  routers:
    cached-route:
      rule: "PathPrefix(`/static`)"
      middlewares:
        - my-cache
      service: backend
```

## Security Behavior

- Requests with `Authorization` header are **never cached** (returns `X-Cache: BYPASS`)
- Requests with `Cache-Control: no-cache` bypass the cache
- Backend responses with `Cache-Control: no-store` or `private` are not stored
- Response header `X-Cache: HIT|MISS|BYPASS` indicates cache behavior

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `defaultTtl` | Cache entry TTL | 5m |
| `maxEntries` | Maximum cached entries | 10000 |
| `methods` | HTTP methods to cache | GET, HEAD |
| `statusCodes` | Status codes to cache | 200, 301, 404 |
| `varyHeaders` | Headers included in cache key | - |
