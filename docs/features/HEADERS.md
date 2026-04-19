# Custom Headers

Adds/removes HTTP headers on requests and responses.

## Configuration

```yaml
http:
  middlewares:
    my-headers:
      headers:
        customRequestHeaders:
          X-Custom-Header: "value"
        customResponseHeaders:
          X-Frame-Options: "DENY"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-headers.headers.customRequestHeaders:"
```
