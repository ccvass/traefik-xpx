# Redirect Scheme

Redirects HTTP to HTTPS.

## Configuration

```yaml
http:
  middlewares:
    my-redirectScheme:
      redirectScheme:
        scheme: https
        permanent: true
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-redirectScheme.redirectScheme.scheme=https"
```
