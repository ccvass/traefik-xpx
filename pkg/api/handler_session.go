package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type sessionManager struct {
	mu        sync.RWMutex
	tokens    map[string]sessionInfo
	users     map[string]string // user -> password
	secret    []byte
	tokenTTL  time.Duration
	usersFile string
	redis    *redisStore
}

type sessionInfo struct {
	user    string
	expires time.Time
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token   string `json:"token"`
	Expires string `json:"expires"`
	User    string `json:"user"`
}

func newSessionManager(authUser, authPassword string) *sessionManager {
	sm := &sessionManager{
		tokens:    make(map[string]sessionInfo),
		users:     make(map[string]string),
		secret:    []byte(authPassword + "-jwt-secret"),
		tokenTTL:  24 * time.Hour,
		usersFile: "/etc/traefik/users.json",
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte(authPassword), bcrypt.DefaultCost)
	sm.users[authUser] = string(hashed)
	sm.loadUsersFromFile()
	// Cleanup expired tokens periodically
	go func() {
		for range time.NewTicker(10 * time.Minute).C {
			sm.cleanup()
		}
	}()
	return sm
}

func (sm *sessionManager) generateToken(user string) string {
	payload := fmt.Sprintf("%s|%d", user, time.Now().Add(sm.tokenTTL).Unix())
	mac := hmac.New(sha256.New, sm.secret)
	mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	token := base64.RawURLEncoding.EncodeToString([]byte(payload)) + "." + sig
	sm.mu.Lock()
	sm.tokens[token] = sessionInfo{user: user, expires: time.Now().Add(sm.tokenTTL)}
	sm.mu.Unlock()
	sm.persistSession(token, user)
	return token
}

func (sm *sessionManager) validateToken(token string) (string, bool) {
	sm.mu.RLock()
	info, ok := sm.tokens[token]
	sm.mu.RUnlock()
	if ok && time.Now().Before(info.expires) {
		return info.user, true
	}
	// Check Redis
	if user, ok := sm.checkSessionRedis(token); ok {
		return user, true
	}
	return "", false
}

func (sm *sessionManager) invalidateToken(token string) {
	sm.mu.Lock()
	delete(sm.tokens, token)
	sm.mu.Unlock()
	sm.persistDeleteSession(token)
}

func (sm *sessionManager) cleanup() {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	now := time.Now()
	for k, v := range sm.tokens {
		if now.After(v.expires) {
			delete(sm.tokens, k)
		}
	}
}

func (sm *sessionManager) handleLogin(rw http.ResponseWriter, req *http.Request) {
	var lr loginRequest
	if err := json.NewDecoder(req.Body).Decode(&lr); err != nil {
		http.Error(rw, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}
	pass, ok := sm.users[lr.Username]
	if !ok || bcrypt.CompareHashAndPassword([]byte(pass), []byte(lr.Password)) != nil {
		http.Error(rw, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	}
	token := sm.generateToken(lr.Username)
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(loginResponse{
		Token:   token,
		Expires: time.Now().Add(sm.tokenTTL).Format(time.RFC3339),
		User:    lr.Username,
	})
}

func (sm *sessionManager) handleLogout(rw http.ResponseWriter, req *http.Request) {
	token := extractToken(req)
	if token != "" {
		sm.invalidateToken(token)
	}
	rw.Header().Set("Content-Type", "application/json")
	rw.Write([]byte(`{"status":"logged out"}`))
}

func (sm *sessionManager) handleMe(rw http.ResponseWriter, req *http.Request) {
	token := extractToken(req)
	user, ok := sm.validateToken(token)
	if !ok {
		http.Error(rw, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{"user": user})
}

func extractToken(req *http.Request) string {
	// Check Authorization header
	auth := req.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	// Check cookie
	if c, err := req.Cookie("token"); err == nil {
		return c.Value
	}
	return ""
}

func (sm *sessionManager) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		// Allow login endpoint without auth
		if req.URL.Path == "/api/auth/login" {
			next.ServeHTTP(rw, req)
			return
		}
		// Allow BasicAuth as fallback
		if user, pass, ok := req.BasicAuth(); ok {
			if p, exists := sm.users[user]; exists && p == pass {
				next.ServeHTTP(rw, req)
				return
			}
		}
		// Check JWT token
		token := extractToken(req)
		if _, ok := sm.validateToken(token); ok {
			next.ServeHTTP(rw, req)
			return
		}
		rw.Header().Set("Content-Type", "application/json")
		http.Error(rw, `{"error":"unauthorized"}`, http.StatusUnauthorized)
	})
}

func (sm *sessionManager) handleListUsers(rw http.ResponseWriter, _ *http.Request) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	users := make([]map[string]string, 0, len(sm.users))
	for u := range sm.users {
		users = append(users, map[string]string{"username": u})
	}
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(users)
}

func (sm *sessionManager) handleAddUser(rw http.ResponseWriter, req *http.Request) {
	var lr loginRequest
	if err := json.NewDecoder(req.Body).Decode(&lr); err != nil || lr.Username == "" || lr.Password == "" {
		http.Error(rw, `{"error":"username and password required"}`, http.StatusBadRequest)
		return
	}
	sm.mu.Lock()
	hashed2, _ := bcrypt.GenerateFromPassword([]byte(lr.Password), bcrypt.DefaultCost)
	sm.users[lr.Username] = string(hashed2)
	sm.mu.Unlock()
	sm.persistUser(lr.Username, string(hashed2))
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{"status": "created", "username": lr.Username})
}

func (sm *sessionManager) handleDeleteUser(rw http.ResponseWriter, req *http.Request) {
	var body struct{ Username string `json:"username"` }
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.Username == "" {
		http.Error(rw, `{"error":"username required"}`, http.StatusBadRequest)
		return
	}
	sm.mu.Lock()
	delete(sm.users, body.Username)
	sm.mu.Unlock()
	sm.persistDeleteUser(body.Username)
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(map[string]string{"status": "deleted", "username": body.Username})
}

func (sm *sessionManager) loadUsersFromFile() {
	data, err := os.ReadFile(sm.usersFile)
	if err != nil {
		return
	}
	var users map[string]string
	if err := json.Unmarshal(data, &users); err != nil {
		return
	}
	sm.mu.Lock()
	for k, v := range users {
		sm.users[k] = v
	}
	sm.mu.Unlock()
}

func (sm *sessionManager) saveUsersToFile() {
	sm.mu.RLock()
	data, _ := json.MarshalIndent(sm.users, "", "  ")
	sm.mu.RUnlock()
	os.WriteFile(sm.usersFile, data, 0600)
}
