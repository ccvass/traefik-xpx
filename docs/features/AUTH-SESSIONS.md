# Authentication & Sessions

JWT-based login with user management.

## Configuration

```yaml
api:
  authUser: admin
  authPassword: "secure-password"
  valkeyUrl: "valkey://valkey:6379"  # optional, for HA
```

## API Endpoints

```bash
POST /api/auth/login     # {"username":"admin","password":"..."}  → {"token":"..."}
POST /api/auth/logout    # Invalidates token
GET  /api/auth/me        # Current user info
GET  /api/auth/users     # List users
POST /api/auth/users     # {"username":"new","password":"..."}
DELETE /api/auth/users   # {"username":"old"}
```

## Behavior

- JWT tokens stored in localStorage (24h expiry)
- Users persisted to /etc/traefik/users.json
- With Valkey: users and sessions shared across instances
- Without Valkey: file-based fallback
