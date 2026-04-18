# MCP Policy Engine

Fine-grained policy rules for MCP tool access with priority ordering.

## Configuration

See [MCP Gateway](MCP-GATEWAY.md) for full policy configuration.

## Key Features

- Rules sorted by priority (highest first)
- Fail-closed: unknown operators deny access
- Supported operators: eq, neq, in, gt, lt, matches
- Actions: allow, deny, audit
- Audit action logs invocation details
