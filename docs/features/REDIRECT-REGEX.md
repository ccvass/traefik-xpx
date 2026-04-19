# Redirect Regex

Redirects using regex pattern matching.

## Configuration

```yaml
http:
  middlewares:
    my-redirectRegex:
      redirectRegex:
        regex: "^http://(.*)$"
        replacement: "https://\${1}"
```

## Docker Swarm Labels

```yaml
deploy:
  labels:
    - "traefik.http.middlewares.my-redirectRegex.redirectRegex.regex="^http://(.*)$""
```
