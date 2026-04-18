# Coraza WAF (Web Application Firewall)

Native Coraza WAF integration for OWASP protection.

## Configuration

```yaml
http:
  middlewares:
    my-waf:
      waf:
        inlineRules: |
          SecRuleEngine On
          SecRule ARGS "@detectSQLi" "id:1,phase:2,deny,status:403,msg:'SQL Injection'"
          SecRule ARGS "@detectXSS" "id:2,phase:2,deny,status:403,msg:'XSS detected'"
          SecRule REQUEST_HEADERS:Content-Type "!@rx ^application/(json|xml)" "id:3,phase:1,deny,status:415,msg:'Unsupported Content-Type'"

  routers:
    secure-route:
      rule: "PathPrefix(`/secure`)"
      middlewares:
        - my-waf
      service: backend
```

## Using External Rule Files

```yaml
http:
  middlewares:
    my-waf:
      waf:
        ruleFile: "/etc/traefik/waf-rules/owasp-crs.conf"
```

## Options

| Field | Description | Required |
|-------|-------------|----------|
| `inlineRules` | ModSecurity rules inline | Yes (or ruleFile) |
| `ruleFile` | Path to external rules file | Yes (or inlineRules) |
