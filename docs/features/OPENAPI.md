# OpenAPI Support

Validate requests against OpenAPI 3.0 specifications.

## Configuration

```yaml
http:
  middlewares:
    openapi-validate:
      openapi:
        specPath: "/etc/traefik/specs/api.yaml"
        validateRequest: true
        serveSpec: true
        specEndpoint: "/docs/openapi.json"
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `specPath` | Path to OpenAPI spec file | Required |
| `validateRequest` | Validate incoming requests against spec | false |
| `serveSpec` | Serve the spec at specEndpoint | false |
| `specEndpoint` | URL path to serve the spec | /openapi.json |
