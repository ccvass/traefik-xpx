# TLS Certificate Management

Upload, list, and delete TLS certificates from the dashboard.

## API

```bash
GET    /api/certs/managed                    # List uploaded certs
POST   /api/certs/managed                    # Upload cert+key (JSON: name, cert, key)
DELETE /api/certs/managed                    # Delete cert (JSON: name)
GET    /api/certificates                     # List all active certs (ACME + manual)
```

## Upload via API

```bash
curl -X POST http://localhost:8099/api/certs/managed \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-domain",
    "cert": "-----BEGIN CERTIFICATE-----\n...",
    "key": "-----BEGIN PRIVATE KEY-----\n..."
  }'
```
