package portal

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthRequired_BlocksUnauthenticatedWrite(t *testing.T) {
	h := NewHandler(Config{Enabled: true, AuthRequired: true, AuthSecret: "secret123"})

	body := `{"email":"test@example.com","name":"Test"}`
	req := httptest.NewRequest(http.MethodPost, "/portal/api/developers", bytes.NewBufferString(body))
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

func TestAuthRequired_AllowsAuthenticatedWrite(t *testing.T) {
	h := NewHandler(Config{Enabled: true, AuthRequired: true, AuthSecret: "secret123"})

	body := `{"email":"test@example.com","name":"Test"}`
	req := httptest.NewRequest(http.MethodPost, "/portal/api/developers", bytes.NewBufferString(body))
	req.Header.Set("Authorization", "Bearer secret123")
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rr.Code)
	}
}

func TestAuthRequired_AllowsUnauthenticatedRead(t *testing.T) {
	h := NewHandler(Config{Enabled: true, AuthRequired: true, AuthSecret: "secret123"})

	req := httptest.NewRequest(http.MethodGet, "/portal/api/catalog", nil)
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestAPIKey_NotReturnedInListing(t *testing.T) {
	h := NewHandler(Config{Enabled: true, AuthRequired: false})

	// Register developer.
	body := `{"email":"dev@example.com","name":"Dev"}`
	req := httptest.NewRequest(http.MethodPost, "/portal/api/developers", bytes.NewBufferString(body))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	var dev struct{ ID string }
	json.NewDecoder(rr.Body).Decode(&dev)

	// Create key.
	req = httptest.NewRequest(http.MethodPost, "/portal/api/developers/"+dev.ID+"/keys", nil)
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rr.Code)
	}

	var keyResp map[string]string
	json.NewDecoder(rr.Body).Decode(&keyResp)
	if keyResp["key"] == "" {
		t.Error("expected key in creation response")
	}

	// List keys — should NOT contain full key.
	req = httptest.NewRequest(http.MethodGet, "/portal/api/developers/"+dev.ID+"/keys", nil)
	rr = httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	body2 := rr.Body.String()
	if bytes.Contains([]byte(body2), []byte(keyResp["key"])) {
		t.Error("full key should not appear in listing")
	}
}

func TestInvalidEmail_Rejected(t *testing.T) {
	h := NewHandler(Config{Enabled: true})

	body := `{"email":"notanemail","name":"Test"}`
	req := httptest.NewRequest(http.MethodPost, "/portal/api/developers", bytes.NewBufferString(body))
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}
