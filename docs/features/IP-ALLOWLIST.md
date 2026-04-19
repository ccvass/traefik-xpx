# IP Allow List

Restricts access to specific IP ranges.

## Configuration

```yaml
http:
  middlewares:
    my-ipAllowList:
      ipAllowList:
        sourceRange:
          - "10.0.0.0/8"
          - "172.16.0.0/12"
          - "192.168.0.0/16"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-ipAllowList.ipAllowList.sourceRange:"
```
