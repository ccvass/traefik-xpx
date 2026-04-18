# MCP Audit Logger

Log all MCP tool invocations for compliance and debugging.

## Configuration

```yaml
http:
  middlewares:
    mcp-audit:
      mcpaudit:
        logFile: "/var/log/traefik/mcp-audit.json"
        includePayload: false
        includeResponse: false
```

## Log Format

```json
{"timestamp":"2026-04-18T12:00:00Z","agent":"coding-agent","tool":"filesystem.read","scope":"project-a","allowed":true,"rule":"allow-read","duration_ms":45}
```
