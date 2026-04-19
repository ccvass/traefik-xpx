# Buffering

Buffers request/response bodies in memory.

## Configuration

```yaml
http:
  middlewares:
    my-buffering:
      buffering:
        maxRequestBodyBytes: 10485760
        maxResponseBodyBytes: 10485760
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-buffering.buffering.maxRequestBodyBytes=10485760"
```
