package geoip

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"

	"github.com/oschwald/maxminddb-golang"
	"github.com/rs/zerolog/log"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
)

const typeName = "GeoIP"

type geoIPMiddleware struct {
	next    http.Handler
	name    string
	config  dynamic.GeoIP
	db      *maxminddb.Reader
	allowed map[string]bool
	blocked map[string]bool
}

type geoRecord struct {
	Country struct {
		ISOCode string `maxminddb:"iso_code"`
	} `maxminddb:"country"`
}

// New creates a GeoIP middleware.
func New(ctx context.Context, next http.Handler, config dynamic.GeoIP, name string) (http.Handler, error) {
	if config.DatabaseFile == "" {
		return nil, fmt.Errorf("GeoIP middleware requires databaseFile")
	}

	db, err := maxminddb.Open(config.DatabaseFile)
	if err != nil {
		return nil, fmt.Errorf("failed to open GeoIP database %s: %w", config.DatabaseFile, err)
	}

	m := &geoIPMiddleware{
		next:    next,
		name:    name,
		config:  config,
		db:      db,
		allowed: make(map[string]bool),
		blocked: make(map[string]bool),
	}

	for _, c := range config.AllowCountries {
		m.allowed[strings.ToUpper(c)] = true
	}
	for _, c := range config.BlockCountries {
		m.blocked[strings.ToUpper(c)] = true
	}

	log.Info().Str("middleware", name).Str("type", typeName).
		Int("allowCountries", len(m.allowed)).
		Int("blockCountries", len(m.blocked)).
		Msg("GeoIP middleware created")

	return m, nil
}

func (m *geoIPMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	ip := m.getClientIP(req)
	country := m.lookupCountry(ip)

	// Whitelist mode
	if len(m.allowed) > 0 {
		if !m.allowed[country] {
			log.Warn().Str("middleware", m.name).Str("ip", ip).Str("country", country).Msg("GeoIP blocked (not in allow list)")
			rw.Header().Set("Content-Type", "application/json")
			rw.WriteHeader(http.StatusForbidden)
			fmt.Fprintf(rw, `{"error":"access denied","country":"%s"}`, country)
			return
		}
	}

	// Blacklist mode
	if len(m.blocked) > 0 {
		if m.blocked[country] {
			log.Warn().Str("middleware", m.name).Str("ip", ip).Str("country", country).Msg("GeoIP blocked (in block list)")
			rw.Header().Set("Content-Type", "application/json")
			rw.WriteHeader(http.StatusForbidden)
			fmt.Fprintf(rw, `{"error":"access denied","country":"%s"}`, country)
			return
		}
	}

	// Add country header for downstream
	req.Header.Set("X-GeoIP-Country", country)
	m.next.ServeHTTP(rw, req)
}

func (m *geoIPMiddleware) getClientIP(req *http.Request) string {
	if m.config.TrustForwardedFor {
		if xff := req.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			return strings.TrimSpace(parts[0])
		}
		if cfIP := req.Header.Get("CF-Connecting-IP"); cfIP != "" {
			return cfIP
		}
	}
	host, _, _ := net.SplitHostPort(req.RemoteAddr)
	return host
}

func (m *geoIPMiddleware) lookupCountry(ip string) string {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return "XX"
	}
	var record geoRecord
	if err := m.db.Lookup(parsedIP, &record); err != nil {
		return "XX"
	}
	if record.Country.ISOCode == "" {
		return "XX"
	}
	return record.Country.ISOCode
}
