# Service Health Checks

Monitor service health from the dashboard.

## API

```bash
GET /api/health-checks    # Returns health status per service
```

## Configuration (per service)

```yaml
http:
  services:
    my-service:
      loadBalancer:
        servers:
          - url: "http://10.0.0.1:8080"
        healthCheck:
          path: /health
          interval: 10s
          timeout: 3s
```
