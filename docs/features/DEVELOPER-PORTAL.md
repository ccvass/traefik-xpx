# Developer Portal

Self-service API portal for developers to discover and consume APIs.

## Configuration

```yaml
# traefik.yml
apiMgmt:
  portal:
    enabled: true
    title: "My API Portal"
    basePath: "/portal"
    authRequired: true
    authSecret: "portal-admin-secret"
```

## API Endpoints

- `GET /portal/api/catalog` — List available APIs
- `POST /portal/api/developers` — Register developer (requires auth)
- `POST /portal/api/developers/{id}/keys` — Create API key (requires auth)
- `GET /portal/api/developers/{id}/keys` — List keys (prefix only)

## Security

- `authRequired: true` blocks write operations without Bearer token
- API keys are hashed at rest (sha256), shown only once at creation
- Email validation on registration
