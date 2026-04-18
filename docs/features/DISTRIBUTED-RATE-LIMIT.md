# Distributed Rate Limiting

Redis-backed rate limiting shared across multiple instances.

## Configuration

```yaml
http:
  middlewares:
    global-rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1s
        failOpen: false
        sourceCriterion:
          requestHost: true
        redis:
          endpoints:
            - "redis:6379"
          password: "secret"
          db: 0

  routers:
    api-route:
      rule: "PathPrefix(`/api`)"
      middlewares:
        - global-rate-limit
      service: backend
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `average` | Max requests per period | Required |
| `burst` | Max burst above average | 1 |
| `period` | Time window | 1s |
| `failOpen` | Allow requests on Redis failure | false |
| `sourceCriterion.requestHost` | Key by request host | false |
| `sourceCriterion.requestHeaderName` | Key by header value | - |
| `redis.endpoints` | Redis server addresses | Required for distributed |
| `redis.password` | Redis password | - |
| `redis.db` | Redis database number | 0 |

## Failure Modes

- `failOpen: false` (default) — Returns 500 on Redis errors. Safe but may cause outages.
- `failOpen: true` — Allows requests through on Redis errors. Logs warning for observability.
