# Encrypted Cluster Communication (mTLS)

Auto-generated internal CA with mutual TLS for inter-node communication.

## Configuration

```yaml
# traefik.yml
cluster:
  mtls:
    enabled: true
    certDir: "/etc/traefik/cluster-certs"
```

## Behavior

1. On first start, generates an internal ECDSA P-256 CA (10-year validity)
2. Issues node certificates signed by the internal CA
3. All inter-node communication uses TLS 1.3 with mutual authentication
4. CA and node certs persisted to `certDir`
5. On restart, loads existing CA (no regeneration)

## Generated Files

```
/etc/traefik/cluster-certs/
├── ca.pem          # Internal CA certificate
└── ca-key.pem      # Internal CA private key (mode 0600)
```

## Manual Certificate Issuance

The internal CA can issue certificates programmatically for additional nodes. Node certificates include:
- Server + Client auth extended key usage
- IP SANs for the node's addresses
- 1-year validity with automatic renewal
