# Configuration Linter

Validate configuration for errors and best practices.

## Features

- Detect unreferenced services and middlewares
- Validate middleware configuration completeness
- Check for conflicting router rules
- Warn about insecure configurations (no TLS, weak auth)

## API

```bash
# Lint current configuration
GET /api/apimgmt/lint
```
