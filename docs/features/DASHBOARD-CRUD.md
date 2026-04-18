# Dashboard CRUD — Configuration Management

Create, edit, and delete dynamic configuration directly from the web UI or API. This is a **unique feature** — neither Traefik OSS nor Traefik Hub offer a writable dashboard without Kubernetes.

## Web UI

Access the Config Manager at `http://your-host:8099/dashboard/#/config`

### Capabilities

- **Create**: Click "Create" button, enter name + JSON config
- **Edit**: Click pencil icon on any file-provider resource
- **Delete**: Click trash icon with confirmation dialog
- Changes take effect **immediately** via file provider hot-reload

### Feature Pages

Each feature page also has inline configuration:

| Page | What you can configure |
|------|----------------------|
| AI Gateway (`/#/ai`) | Add/edit/remove LLM providers |
| MCP Gateway (`/#/mcp`) | Add/edit/remove MCP servers and policies |
| Security (`/#/security`) | Add WAF rules, API Key middlewares |
| API Management (`/#/api-management`) | Portal title, base path |

## API Endpoints

### Dynamic Configuration (hot-reload, no restart needed)

```bash
# Get full dynamic config
curl http://localhost:8099/api/config/dynamic

# Create a router
curl -X PUT http://localhost:8099/api/config/http/routers/my-router \
  -H "Content-Type: application/json" \
  -d '{
    "rule": "Host(`app.example.com`) && PathPrefix(`/api`)",
    "service": "my-service",
    "entryPoints": ["web"],
    "middlewares": ["my-auth", "rate-limit"]
  }'

# Create a service
curl -X PUT http://localhost:8099/api/config/http/services/my-service \
  -H "Content-Type: application/json" \
  -d '{
    "loadBalancer": {
      "servers": [
        {"url": "http://10.0.0.1:8080"},
        {"url": "http://10.0.0.2:8080"}
      ],
      "healthCheck": {
        "path": "/health",
        "interval": "10s"
      }
    }
  }'

# Create a middleware
curl -X PUT http://localhost:8099/api/config/http/middlewares/my-auth \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": {
      "headerName": "X-API-Key",
      "keys": [{"value": "prod-key-123", "metadata": "admin"}]
    }
  }'

# Delete a router
curl -X DELETE http://localhost:8099/api/config/http/routers/my-router
```

### Static Configuration (requires reload/restart)

```bash
# Read AI config
curl "http://localhost:8099/api/config/static?section=ai"

# Write AI config
curl -X PUT "http://localhost:8099/api/config/static?section=ai" \
  -H "Content-Type: application/json" \
  -d '{
    "providers": [
      {"name": "openai", "type": "openai", "endpoint": "https://api.openai.com/v1", "models": ["gpt-4"]}
    ],
    "defaultProvider": "openai"
  }'

# Trigger reload after static config change
curl -X POST http://localhost:8099/api/reload
```

### Backup and Restore

```bash
# Download full config backup
curl -o backup.tar.gz http://localhost:8099/api/config/backup

# Restore from backup
curl -X POST http://localhost:8099/api/config/restore \
  -H "Content-Type: application/gzip" \
  --data-binary @backup.tar.gz
```

## Docker Swarm Usage

In Docker Swarm, the CRUD API modifies the dynamic config file mounted into the traefik container:

```yaml
services:
  traefik:
    image: traefik-api-srv:latest
    volumes:
      - traefik-config:/etc/traefik
    ports:
      - "80:80"
      - "8099:8099"

volumes:
  traefik-config:
    driver: local
```

Then use the API from any node:

```bash
# Add a new route from any machine in the swarm
curl -X PUT http://manager-ip:8099/api/config/http/routers/new-app \
  -H "Content-Type: application/json" \
  -d '{"rule": "Host(`newapp.example.com`)", "service": "new-app-svc", "entryPoints": ["web"]}'
```
