# Real-Time Logs

View traefik and access logs from the dashboard.

## API

```bash
GET /api/logs?type=traefik   # Last 100 lines of traefik.log
GET /api/logs?type=access    # Last 100 lines of access.log
```

## Configuration

```yaml
log:
  level: INFO
  filePath: /var/log/traefik/traefik.log

accessLog:
  filePath: /var/log/traefik/access.log
```
