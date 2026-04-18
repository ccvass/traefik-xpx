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
      endpoint: "http://mcp-db:3100"
      protocol: http
    - name: github
      endpoint: "http://mcp-github:3101"
      protocol: http
    - name: kubernetes
      endpoint: "http://mcp-k8s:3102"
      protocol: http
  policies:
    - name: deny-destructive-tools
      action: deny
      priority: 100
      toolPattern: ".*delete.*|.*drop.*|.*remove.*"
    - name: allow-read-operations
      action: allow
      priority: 50
      toolPattern: ".*read.*|.*get.*|.*list.*"
    - name: audit-everything
      action: audit
      priority: 10
      toolPattern: ".*"
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
              - "filesystem.read_*"
              - "filesystem.write_*"
              - "github.*"
            scope: "project-a"
          - agent: "review-agent"
            tools:
              - "filesystem.read_*"
              - "github.read_*"
            scope: "project-a"
          - agent: "admin-agent"
            tools:
              - "*"
            scope: "*"
        defaultAction: deny

    mcp-audit:
      mcpaudit:
        logFile: "/var/log/traefik/mcp-audit.json"
        includePayload: false
        includeResponse: false

  routers:
    mcp-route:
      rule: "PathPrefix(`/mcp`)"
      entryPoints:
        - web
      middlewares:
        - mcp-tbac
        - mcp-audit
      service: mcp-gateway
```

## Docker Swarm Deployment

```yaml
version: "3.8"

services:
  traefik:
    image: traefik-api-srv:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml
      - ./dynamic.yml:/etc/traefik/dynamic.yml
      - mcp-audit-logs:/var/log/traefik
    ports:
      - "80:80"
      - "8099:8099"
    deploy:
      mode: global
      placement:
        constraints: [node.role == manager]

  mcp-filesystem:
    image: mcp-filesystem:latest
    volumes:
      - /opt/projects:/workspace:ro
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.mcp-fs.rule=PathPrefix(`/mcp/filesystem`)"
        - "traefik.http.routers.mcp-fs.middlewares=mcp-tbac,mcp-audit"
        - "traefik.http.services.mcp-fs.loadbalancer.server.port=3000"

volumes:
  mcp-audit-logs:
```

## Policy Engine

### Evaluation Order

1. Rules sorted by `priority` (highest first)
2. First matching rule determines the action
3. If no rule matches, `defaultAction` applies (default: deny)

### Supported Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Exact match | `agent_id eq "coding-agent"` |
| `neq` | Not equal | `scope neq "production"` |
| `in` | Value in list | `agent_id in "agent-a,agent-b"` |
| `gt` | Greater than | `priority gt "50"` |
| `lt` | Less than | `priority lt "100"` |
| `matches` | Regex match | `tool matches "filesystem\\..*"` |

### Fail-Closed Behavior

Unknown operators always **deny** access (fail-closed). This prevents accidental access grants from typos or unsupported operators.

## Audit Log Format

```json
{
  "timestamp": "2026-04-18T12:00:00Z",
  "agent": "coding-agent",
  "tool": "filesystem.read_file",
  "scope": "project-a",
  "allowed": true,
  "rule": "allow-read-operations",
  "duration_ms": 45
}
```

## TBAC Options

| Field | Description | Default |
|-------|-------------|---------|
| `rules[].agent` | Agent identifier (exact match) | Required |
| `rules[].tools` | Allowed tool patterns (glob with `*`) | Required |
| `rules[].scope` | Scope restriction | `*` |
| `defaultAction` | Action when no rule matches | `deny` |
