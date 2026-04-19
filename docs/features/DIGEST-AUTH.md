# Digest Auth

HTTP Digest authentication.

## Configuration

```yaml
http:
  middlewares:
    my-digestAuth:
      digestAuth:
        users:
          - "admin:traefik:hash"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-digestAuth.digestAuth.users:"
```
