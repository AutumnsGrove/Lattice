package heartwood

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

// newTestServer creates a test HTTP server that simulates Heartwood endpoints.
func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	mux := http.NewServeMux()

	// POST /auth/device-code
	mux.HandleFunc("/auth/device-code", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if body["client_id"] == "" {
			http.Error(w, `{"error":"invalid_client"}`, http.StatusBadRequest)
			return
		}
		json.NewEncoder(w).Encode(DeviceCodeResponse{
			DeviceCode:      "test-device-code",
			UserCode:        "ABCD-1234",
			VerificationURI: "https://auth.grove.place/auth/device",
			ExpiresIn:       900,
			Interval:        5,
		})
	})

	// POST /token
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		r.ParseForm()
		deviceCode := r.FormValue("device_code")

		switch deviceCode {
		case "authorized":
			json.NewEncoder(w).Encode(TokenResponse{
				AccessToken: "test-access-token",
				TokenType:   "bearer",
				ExpiresIn:   3600,
			})
		case "denied":
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(DeviceCodeError{
				Error:            "access_denied",
				ErrorDescription: "The user denied the request",
			})
		case "expired":
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(DeviceCodeError{
				Error:            "expired_token",
				ErrorDescription: "The device code has expired",
			})
		case "slow":
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(DeviceCodeError{
				Error:            "slow_down",
				ErrorDescription: "Polling too frequently",
				Interval:         10,
			})
		default:
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(DeviceCodeError{
				Error:            "authorization_pending",
				ErrorDescription: "The user has not yet authorized",
			})
		}
	})

	// GET /userinfo
	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-access-token" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		json.NewEncoder(w).Encode(User{
			ID:    "user-123",
			Email: "autumn@grove.place",
			Name:  "Autumn",
			Role:  "wayfinder",
		})
	})

	// POST /session/revoke
	mux.HandleFunc("/session/revoke", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		auth := r.Header.Get("Authorization")
		if auth == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	return httptest.NewServer(mux)
}

func TestRequestDeviceCode(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "")

	dc, err := client.RequestDeviceCode("grove-cli")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dc.DeviceCode != "test-device-code" {
		t.Errorf("expected device_code 'test-device-code', got %q", dc.DeviceCode)
	}
	if dc.UserCode != "ABCD-1234" {
		t.Errorf("expected user_code 'ABCD-1234', got %q", dc.UserCode)
	}
	if dc.Interval != 5 {
		t.Errorf("expected interval 5, got %d", dc.Interval)
	}
}

func TestRequestDeviceCodeNoClientID(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "")

	// Empty string should use default client ID
	dc, err := client.RequestDeviceCode("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dc.DeviceCode == "" {
		t.Error("expected non-empty device code")
	}
}

func TestPollDeviceCodePending(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "")

	token, dce, err := client.PollDeviceCode("pending", "grove-cli")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token != nil {
		t.Error("expected nil token for pending state")
	}
	if dce == nil || dce.Error != "authorization_pending" {
		t.Errorf("expected authorization_pending error, got %+v", dce)
	}
}

func TestPollDeviceCodeSuccess(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "")

	token, dce, err := client.PollDeviceCode("authorized", "grove-cli")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dce != nil {
		t.Errorf("expected nil device code error, got %+v", dce)
	}
	if token == nil || token.AccessToken != "test-access-token" {
		t.Errorf("expected access token, got %+v", token)
	}
}

func TestPollDeviceCodeDenied(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "")

	token, dce, err := client.PollDeviceCode("denied", "grove-cli")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token != nil {
		t.Error("expected nil token for denied state")
	}
	if dce == nil || dce.Error != "access_denied" {
		t.Errorf("expected access_denied error, got %+v", dce)
	}
}

func TestPollDeviceCodeExpired(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "")

	token, dce, err := client.PollDeviceCode("expired", "grove-cli")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token != nil {
		t.Error("expected nil token for expired state")
	}
	if dce == nil || dce.Error != "expired_token" {
		t.Errorf("expected expired_token error, got %+v", dce)
	}
}

func TestPollDeviceCodeSlowDown(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "")

	token, dce, err := client.PollDeviceCode("slow", "grove-cli")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token != nil {
		t.Error("expected nil token for slow_down state")
	}
	if dce == nil || dce.Error != "slow_down" {
		t.Errorf("expected slow_down error, got %+v", dce)
	}
	if dce.Interval != 10 {
		t.Errorf("expected interval 10, got %d", dce.Interval)
	}
}

func TestGetUserInfo(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "test-access-token")

	user, err := client.GetUserInfo()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.Email != "autumn@grove.place" {
		t.Errorf("expected email 'autumn@grove.place', got %q", user.Email)
	}
	if user.Name != "Autumn" {
		t.Errorf("expected name 'Autumn', got %q", user.Name)
	}
	if user.Role != "wayfinder" {
		t.Errorf("expected role 'wayfinder', got %q", user.Role)
	}
}

func TestGetUserInfoUnauthorized(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "invalid-token")

	_, err := client.GetUserInfo()
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
}

func TestRevokeSession(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient(srv.URL, "test-access-token")

	err := client.RevokeSession()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestPollDeviceCodeFormEncoded(t *testing.T) {
	// Verify the request is form-encoded, not JSON
	var receivedContentType string
	var receivedBody url.Values

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedContentType = r.Header.Get("Content-Type")
		r.ParseForm()
		receivedBody = r.Form
		json.NewEncoder(w).Encode(TokenResponse{
			AccessToken: "ok",
			TokenType:   "bearer",
		})
	}))
	defer srv.Close()

	client := NewClient(srv.URL, "")
	client.PollDeviceCode("test-code", "grove-cli")

	if receivedContentType != "application/x-www-form-urlencoded" {
		t.Errorf("expected form-urlencoded, got %q", receivedContentType)
	}
	if receivedBody.Get("grant_type") != "urn:ietf:params:oauth:grant-type:device_code" {
		t.Errorf("unexpected grant_type: %q", receivedBody.Get("grant_type"))
	}
	if receivedBody.Get("device_code") != "test-code" {
		t.Errorf("unexpected device_code: %q", receivedBody.Get("device_code"))
	}
}
