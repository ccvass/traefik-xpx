# Installation Guide

## Docker (recommended)

```bash
# Pull and run
docker pull alfonsodg/traefik-xp:latest
docker run -d \
  --name traefik-xp \
  -p 80:80 -p 443:443 -p 8099:8099 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v traefik-config:/etc/traefik \
  -v traefik-certs:/certificates \
  alfonsodg/traefik-xp:latest

# Dashboard at http://localhost:8099/dashboard/
```

## Docker Swarm

```bash
# Create overlay network
docker network create --driver overlay traefik-public

# Deploy stack
docker stack deploy -c docker-compose.yml traefik-xp

# Verify
docker service ls | grep traefik-xp
```

### docker-compose.yml

See [docker-compose.yml](../docker-compose.yml) in the repo root.

Required environment variables:
```bash
export ADMIN_PASSWORD=your-secure-password
export ACME_EMAIL=admin@example.com
```

## Binary

### Prerequisites
- Go 1.24+
- Node.js 24+ and npm

### Build

```bash
git clone git@github.com:alfonsodg/traefik-api-srv.git
cd traefik-api-srv

# Build frontend
cd webui-new && npm ci && npx vite build && cd ..

# Build binary
go build -o traefik-xp ./cmd/traefik

# FIPS 140-2 build (optional)
CGO_ENABLED=1 GOEXPERIMENT=boringcrypto go build -o traefik-xp ./cmd/traefik
```

### Run

```bash
./traefik-xp --configFile=/etc/traefik/traefik.yml
```

### Systemd Service

```ini
# /etc/systemd/system/traefik-xp.service
[Unit]
Description=Traefik-XP API Gateway
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/traefik-xp --configFile=/etc/traefik/traefik.yml
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable traefik-xp
sudo systemctl start traefik-xp
```

## Minimal Configuration

### /etc/traefik/traefik.yml

```yaml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
  traefik:
    address: ":8099"

api:
  dashboard: true
  authUser: admin
  authPassword: "change-me"

providers:
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

ping:
  entryPoint: web

log:
  level: INFO

accessLog: {}
```

### /etc/traefik/dynamic.yml

```yaml
http:
  routers:
    my-app:
      rule: "Host(`app.example.com`)"
      entryPoints:
        - websecure
      service: my-app
      tls:
        certResolver: le

  services:
    my-app:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:8080"
        healthCheck:
          path: /health
          interval: 10s
```

## With Valkey (for HA)

```yaml
# Add to traefik.yml
api:
  valkeyUrl: "valkey://valkey:6379"
```

```bash
# Run Valkey
docker run -d --name valkey -p 6379:6379 valkey/valkey:9-alpine
```

## With Let's Encrypt

```yaml
# Add to traefik.yml
certificatesResolvers:
  le:
    acme:
      email: admin@example.com
      storage: /certificates/acme.json
      httpChallenge:
        entryPoint: web
```

## With Cloudflare DNS

```yaml
certificatesResolvers:
  le:
    acme:
      email: admin@example.com
      storage: /certificates/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

```bash
# Set environment variables
export CF_API_EMAIL=your@email.com
export CF_API_KEY=your-api-key
```

## Verify Installation

```bash
# Health check
curl http://localhost:80/ping

# API
curl http://localhost:8099/api/overview

# Dashboard
open http://localhost:8099/dashboard/
```

## Next Steps

- [Feature Guide](features/README.md) — Configure AI Gateway, MCP, Security, etc.
- [Migration from Traefik 2.x](MIGRATION-VERTIX.md) — If upgrading from existing Traefik
