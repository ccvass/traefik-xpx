# Strip Prefix

Removes path prefix before forwarding to backend.

## Configuration

```yaml
http:
  middlewares:
    my-stripPrefix:
      stripPrefix:
        prefixes:
          - "/api"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-stripPrefix.stripPrefix.prefixes:"
```
