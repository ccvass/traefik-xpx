# GeoIP Blocking

Block or allow traffic by country using MaxMind GeoLite2 database.

## Setup

### 1. Download GeoLite2 database

Register at [MaxMind](https://www.maxmind.com/en/geolite2/signup) (free) and download `GeoLite2-Country.mmdb`.

### 2. Mount the database

Docker Swarm:

```bash
# Copy to shared storage
cp GeoLite2-Country.mmdb /mnt/traefik/

# Add mount to service
docker service update traefik-xpx \
  --mount-add type=bind,source=/mnt/traefik/GeoLite2-Country.mmdb,target=/etc/traefik/GeoLite2-Country.mmdb
```

Docker Compose:

```yaml
volumes:
  - ./GeoLite2-Country.mmdb:/etc/traefik/GeoLite2-Country.mmdb
```

### 3. Create middleware

From the dashboard: Security → + Add GeoIP

Or in `dynamic.yml`:

```yaml
http:
  middlewares:
    latam-only:
      geoip:
        databaseFile: "/etc/traefik/GeoLite2-Country.mmdb"
        allowCountries: ["PE", "CO", "CL", "EC", "MX", "BR", "AR"]
        trustForwardedFor: true
```

### 4. Apply to a router

Add the middleware to any router via Docker labels:

```yaml
labels:
  traefik.http.routers.myapp-https.middlewares: "latam-only@file"
```

## Configuration

| Field | Type | Description |
|-------|------|-------------|
| `databaseFile` | string | Path to GeoLite2-Country.mmdb |
| `allowCountries` | []string | Whitelist — only these countries allowed (ISO 3166-1 alpha-2) |
| `blockCountries` | []string | Blacklist — these countries blocked |
| `defaultAction` | string | "allow" or "deny" when no list matches |
| `trustForwardedFor` | bool | Use X-Forwarded-For / CF-Connecting-IP headers (required behind Cloudflare) |

Use `allowCountries` OR `blockCountries`, not both.

## Country codes

Common codes: PE (Peru), CO (Colombia), CL (Chile), EC (Ecuador), MX (Mexico), BR (Brazil), AR (Argentina), US (United States), RU (Russia), CN (China).

Full list: [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

## Behavior

- Blocked requests get `403` with JSON: `{"error":"access denied","country":"RU"}`
- Allowed requests get `X-GeoIP-Country` header added (e.g. `X-GeoIP-Country: PE`)
- Unknown IPs (private, localhost) get country code `XX`
