# Compress

Compresses responses using gzip/brotli.

## Configuration

```yaml
http:
  middlewares:
    my-compress:
      compress:
        {}
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-compress.compress.{}"
```
