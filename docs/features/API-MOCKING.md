# API Mocking

Generate mock API responses from OpenAPI specifications without a live backend.

## Configuration

```yaml
http:
  middlewares:
    my-mock:
      apiMock:
        specFile: "/etc/traefik/specs/petstore.yaml"
        defaultStatus: 200
        addDelay: 50ms

  routers:
    mock-route:
      rule: "PathPrefix(`/mock`)"
      middlewares:
        - my-mock
      service: noop@internal
```

## Behavior

1. Loads OpenAPI 3.0 spec from `specFile`
2. Matches incoming request path + method to spec paths
3. Returns example response if defined in spec
4. Generates response from schema types if no example exists
5. Supports path parameters: `/pets/{petId}` matches `/pets/123`

## Selecting Response Status

Use the `X-Mock-Status` header to request a specific response code:

```bash
# Get 404 response
curl -H "X-Mock-Status: 404" http://localhost/mock/pets/999

# Get default (200) response
curl http://localhost/mock/pets/1
```

## Response Headers

| Header | Value |
|--------|-------|
| `X-Mock` | `true` |
| `X-Mock-Path` | Matched spec path (e.g., `/pets/{petId}`) |
| `Content-Type` | `application/json` |

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `specFile` | Path to OpenAPI 3.0 YAML/JSON file | Required |
| `defaultStatus` | Default response status code | 200 |
| `addDelay` | Artificial delay for realistic testing | 0 |
