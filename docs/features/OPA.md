# Open Policy Agent (OPA)

External policy evaluation via OPA.

## Configuration

```yaml
http:
  middlewares:
    my-opa:
      opa:
        endpoint: "http://localhost:8181/v1/data/authz/allow"
        headers:
          X-User: "{{.Request.Header.X-User}}"
        timeout: 5s

  routers:
    policy-route:
      rule: "PathPrefix(`/admin`)"
      middlewares:
        - my-opa
      service: backend
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `endpoint` | OPA decision endpoint URL | Required |
| `headers` | Headers to forward to OPA | - |
| `timeout` | Request timeout | 5s |
