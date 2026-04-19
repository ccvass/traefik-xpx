# Pass TLS Client Cert

Forwards mTLS client certificate info as headers.

## Configuration

```yaml
http:
  middlewares:
    my-passTLSClientCert:
      passTLSClientCert:
        pem: true
        info:
          subject: true
          issuer: true
          sans: true
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-passTLSClientCert.passTLSClientCert.pem=true"
```
