# Middleware Chain

Chains multiple middlewares in order.

## Configuration

```yaml
http:
  middlewares:
    my-chain:
      chain:
        middlewares:
          - auth
          - rate-limit
          - compress
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-chain.chain.middlewares:"
```
