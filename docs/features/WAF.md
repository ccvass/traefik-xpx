# Coraza WAF (Web Application Firewall)

Native Coraza WAF integration for OWASP protection against SQLi, XSS, and other attacks.

## File Provider Configuration

```yaml
# dynamic.yml
http:
  middlewares:
    my-waf:
      waf:
        inlineRules: |
          SecRuleEngine On
          SecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403,msg:'SQL Injection'"
          SecRule ARGS "@detectXSS" "id:2,phase:2,deny,status:403,msg:'XSS detected'"
          SecRule REQUEST_HEADERS:Content-Type "!@rx ^application/(json|xml)" "id:3,phase:1,deny,status:415,msg:'Unsupported Content-Type'"
          SecRule REQUEST_BODY "@rx <script>" "id:4,phase:2,deny,status:403,msg:'Script injection'"

  routers:
    secure-route:
      rule: "PathPrefix(`/api`)"
      entryPoints:
        - web
      middlewares:
        - my-waf
      service: backend
```

## Docker Swarm Labels

```yaml
services:
  my-app:
    image: my-app:latest
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.app.rule=Host(`app.example.com`)"
        - "traefik.http.routers.app.middlewares=waf-protection"
        - "traefik.http.services.app.loadbalancer.server.port=8080"
        # WAF middleware
        - "traefik.http.middlewares.waf-protection.waf.inlineRules=SecRuleEngine On\nSecRule ARGS \"@detectSQLi\" \"id:1,phase:2,deny,status:403\"\nSecRule ARGS \"@detectXSS\" \"id:2,phase:2,deny,status:403\""
```

## Using External Rule Files

```yaml
http:
  middlewares:
    owasp-waf:
      waf:
        ruleFile: "/etc/traefik/waf-rules/owasp-crs.conf"
```

## Combined with Other Middlewares

```yaml
http:
  routers:
    secure-api:
      rule: "PathPrefix(`/api`)"
      middlewares:
        - my-waf
        - rate-limit
        - jwt-auth
      service: backend
```

## Options

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| `inlineRules` | ModSecurity/Coraza rules inline | Yes (or ruleFile) | - |
| `ruleFile` | Path to external rules file | Yes (or inlineRules) | - |

## Testing

```bash
# Should return 403 (SQLi detected)
curl -i "http://localhost/api?id=1%20OR%201=1"

# Should return 403 (XSS detected)
curl -i "http://localhost/api?name=<script>alert(1)</script>"

# Should return 200 (clean request)
curl -i "http://localhost/api?id=123"
```
