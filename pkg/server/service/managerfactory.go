package service

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/traefik/traefik/v3/pkg/api"
	"github.com/traefik/traefik/v3/pkg/api/dashboard"
	"github.com/traefik/traefik/v3/pkg/config/runtime"
	"github.com/traefik/traefik/v3/pkg/config/static"
	"github.com/traefik/traefik/v3/pkg/observability/metrics"
	"github.com/traefik/traefik/v3/pkg/safe"
	"github.com/traefik/traefik/v3/pkg/server/middleware"
	"github.com/traefik/traefik/v3/pkg/tls"
)

// ManagerFactory a factory of service manager.
type ManagerFactory struct {
	observabilityMgr *middleware.ObservabilityMgr

	transportManager *TransportManager
	proxyBuilder     ProxyBuilder

	api              func(configuration *runtime.Configuration) http.Handler
	restHandler      http.Handler
	dashboardHandler http.Handler
	metricsHandler   http.Handler
	pingHandler      http.Handler
	acmeHTTPHandler  http.Handler

	routinesPool *safe.Pool
}

// NewManagerFactory creates a new ManagerFactory.
func NewManagerFactory(staticConfiguration static.Configuration, routinesPool *safe.Pool, observabilityMgr *middleware.ObservabilityMgr, transportManager *TransportManager, proxyBuilder ProxyBuilder, acmeHTTPHandler http.Handler, tlsManager *tls.Manager) *ManagerFactory {
	factory := &ManagerFactory{
		observabilityMgr: observabilityMgr,
		routinesPool:     routinesPool,
		transportManager: transportManager,
		proxyBuilder:     proxyBuilder,
		acmeHTTPHandler:  acmeHTTPHandler,
	}

	if staticConfiguration.API != nil {
		apiRouterBuilder := api.NewBuilder(staticConfiguration, tlsManager)

		if staticConfiguration.API.Dashboard {
			dh := dashboard.Handler{BasePath: staticConfiguration.API.BasePath}
			if staticConfiguration.API.AuthUser != "" && staticConfiguration.API.AuthPassword != "" {
				factory.dashboardHandler = basicAuthWrap(dh, staticConfiguration.API.AuthUser, staticConfiguration.API.AuthPassword)
			} else {
				factory.dashboardHandler = dh
			}
			factory.api = func(configuration *runtime.Configuration) http.Handler {
				router := apiRouterBuilder(configuration).(*mux.Router)
				if err := dashboard.Append(router, staticConfiguration.API.BasePath, nil); err != nil {
					log.Error().Err(err).Msg("Error appending dashboard to API router")
				}

				if staticConfiguration.API.AuthUser != "" && staticConfiguration.API.AuthPassword != "" {
					return basicAuthWrap(router, staticConfiguration.API.AuthUser, staticConfiguration.API.AuthPassword)
				}
				return router
			}
		} else {
			factory.api = apiRouterBuilder
		}
	}

	if staticConfiguration.Providers != nil && staticConfiguration.Providers.Rest != nil {
		factory.restHandler = staticConfiguration.Providers.Rest.CreateRouter()
	}

	if staticConfiguration.Metrics != nil && staticConfiguration.Metrics.Prometheus != nil {
		factory.metricsHandler = metrics.PrometheusHandler()
	}

	// This check is necessary because even when staticConfiguration.Ping == nil ,
	// the affectation would make factory.pingHandle become a typed nil, which does not pass the nil test,
	// and would break things elsewhere.
	if staticConfiguration.Ping != nil {
		factory.pingHandler = staticConfiguration.Ping
	}

	return factory
}

// Build creates a service manager.
func (f *ManagerFactory) Build(configuration *runtime.Configuration) *Manager {
	var apiHandler http.Handler
	if f.api != nil {
		apiHandler = f.api(configuration)
	}

	internalHandlers := NewInternalHandlers(apiHandler, f.restHandler, f.metricsHandler, f.pingHandler, f.dashboardHandler, f.acmeHTTPHandler)
	return NewManager(configuration.Services, f.observabilityMgr, f.routinesPool, f.transportManager, f.proxyBuilder, internalHandlers)
}

func basicAuthWrap(next http.Handler, user, password string) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		u, p, ok := req.BasicAuth()
		if !ok || u != user || p != password {
			rw.Header().Set("WWW-Authenticate", `Basic realm="traefik-api-srv"`)
			http.Error(rw, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(rw, req)
	})
}
