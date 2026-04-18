package api

import (
	"crypto/subtle"
	"net/http"
)

// basicAuthMiddleware protects the dashboard and API with basic authentication.
func (h *Handler) basicAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		user, pass, ok := req.BasicAuth()
		if !ok ||
			subtle.ConstantTimeCompare([]byte(user), []byte(h.staticConfig.API.AuthUser)) != 1 ||
			subtle.ConstantTimeCompare([]byte(pass), []byte(h.staticConfig.API.AuthPassword)) != 1 {
			rw.Header().Set("WWW-Authenticate", `Basic realm="traefik-api-srv"`)
			http.Error(rw, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(rw, req)
	})
}
