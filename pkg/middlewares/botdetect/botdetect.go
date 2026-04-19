package botdetect

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
)

const typeName = "BotDetect"

var defaultBlockPatterns = []string{
	`(?i)python-requests`, `(?i)python-urllib`, `(?i)scrapy`, `(?i)httpclient`,
	`(?i)go-http-client`, `(?i)java/`, `(?i)libwww-perl`, `(?i)wget/`,
	`(?i)nikto`, `(?i)sqlmap`, `(?i)nmap`, `(?i)masscan`,
	`(?i)zgrab`, `(?i)censys`, `(?i)shodan`, `(?i)semrush`,
	`(?i)ahrefsbot`, `(?i)mj12bot`, `(?i)dotbot`, `(?i)petalbot`,
}

var defaultAllowPatterns = []string{
	`(?i)googlebot`, `(?i)bingbot`, `(?i)slurp`, `(?i)duckduckbot`,
	`(?i)facebookexternalhit`, `(?i)twitterbot`, `(?i)linkedinbot`,
	`(?i)cloudflare`, `(?i)uptimerobot`, `(?i)pingdom`,
}

type rateEntry struct {
	count int
	first time.Time
}

type botDetectMiddleware struct {
	next         http.Handler
	name         string
	config       dynamic.BotDetect
	blockRegexps []*regexp.Regexp
	allowRegexps []*regexp.Regexp
	rates        map[string]*rateEntry
	mu           sync.Mutex
}

// New creates a BotDetect middleware.
func New(ctx context.Context, next http.Handler, config dynamic.BotDetect, name string) (http.Handler, error) {
	m := &botDetectMiddleware{
		next:   next,
		name:   name,
		config: config,
		rates:  make(map[string]*rateEntry),
	}

	// Compile block patterns
	patterns := defaultBlockPatterns
	if len(config.CustomBlockPatterns) > 0 {
		patterns = append(patterns, config.CustomBlockPatterns...)
	}
	if config.BlockKnownBots {
		for _, p := range patterns {
			if r, err := regexp.Compile(p); err == nil {
				m.blockRegexps = append(m.blockRegexps, r)
			}
		}
	}

	// Compile allow patterns
	allowPats := defaultAllowPatterns
	if len(config.CustomAllowPatterns) > 0 {
		allowPats = append(allowPats, config.CustomAllowPatterns...)
	}
	if config.AllowGoodBots {
		for _, p := range allowPats {
			if r, err := regexp.Compile(p); err == nil {
				m.allowRegexps = append(m.allowRegexps, r)
			}
		}
	}

	// Cleanup old rate entries every minute
	go func() {
		for {
			time.Sleep(time.Minute)
			m.mu.Lock()
			now := time.Now()
			for k, v := range m.rates {
				if now.Sub(v.first) > time.Minute {
					delete(m.rates, k)
				}
			}
			m.mu.Unlock()
		}
	}()

	log.Info().Str("middleware", name).Str("type", typeName).
		Int("blockPatterns", len(m.blockRegexps)).
		Int("allowPatterns", len(m.allowRegexps)).
		Msg("BotDetect middleware created")

	return m, nil
}

func (m *botDetectMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	ua := req.UserAgent()
	ip := m.getClientIP(req)

	// Check allow list first
	for _, r := range m.allowRegexps {
		if r.MatchString(ua) {
			m.next.ServeHTTP(rw, req)
			return
		}
	}

	// Check block list
	for _, r := range m.blockRegexps {
		if r.MatchString(ua) {
			log.Warn().Str("middleware", m.name).Str("ip", ip).Str("ua", ua).Msg("Bot blocked (UA match)")
			m.respond(rw, 403, "bot detected")
			return
		}
	}

	// Empty UA = suspicious
	if ua == "" {
		log.Warn().Str("middleware", m.name).Str("ip", ip).Msg("Bot blocked (empty UA)")
		m.respond(rw, 403, "bot detected")
		return
	}

	// Rate check
	if m.config.RateThreshold > 0 {
		m.mu.Lock()
		entry, ok := m.rates[ip]
		if !ok {
			m.rates[ip] = &rateEntry{count: 1, first: time.Now()}
		} else {
			entry.count++
			if time.Since(entry.first) < time.Minute && entry.count > m.config.RateThreshold {
				m.mu.Unlock()
				log.Warn().Str("middleware", m.name).Str("ip", ip).Int("count", entry.count).Msg("Bot blocked (rate exceeded)")
				if m.config.ChallengeMode {
					m.respond(rw, 429, "too many requests")
				} else {
					m.respond(rw, 403, "bot detected")
				}
				return
			}
		}
		m.mu.Unlock()
	}

	m.next.ServeHTTP(rw, req)
}

func (m *botDetectMiddleware) respond(rw http.ResponseWriter, code int, msg string) {
	rw.Header().Set("Content-Type", "application/json")
	if code == 429 {
		rw.Header().Set("Retry-After", "60")
	}
	rw.WriteHeader(code)
	fmt.Fprintf(rw, `{"error":"%s"}`, msg)
}

func (m *botDetectMiddleware) getClientIP(req *http.Request) string {
	if xff := req.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if cfIP := req.Header.Get("CF-Connecting-IP"); cfIP != "" {
		return cfIP
	}
	host, _, _ := net.SplitHostPort(req.RemoteAddr)
	return host
}
