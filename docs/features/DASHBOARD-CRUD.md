# Dashboard CRUD — Configuration Management

Create, edit, and delete dynamic configuration directly from the web UI or API.

## API Endpoints

### Dynamic Configuration (routers, services, middlewares)

```bash
# Get full dynamic config
GET /api/config/dynamic

# Create/update a router
PUT /api/config/http/routers/my-router
Content-Type: application/json
{"rule": "PathPrefix(`/app`)", "service": "my-service", "entryPoints": ["web"]}

# Delete a router
DELETE /api/config/http/routers/my-router

# Create/update a service
PUT /api/config/http/services/my-service
Content-Type: application/json
{"loadBalancer": {"servers": [{"url": "http://127.0.0.1:8080"}]}}

# Create/update a middleware
PUT /api/config/http/middlewares/my-auth
Content-Type: application/json
{"apiKey": {"headerName": "X-API-Key", "keys": [{"value": "secret", "metadata": "admin"}]}}
```

### Static Configuration (AI, MCP, APIMgmt settings)

```bash
# Get a section
GET /api/config/static?section=ai

# Update a section
PUT /api/config/static?section=ai
Content-Type: application/json
{"providers": [{"name": "openai", "type": "openai", "endpoint": "https://api.openai.com/v1"}]}

# Delete a section
DELETE /api/config/static?section=mcp
```

### Reload and Backup

```bash
# Trigger manual reload
POST /api/reload

# Check reload status
GET /api/reload

# Download backup (tar.gz)
GET /api/config/backup

# Restore from backup
POST /api/config/restore
Content-Type: application/gzip
<binary tar.gz body>
```

## Web UI

The dashboard provides a "Config Manager" page at `/#/config` with:
- Create/Edit/Delete buttons for all file-provider resources
- JSON editor for configuration
- Immediate effect via file provider hot-reload

Each feature page (AI Gateway, MCP Gateway, Security, API Management) also has inline configuration forms.
