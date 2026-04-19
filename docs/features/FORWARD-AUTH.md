# Forward Auth

Delegates authentication to an external service.

## Configuration

```yaml
http:
  middlewares:
    my-forwardAuth:
      forwardAuth:
        address: "http://auth-service:4181"
        trustForwardHeader: true
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-forwardAuth.forwardAuth.address="http://auth-service:4181""
```
