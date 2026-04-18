# Distributed In-Flight Request Limiting

Redis-backed concurrent request limiting shared across instances.

## Configuration

```yaml
http:
  middlewares:
    my-inflight:
      distributedInFlightReq:
        amount: 100
        redisUrl: "redis://localhost:6379"
        keyFunc: "host"

  routers:
    api-route:
      rule: "PathPrefix(`/api`)"
      middlewares:
        - my-inflight
      service: backend
```

## Behavior

- Increments Redis counter on request start
- Decrements on response completion (even on errors)
- Returns 429 when concurrent requests exceed `amount`
- Returns 503 on Redis failure (fail-closed)

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `amount` | Max concurrent requests per source | Required |
| `redisUrl` | Redis connection URL | Required |
| `redisPassword` | Redis password | - |
| `keyFunc` | Source key: `sourceIP`, `header`, `host` | sourceIP |
| `keyHeader` | Header name when keyFunc=header | - |
