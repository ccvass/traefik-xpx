# Replace Path

Replaces the request path entirely.

## Configuration

```yaml
http:
  middlewares:
    my-replacePath:
      replacePath:
        path: "/new-path"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-replacePath.replacePath.path="/new-path""
```
