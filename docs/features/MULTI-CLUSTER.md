# Multi-Cluster Management

Register and monitor multiple Traefik-XPX instances.

## Dashboard

Navigate to Multi-Cluster page to:
- View current instance health (routes, services, middlewares, entrypoints)
- Add remote instances (name, API URL, region)
- Remove instances

## API

```bash
# Stored in static config section "clusters"
GET  /api/config/static?section=clusters
PUT  /api/config/static?section=clusters
```
