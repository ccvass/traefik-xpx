# Static Configuration Auto-Reload

Automatically detect changes to `traefik.yml` and trigger graceful reload.

## Behavior

- File watcher monitors the static config file via `fsnotify`
- On file change, sends SIGHUP to trigger graceful reload
- Debounced: minimum 2 seconds between reloads
- Falls back to `systemctl restart` if SIGHUP fails

## Manual Reload

```bash
# Trigger reload via API
curl -X POST http://localhost:8099/api/reload

# Check reload status
curl http://localhost:8099/api/reload
# {"autoReload":true,"configFile":"/etc/traefik/traefik.yml","lastReload":"2026-04-18T..."}
```

## Environment Variable

Set `TRAEFIK_CONFIG_FILE` to override the default config file path:

```bash
export TRAEFIK_CONFIG_FILE=/custom/path/traefik.yml
```

Default search paths: `/etc/traefik/traefik.yml`, `/etc/traefik/traefik.yaml`, `./traefik.yml`
