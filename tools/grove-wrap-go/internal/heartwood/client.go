// Package heartwood provides an API client for the Heartwood auth service.
//
// It implements the RFC 8628 Device Authorization Grant flow for CLI login,
// plus session management (user info, session revocation).
package heartwood

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DefaultBaseURL is the production Heartwood auth API.
const DefaultBaseURL = "https://auth-api.grove.place"

// DefaultClientID is the OAuth client ID for the CLI.
const DefaultClientID = "grove-cli"

// DeviceCodeResponse is the server's response to a device code request.
type DeviceCodeResponse struct {
	DeviceCode              string `json:"device_code"`
	UserCode                string `json:"user_code"`
	VerificationURI         string `json:"verification_uri"`
	VerificationURIComplete string `json:"verification_uri_complete"`
	ExpiresIn               int    `json:"expires_in"`
	Interval                int    `json:"interval"`
}

// TokenResponse is a successful token exchange response.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

// DeviceCodeError represents an RFC 8628 error response during polling.
type DeviceCodeError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
	Interval         int    `json:"interval,omitempty"`
}

// User represents a Heartwood user profile.
type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
	Image string `json:"image,omitempty"`
	Role  string `json:"role"`
}

// Session wraps a user with session metadata.
type Session struct {
	User      User   `json:"user"`
	ExpiresAt string `json:"expiresAt"`
}

// Client is an HTTP client for the Heartwood auth API.
type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

// NewClient creates a Heartwood client with an optional bearer token.
func NewClient(baseURL, token string) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// RequestDeviceCode initiates the device authorization flow (RFC 8628).
func (c *Client) RequestDeviceCode(clientID string) (*DeviceCodeResponse, error) {
	if clientID == "" {
		clientID = DefaultClientID
	}

	body, _ := json.Marshal(map[string]string{"client_id": clientID})
	req, err := http.NewRequest("POST", c.baseURL+"/auth/device-code", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to request device code: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readAPIError(resp)
	}

	var result DeviceCodeResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse device code response: %w", err)
	}
	return &result, nil
}

// PollDeviceCode polls the token endpoint for a device code grant.
// Returns (token, nil, nil) on success, (nil, deviceErr, nil) for RFC 8628 errors,
// or (nil, nil, err) for unexpected failures.
func (c *Client) PollDeviceCode(deviceCode, clientID string) (*TokenResponse, *DeviceCodeError, error) {
	if clientID == "" {
		clientID = DefaultClientID
	}

	form := url.Values{
		"grant_type":  {"urn:ietf:params:oauth:grant-type:device_code"},
		"device_code": {deviceCode},
		"client_id":   {clientID},
	}

	req, err := http.NewRequest("POST", c.baseURL+"/token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to poll device code: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Successful token exchange
	if resp.StatusCode == http.StatusOK {
		var token TokenResponse
		if err := json.Unmarshal(data, &token); err != nil {
			return nil, nil, fmt.Errorf("failed to parse token response: %w", err)
		}
		return &token, nil, nil
	}

	// RFC 8628 error response (400 with error code)
	var dce DeviceCodeError
	if err := json.Unmarshal(data, &dce); err == nil && dce.Error != "" {
		return nil, &dce, nil
	}

	return nil, nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(data))
}

// GetUserInfo retrieves the authenticated user's profile.
func (c *Client) GetUserInfo() (*User, error) {
	req, err := http.NewRequest("GET", c.baseURL+"/userinfo", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	c.setAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readAPIError(resp)
	}

	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}
	return &user, nil
}

// GetSession retrieves the current session info.
func (c *Client) GetSession() (*Session, error) {
	req, err := http.NewRequest("GET", c.baseURL+"/api/auth/session", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	c.setAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readAPIError(resp)
	}

	var session Session
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return nil, fmt.Errorf("failed to parse session: %w", err)
	}
	return &session, nil
}

// RevokeSession revokes the current session on the server.
func (c *Client) RevokeSession() error {
	req, err := http.NewRequest("POST", c.baseURL+"/session/revoke", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	c.setAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return readAPIError(resp)
	}
	return nil
}

// setAuth adds the Bearer token header if a token is set.
func (c *Client) setAuth(req *http.Request) {
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
}

// readAPIError reads an error response body and returns a formatted error.
func readAPIError(resp *http.Response) error {
	body, _ := io.ReadAll(resp.Body)
	if len(body) > 0 {
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}
	return fmt.Errorf("API error %d", resp.StatusCode)
}
