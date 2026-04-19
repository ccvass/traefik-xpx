# Distributed In-Flight Request Limiting

Valkey-backed concurrent request limiting shared across instances.

## Configuration

```yaml
http:
  middlewares:
    my-inflight:
      distributedInFlightReq:
        amount: 100
        redisUrl: "valkey://localhost:6379"
        keyFunc: "host"

  routers:
    api-route:
      rule: "PathPrefix(`/api`)"
      middlewares:
        - my-inflight
      service: backend
```

## Behavior

- Increments Valkey counter on request start
- Decrements on response completion (even on errors)
- Returns 429 when concurrent requests exceed `amount`
- Returns 503 on Valkey failure (fail-closed)

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `amount` | Max concurrent requests per source | Required |
| `redisUrl` | Valkey connection URL | Required |
| `redisPassword` | Valkey password | - |
| `keyFunc` | Source key: `sourceIP`, `header`, `host` | sourceIP |
| `keyHeader` | Header name when keyFunc=header | - |
