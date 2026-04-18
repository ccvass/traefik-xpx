# LDAP Authentication

Authenticate requests against an LDAP/Active Directory server.

## Configuration

```yaml
http:
  middlewares:
    my-ldap:
      ldap:
        url: "ldap://ldap.example.com:389"
        baseDN: "dc=example,dc=com"
        bindDN: "cn=admin,dc=example,dc=com"
        bindPassword: "admin-password"
        userFilter: "(uid={{.Username}})"
        useTLS: true

  routers:
    protected:
      rule: "PathPrefix(`/internal`)"
      middlewares:
        - my-ldap
      service: backend
```

## Options

| Field | Description | Default |
|-------|-------------|---------|
| `url` | LDAP server URL | Required |
| `baseDN` | Base DN for user search | Required |
| `bindDN` | DN for binding to LDAP | Required |
| `bindPassword` | Bind password | Required |
| `userFilter` | LDAP filter template | `(uid={{.Username}})` |
| `useTLS` | Use STARTTLS | false |
