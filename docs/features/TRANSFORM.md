# Request/Response Transform

Add, set, or remove headers on requests and responses. Includes CORS and security presets.

## Setup

### From dashboard

Security → + Add Transform

### From config

```yaml
http:
  middlewares:
    secure-headers:
      transform:
        requestHeaders:
          add:
            X-Request-ID: "{{uuid}}"
          remove:
            - "X-Powered-By"
        responseHeaders:
          set:
            X-Content-Type-Options: "nosniff"
            Strict-Transport-Security: "max-age=31536000; includeSubDomains"
          remove:
            - "Server"
            - "X-Powered-By"
        corsPreset: "security"
```

### Apply to a router

```yaml
labels:
  traefik.http.routers.myapp.middlewares: "secure-headers@file"
```

## Configuration

| Field | Type | Description |
|-------|------|-------------|
| `requestHeaders.add` | map[string]string | Headers to append to incoming request |
| `requestHeaders.set` | map[string]string | Headers to set (overwrite) on incoming request |
| `requestHeaders.remove` | []string | Headers to strip from incoming request |
| `responseHeaders.add` | map[string]string | Headers to append to outgoing response |
| `responseHeaders.set` | map[string]string | Headers to set (overwrite) on outgoing response |
| `responseHeaders.remove` | []string | Headers to strip from outgoing response |
| `corsPreset` | string | Predefined header set: `permissive`, `strict`, or `security` |

## CORS Presets

### permissive

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
```

### strict

```
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 3600
```

### security

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Examples

### Strip server info + add security headers

```yaml
transform:
  responseHeaders:
    remove:
      - "Server"
      - "X-Powered-By"
      - "X-AspNet-Version"
  corsPreset: "security"
```

### CORS for public API

```yaml
transform:
  corsPreset: "permissive"
  responseHeaders:
    set:
      Access-Control-Allow-Origin: "https://myapp.com"
```

### Add tracing headers to requests

```yaml
transform:
  requestHeaders:
    add:
      X-Trace-ID: "{{uuid}}"
      X-Forwarded-Service: "api-gateway"
```
