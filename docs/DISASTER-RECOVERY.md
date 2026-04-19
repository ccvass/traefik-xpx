# Disaster Recovery

## Backup

```bash
# API backup (includes static + dynamic config)
curl -o backup.tar.gz http://localhost:8099/api/config/backup

# Manual backup
tar -czf traefik-xp-backup-$(date +%Y%m%d).tar.gz \
  /etc/traefik/ \
  /certificates/ \
  /var/log/traefik/
```

## Restore

```bash
# API restore
curl -X POST http://localhost:8099/api/config/restore \
  -H "Content-Type: application/gzip" \
  --data-binary @backup.tar.gz

# Manual restore
tar -xzf traefik-xp-backup-*.tar.gz -C /
systemctl restart traefik-xp
```

## Valkey Recovery

```bash
# Valkey data is in the valkey-data volume
# If Valkey is lost, Traefik-XP falls back to file-based auth
# Users are also persisted in /etc/traefik/users.json

# Re-sync users to Valkey after recovery:
# Just restart Traefik-XP — it loads from file and pushes to Valkey
```

## Rollback

```bash
# Docker Swarm rollback
docker service rollback traefik-xp_traefik-xp

# Manual rollback to previous image
docker service update traefik-xp_traefik-xp --image traefik-xp:previous-tag
```

## Health Verification

```bash
curl -s http://localhost:8099/ping          # Should return OK
curl -s http://localhost:8099/api/overview   # Should return JSON
curl -s http://localhost:8099/dashboard/     # Should return HTML
```
