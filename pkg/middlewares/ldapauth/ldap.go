package ldapauth

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-ldap/ldap/v3"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
	"github.com/traefik/traefik/v3/pkg/middlewares/observability"
)

const (
	typeName             = "LDAP"
	defaultSearchFilter  = "({{usernameAttr}}={{username}})"
	defaultUsernameAttr  = "uid"
	defaultGroupAttr     = "cn"
	defaultCacheDuration = 5 * time.Minute
)

type cacheEntry struct {
	expiry time.Time
	groups []string
	attrs  map[string]string
}

type ldapMiddleware struct {
	next           http.Handler
	name           string
	config         dynamic.LDAP
	searchFilter   string
	usernameAttr   string
	groupAttr      string
	cacheDuration  time.Duration
	mu             sync.RWMutex
	cache          map[string]*cacheEntry
}

// New creates an LDAP authentication middleware.
func New(ctx context.Context, next http.Handler, config dynamic.LDAP, name string) (http.Handler, error) {
	middlewares.GetLogger(ctx, name, typeName).Debug().Msg("Creating middleware")

	if config.URL == "" {
		return nil, fmt.Errorf("LDAP URL is required")
	}
	if config.BaseDN == "" {
		return nil, fmt.Errorf("LDAP baseDN is required")
	}

	sf := config.SearchFilter
	if sf == "" {
		sf = defaultSearchFilter
	}
	ua := config.UsernameAttr
	if ua == "" {
		ua = defaultUsernameAttr
	}
	ga := config.GroupAttr
	if ga == "" {
		ga = defaultGroupAttr
	}
	cd := defaultCacheDuration
	if config.CacheDuration > 0 {
		cd = time.Duration(config.CacheDuration)
	}

	return &ldapMiddleware{
		next:          next,
		name:          name,
		config:        config,
		searchFilter:  sf,
		usernameAttr:  ua,
		groupAttr:     ga,
		cacheDuration: cd,
		cache:         make(map[string]*cacheEntry),
	}, nil
}

func (l *ldapMiddleware) GetTracingInformation() (string, string) {
	return l.name, typeName
}

func (l *ldapMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	logger := middlewares.GetLogger(req.Context(), l.name, typeName)

	username, password, ok := req.BasicAuth()
	if !ok || username == "" {
		rw.Header().Set("WWW-Authenticate", `Basic realm="LDAP"`)
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	cacheKey := username + ":" + base64.StdEncoding.EncodeToString([]byte(password))

	// Check cache.
	l.mu.RLock()
	if entry, ok := l.cache[cacheKey]; ok && time.Now().Before(entry.expiry) {
		l.mu.RUnlock()
		l.setForwardHeaders(req, entry.attrs)
		l.next.ServeHTTP(rw, req)
		return
	}
	l.mu.RUnlock()

	attrs, groups, err := l.authenticate(username, password)
	if err != nil {
		logger.Debug().Err(err).Str("user", username).Msg("LDAP authentication failed")
		observability.SetStatusErrorf(req.Context(), "Authentication failed")
		rw.Header().Set("WWW-Authenticate", `Basic realm="LDAP"`)
		http.Error(rw, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		return
	}

	// Cache successful auth.
	l.mu.Lock()
	l.cache[cacheKey] = &cacheEntry{
		expiry: time.Now().Add(l.cacheDuration),
		groups: groups,
		attrs:  attrs,
	}
	l.mu.Unlock()

	logger.Debug().Str("user", username).Strs("groups", groups).Msg("LDAP authentication succeeded")
	l.setForwardHeaders(req, attrs)
	l.next.ServeHTTP(rw, req)
}

func (l *ldapMiddleware) authenticate(username, password string) (map[string]string, []string, error) {
	conn, err := l.dial()
	if err != nil {
		return nil, nil, fmt.Errorf("LDAP connect: %w", err)
	}
	defer conn.Close()

	// Service account bind.
	if l.config.BindDN != "" {
		if err := conn.Bind(l.config.BindDN, l.config.BindPassword); err != nil {
			return nil, nil, fmt.Errorf("service bind: %w", err)
		}
	}

	// Search for user.
	filter := strings.ReplaceAll(l.searchFilter, "{{username}}", ldap.EscapeFilter(username))
	filter = strings.ReplaceAll(filter, "{{usernameAttr}}", l.usernameAttr)

	searchAttrs := []string{"dn", l.usernameAttr}
	for ldapAttr := range l.config.ForwardHeaders {
		searchAttrs = append(searchAttrs, ldapAttr)
	}

	sr, err := conn.Search(ldap.NewSearchRequest(
		l.config.BaseDN, ldap.ScopeWholeSubtree, ldap.NeverDerefAliases,
		1, 0, false, filter, searchAttrs, nil,
	))
	if err != nil {
		return nil, nil, fmt.Errorf("user search: %w", err)
	}
	if len(sr.Entries) == 0 {
		return nil, nil, fmt.Errorf("user not found")
	}

	userDN := sr.Entries[0].DN

	// Collect attributes.
	attrs := make(map[string]string)
	for _, attr := range sr.Entries[0].Attributes {
		if len(attr.Values) > 0 {
			attrs[attr.Name] = attr.Values[0]
		}
	}

	// User bind to verify password.
	if err := conn.Bind(userDN, password); err != nil {
		return nil, nil, fmt.Errorf("user bind: %w", err)
	}

	// Group lookup.
	var groups []string
	if l.config.GroupFilter != "" {
		if l.config.BindDN != "" {
			conn.Bind(l.config.BindDN, l.config.BindPassword)
		}
		gf := strings.ReplaceAll(l.config.GroupFilter, "{{userDN}}", ldap.EscapeFilter(userDN))
		gf = strings.ReplaceAll(gf, "{{username}}", ldap.EscapeFilter(username))

		gsr, err := conn.Search(ldap.NewSearchRequest(
			l.config.BaseDN, ldap.ScopeWholeSubtree, ldap.NeverDerefAliases,
			0, 0, false, gf, []string{l.groupAttr}, nil,
		))
		if err == nil {
			for _, entry := range gsr.Entries {
				if v := entry.GetAttributeValue(l.groupAttr); v != "" {
					groups = append(groups, v)
				}
			}
		}
	}

	return attrs, groups, nil
}

func (l *ldapMiddleware) dial() (*ldap.Conn, error) {
	tlsConfig := &tls.Config{InsecureSkipVerify: l.config.InsecureSkipVerify}

	conn, err := ldap.DialURL(l.config.URL, ldap.DialWithTLSConfig(tlsConfig))
	if err != nil {
		return nil, err
	}

	if l.config.StartTLS {
		if err := conn.StartTLS(tlsConfig); err != nil {
			conn.Close()
			return nil, fmt.Errorf("STARTTLS: %w", err)
		}
	}

	return conn, nil
}

func (l *ldapMiddleware) setForwardHeaders(req *http.Request, attrs map[string]string) {
	for ldapAttr, header := range l.config.ForwardHeaders {
		if val, ok := attrs[ldapAttr]; ok {
			req.Header.Set(header, val)
		}
	}
}
