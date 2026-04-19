package api

import (
	"crypto/subtle"
	"net/http"
)

// requireAuth checks basic auth for write operations. Returns true if authorized.
func (h *Handler) requireAuth(rw http.ResponseWriter, req *http.Request) bool {
	if h.staticConfig.API == nil || h.staticConfig.API.AuthUser == "" {
		return true
	}
	user, pass, ok := req.BasicAuth()
	if !ok ||
		subtle.ConstantTimeCompare([]byte(user), []byte(h.staticConfig.API.AuthUser)) != 1 ||
		subtle.ConstantTimeCompare([]byte(pass), []byte(h.staticConfig.API.AuthPassword)) != 1 {
		rw.Header().Set("WWW-Authenticate", `Basic realm="traefik-api-srv"`)
		http.Error(rw, "Unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

// authWrap wraps a handler with auth check.
func (h *Handler) authWrap(next http.HandlerFunc) http.HandlerFunc {
	return func(rw http.ResponseWriter, req *http.Request) {
		if !h.requireAuth(rw, req) {
			return
		}
		next(rw, req)
	}
}
