# Tool-Based Access Control (TBAC)

Control which AI agents can invoke which MCP tools.

## Configuration

```yaml
http:
  middlewares:
    mcp-tbac:
      tbac:
        rules:
          - agent: "coding-agent"
            tools: ["filesystem.read_*", "github.*"]
            scope: "project-a"
          - agent: "admin-agent"
            tools: ["*"]
            scope: "*"
        defaultAction: deny
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `rules[].agent` | Agent identifier pattern | Required |
| `rules[].tools` | Allowed tool patterns (glob) | Required |
| `rules[].scope` | Scope restriction | * |
| `defaultAction` | Action when no rule matches: allow, deny | deny |
