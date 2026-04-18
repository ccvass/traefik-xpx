# API Versioning

Route requests to different service versions based on headers or path.

## Configuration

```yaml
http:
  middlewares:
    versioning:
      apiversioning:
        headerName: "X-API-Version"
        defaultVersion: "v2"
        versions:
          v1: "service-v1"
          v2: "service-v2"
          v3: "service-v3"
```
