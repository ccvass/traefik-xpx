# Distributed Rate Limiting

Valkey-backed rate limiting shared across multiple traefik-api-srv instances.

## File Provider Configuration

```yaml
# dynamic.yml
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
        valkey:
          endpoints:
            - "valkey:6379"
          password: "redis-secret"
          db: 0

    per-user-limit:
      rateLimit:
        average: 10
        burst: 20
        period: 1m
        sourceCriterion:
          requestHeaderName: "X-User-ID"
        valkey:
          endpoints:
            - "valkey:6379"

  routers:
    api-route:
      rule: "PathPrefix(`/api`)"
      entryPoints:
        - web
      middlewares:
        - global-rate-limit
        - per-user-limit
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
        - "traefik.http.routers.api.rule=Host(`api.example.com`)"
        - "traefik.http.routers.api.middlewares=rate-limit"
        - "traefik.http.services.api.loadbalancer.server.port=8080"
        # Distributed rate limit
        - "traefik.http.middlewares.rate-limit.rateLimit.average=100"
        - "traefik.http.middlewares.rate-limit.rateLimit.burst=50"
        - "traefik.http.middlewares.rate-limit.rateLimit.redis.endpoints=valkey:6379"
        - "traefik.http.middlewares.rate-limit.rateLimit.failOpen=false"

  valkey:
    image: valkey:7-alpine
    deploy:
      replicas: 1
```

## Docker Swarm Full Stack

```yaml
version: "3.8"

services:
  traefik:
    image: traefik-api-srv:latest
    command:
      - --providers.swarm.endpoint=unix:///var/run/docker.sock
      - --providers.file.filename=/etc/traefik/dynamic.yml
      - --entryPoints.web.address=:80
      - --api.dashboard=true
      - --api.insecure=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./dynamic.yml:/etc/traefik/dynamic.yml
    ports:
      - "80:80"
      - "8099:8099"
    networks:
      - traefik-public
    deploy:
      mode: global
      placement:
        constraints: [node.role == manager]

  valkey:
    image: valkey:7-alpine
    networks:
      - traefik-public
    deploy:
      replicas: 1

networks:
  traefik-public:
    driver: overlay
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `average` | Max requests per period | Required |
| `burst` | Max burst above average | 1 |
| `period` | Time window (e.g., `1s`, `1m`, `1h`) | 1s |
| `failOpen` | Allow requests on Valkey failure | false |
| `sourceCriterion.requestHost` | Key by request host | false |
| `sourceCriterion.requestHeaderName` | Key by header value | - |
| `sourceCriterion.ipStrategy.depth` | Key by IP at depth | - |
| `redis.endpoints` | Valkey server addresses | Required for distributed |
| `redis.password` | Valkey password | - |
| `redis.db` | Valkey database number | 0 |

## Failure Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `failOpen: false` (default) | Returns 500 on Valkey errors | Security-critical APIs |
| `failOpen: true` | Allows requests through, logs warning | Availability-critical APIs |

## Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Configured rate limit |
| `X-RateLimit-Remaining` | Remaining requests in window |
| `Retry-After` | Seconds until next allowed request (on 429) |
