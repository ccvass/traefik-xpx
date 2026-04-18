# FIPS 140-2 Compliance

Build with FIPS-compliant cryptographic modules.

## Build

```bash
CGO_ENABLED=1 GOEXPERIMENT=boringcrypto go build -o traefik-api-srv ./cmd/traefik
```

## Behavior

- Uses BoringCrypto for all TLS operations
- Restricts to FIPS-approved cipher suites
- Compliant with NIST SP 800-140 requirements
- Verified via `go version -m traefik-api-srv | grep boringcrypto`
