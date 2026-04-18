package identity

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// User represents a registered API consumer.
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	Roles        []string  `json:"roles"`
	CreatedAt    time.Time `json:"createdAt"`
	Active       bool      `json:"active"`
}

// Provider is a built-in identity provider for API consumers.
type Provider struct {
	mu    sync.RWMutex
	users map[string]*User // id -> user
	byEmail map[string]string // email -> id
}

// New creates a new identity provider.
func New() *Provider {
	return &Provider{
		users:   make(map[string]*User),
		byEmail: make(map[string]string),
	}
}

// Register creates a new user.
func (p *Provider) Register(email, name, password string, roles []string) (*User, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if _, exists := p.byEmail[email]; exists {
		return nil, fmt.Errorf("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	id := generateID()
	user := &User{
		ID:           id,
		Email:        email,
		Name:         name,
		PasswordHash: string(hash),
		Roles:        roles,
		CreatedAt:    time.Now(),
		Active:       true,
	}

	p.users[id] = user
	p.byEmail[email] = id
	return user, nil
}

// Authenticate validates credentials and returns the user.
func (p *Provider) Authenticate(email, password string) (*User, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	id, ok := p.byEmail[email]
	if !ok {
		return nil, fmt.Errorf("invalid credentials")
	}

	user := p.users[id]
	if !user.Active {
		return nil, fmt.Errorf("account disabled")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	return user, nil
}

// GetUser returns a user by ID.
func (p *Provider) GetUser(id string) (*User, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	u, ok := p.users[id]
	return u, ok
}

// ServeHTTP handles identity API requests.
func (p *Provider) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	rw.Header().Set("Content-Type", "application/json")

	switch req.Method {
	case http.MethodPost:
		var input struct {
			Email    string   `json:"email"`
			Name     string   `json:"name"`
			Password string   `json:"password"`
			Roles    []string `json:"roles"`
		}
		if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
			http.Error(rw, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}
		user, err := p.Register(input.Email, input.Name, input.Password, input.Roles)
		if err != nil {
			http.Error(rw, fmt.Sprintf(`{"error":"%s"}`, err), http.StatusConflict)
			return
		}
		rw.WriteHeader(http.StatusCreated)
		json.NewEncoder(rw).Encode(user)
	default:
		http.Error(rw, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
