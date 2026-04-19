# Add Prefix

Adds path prefix before forwarding.

## Configuration

```yaml
http:
  middlewares:
    my-addPrefix:
      addPrefix:
        prefix: "/api"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-addPrefix.addPrefix.prefix="/api""
```
