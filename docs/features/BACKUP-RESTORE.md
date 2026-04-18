# Backup and Restore

Export and import full configuration state.

## Backup

```bash
# Download backup as tar.gz
curl -o backup.tar.gz http://localhost:8099/api/config/backup

# Contents: traefik.yml + dynamic.yml
tar -tzf backup.tar.gz
```

## Restore

```bash
# Upload backup to restore
curl -X POST -H "Content-Type: application/gzip" \
  --data-binary @backup.tar.gz \
  http://localhost:8099/api/config/restore
```

## Notes

- Backup includes both static (`traefik.yml`) and dynamic (`dynamic.yml`) configuration
- Restore overwrites existing files
- Static config changes require restart or reload (`POST /api/reload`)
- Dynamic config changes take effect immediately (file provider watch)
