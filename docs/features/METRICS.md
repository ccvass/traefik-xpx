# Internal Metrics

View resource counts and feature status.

## API

```bash
GET /api/metrics/internal   # Resource counts
GET /api/overview           # Full system overview
```

## Prometheus (optional)

```yaml
metrics:
  prometheus:
    entryPoint: traefik
    addEntryPointsLabels: true
    addServicesLabels: true
    addRoutersLabels: true
```
