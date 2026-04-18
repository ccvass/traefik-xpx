# Grafana Dashboards

Pre-built Grafana dashboard definitions available via API and UI.

## Available Dashboards

| Dashboard | Description |
|-----------|-------------|
| Traefik Overview | Request rates, error rates, latency percentiles, active connections |
| Authentication | Auth success/failure rates by method (JWT, API Key, OIDC, etc.) |
| AI Gateway | LLM request rates, latency by provider, token usage, cache hit ratio |
| MCP Gateway | Tool invocations, policy decisions, agent activity |
| Security | WAF blocks, OPA decisions, rate limit triggers |

## API

```bash
# Get all dashboard definitions
curl http://localhost:8099/api/grafana/dashboards
```

## Import to Grafana

1. Navigate to `/#/grafana` in the dashboard
2. Click "Copy JSON" on the desired dashboard
3. In Grafana: Dashboards → Import → Paste JSON
4. Select your Prometheus data source
5. Click Import

## Prometheus Metrics

Dashboards expect metrics from Traefik's Prometheus exporter:

```yaml
# traefik.yml
metrics:
  prometheus:
    entryPoint: traefik
    addEntryPointsLabels: true
    addServicesLabels: true
    addRoutersLabels: true
```
