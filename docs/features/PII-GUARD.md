# PII Guard

Filter personally identifiable information from requests and responses.

## Configuration

```yaml
http:
  middlewares:
    pii-filter:
      piiguard:
        patterns:
          - email
          - phone
          - ssn
          - credit_card
        action: redact
        replacement: "[REDACTED]"
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `patterns` | PII types to detect | Required |
| `action` | redact, block, log | redact |
| `replacement` | Replacement text for redacted content | [REDACTED] |
