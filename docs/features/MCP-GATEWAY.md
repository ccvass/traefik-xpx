# MCP Gateway

Secure and govern Model Context Protocol (MCP) tool invocations by AI agents.

## Static Configuration

```yaml
# traefik.yml
mcp:
  servers:
    - name: filesystem
      endpoint: "stdio:///usr/local/bin/mcp-fs"
      protocol: stdio
    - name: database
      endpoint: "http://localhost:3100"
      protocol: http
    - name: github
      endpoint: "http://localhost:3101"
      protocol: http
  policies:
    - name: deny-destructive
      action: deny
      priority: 100
    - name: allow-read
      action: allow
      priority: 50
    - name: audit-all
      action: audit
      priority: 10
```

## Dynamic Middleware Configuration

```yaml
# dynamic.yml
http:
  middlewares:
    mcp-tbac:
      tbac:
        rules:
          - agent: "coding-agent"
            tools:
              - "filesystem.*"
              - "github.read_*"
            scope: "project-a"
          - agent: "admin-agent"
            tools:
              - "*"
            scope: "*"

    mcp-audit:
      mcpaudit:
        logFile: "/var/log/traefik/mcp-audit.json"
        includePayload: false

  routers:
    mcp-route:
      rule: "PathPrefix(`/mcp`)"
      middlewares:
        - mcp-tbac
        - mcp-audit
      service: mcp-gateway
```

## Policy Engine Options

| Field | Description | Default |
|-------|-------------|---------|
| `policies[].name` | Rule name | Required |
| `policies[].action` | allow, deny, audit | Required |
| `policies[].priority` | Higher = evaluated first | 0 |
| `policies[].toolPattern` | Regex matching tool names | `.*` |
| `policies[].conditions` | Additional conditions (field, operator, value) | - |

## Supported Operators

| Operator | Description |
|----------|-------------|
| `eq` | Exact match |
| `neq` | Not equal |
| `in` | Value in comma-separated list |
| `gt` | Greater than (string comparison) |
| `lt` | Less than (string comparison) |
| `matches` | Regex match |
