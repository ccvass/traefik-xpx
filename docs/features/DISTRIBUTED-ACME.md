# Distributed ACME (Let's Encrypt)

Valkey-backed ACME certificate storage shared across instances.

## Configuration

```yaml
# traefik.yml
certificatesResolvers:
  letsencrypt:
    acme:
      email: "admin@example.com"
      storage: "valkey://localhost:6379/0"
      httpChallenge:
        entryPoint: web
```

## Behavior

- ACME certificates stored in Valkey instead of local file
- Multiple instances share certificates without conflicts
- Leader election for challenge solving
- Auto-renewal before expiry
