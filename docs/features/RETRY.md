# Retry

Retries failed requests with exponential backoff.

## Configuration

```yaml
http:
  middlewares:
    my-retry:
      retry:
        attempts: 3
        initialInterval: 100ms
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-retry.retry.attempts=3"
```
