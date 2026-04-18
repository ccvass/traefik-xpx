package waf

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/corazawaf/coraza/v3"
	txhttp "github.com/corazawaf/coraza/v3/http"
	"github.com/corazawaf/coraza/v3/types"
	"github.com/traefik/traefik/v3/pkg/config/dynamic"
	"github.com/traefik/traefik/v3/pkg/middlewares"
)

const (
	typeName            = "WAF"
	defaultMaxBodySize  = 13 * 1024 * 1024 // 13MB (Coraza default)
	defaultInMemoryLimit = 128 * 1024       // 128KB
)

type wafMiddleware struct {
	handler http.Handler
	name    string
}

// New creates a Coraza WAF middleware.
func New(ctx context.Context, next http.Handler, config dynamic.WAF, name string) (http.Handler, error) {
	logger := middlewares.GetLogger(ctx, name, typeName)
	logger.Debug().Msg("Creating middleware")

	if len(config.RuleFiles) == 0 && config.InlineRules == "" {
		return nil, fmt.Errorf("WAF middleware requires ruleFiles or inlineRules")
	}

	maxBody := config.MaxBodySize
	if maxBody <= 0 {
		maxBody = defaultMaxBodySize
	}

	wafCfg := coraza.NewWAFConfig().
		WithRequestBodyAccess().
		WithRequestBodyLimit(int(maxBody)).
		WithRequestBodyInMemoryLimit(defaultInMemoryLimit).
		WithResponseBodyAccess().
		WithResponseBodyMimeTypes([]string{
			"text/html", "text/plain", "application/json", "application/xml",
		}).
		WithErrorCallback(func(mr types.MatchedRule) {
			logger.Warn().
				Int("rule_id", mr.Rule().ID()).
				Str("severity", mr.Rule().Severity().String()).
				Str("msg", mr.Message()).
				Msg("WAF rule matched")
		})

	// Build directives from all sources.
	var directives strings.Builder
	directives.WriteString("SecRuleEngine On\nSecRequestBodyAccess On\n")

	if config.AuditLog {
		directives.WriteString("SecAuditEngine On\nSecAuditLogType Serial\n")
		if config.AuditLogPath != "" {
			directives.WriteString(fmt.Sprintf("SecAuditLog %s\n", config.AuditLogPath))
		}
	}

	// Load rule files.
	for _, path := range config.RuleFiles {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("reading WAF rule file %s: %w", path, err)
		}
		directives.Write(data)
		directives.WriteByte('\n')
	}

	// Append inline rules.
	if config.InlineRules != "" {
		directives.WriteString(config.InlineRules)
		directives.WriteByte('\n')
	}

	wafCfg = wafCfg.WithDirectives(directives.String())

	wafEngine, err := coraza.NewWAF(wafCfg)
	if err != nil {
		return nil, fmt.Errorf("creating WAF engine: %w", err)
	}

	wrapped := txhttp.WrapHandler(wafEngine, next)

	return &wafMiddleware{
		handler: wrapped,
		name:    name,
	}, nil
}

func (w *wafMiddleware) GetTracingInformation() (string, string) {
	return w.name, typeName
}

func (w *wafMiddleware) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	w.handler.ServeHTTP(rw, req)
}
