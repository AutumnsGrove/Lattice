package todoist

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const (
	restBaseURL = "https://api.todoist.com/api/v1"
	syncBaseURL = "https://api.todoist.com/api/v1"
	userAgent   = "gw-cli/1.0 (Grove Wrap)"
)

// Client is an HTTP client for the Todoist API.
type Client struct {
	token      string
	httpClient *http.Client
}

// NewClient creates a Todoist client with the given API token.
func NewClient(token string) *Client {
	return &Client{
		token: token,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// restGet performs a GET request against the REST v2 API.
func (c *Client) restGet(path string, params url.Values) ([]byte, error) {
	fullURL := restBaseURL + path
	if len(params) > 0 {
		fullURL += "?" + params.Encode()
	}

	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s failed: %w", path, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if err := checkStatus(resp.StatusCode, body); err != nil {
		return nil, fmt.Errorf("GET %s: %w", path, err)
	}
	return body, nil
}

// restPost performs a POST request with a JSON body against the REST v2 API.
func (c *Client) restPost(path string, payload any) ([]byte, error) {
	var bodyReader io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequest("POST", restBaseURL+path, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	c.setHeaders(req)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("POST %s failed: %w", path, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if err := checkStatus(resp.StatusCode, body); err != nil {
		return nil, fmt.Errorf("POST %s: %w", path, err)
	}
	return body, nil
}

// restDelete performs a DELETE request against the REST v2 API.
func (c *Client) restDelete(path string) error {
	req, err := http.NewRequest("DELETE", restBaseURL+path, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	c.setHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("DELETE %s failed: %w", path, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		if err := checkStatus(resp.StatusCode, body); err != nil {
			return fmt.Errorf("DELETE %s: %w", path, err)
		}
	}
	return nil
}

// syncBatch sends a batch of commands to the Sync v9 API.
func (c *Client) syncBatch(commands []SyncCommand) (*SyncResponse, error) {
	payload := map[string]any{
		"commands": commands,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal sync commands: %w", err)
	}

	req, err := http.NewRequest("POST", syncBaseURL+"/sync", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	c.setHeaders(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sync batch failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if err := checkStatus(resp.StatusCode, body); err != nil {
		return nil, fmt.Errorf("sync batch: %w", err)
	}

	var result SyncResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse sync response: %w", err)
	}
	return &result, nil
}

// setHeaders applies auth and user-agent headers to a request.
func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("User-Agent", userAgent)
}

// checkStatus returns a descriptive error for non-2xx status codes.
func checkStatus(code int, body []byte) error {
	if code >= 200 && code < 300 {
		return nil
	}

	snippet := string(body)
	if len(snippet) > 200 {
		snippet = snippet[:200] + "..."
	}

	switch {
	case code == http.StatusUnauthorized:
		return fmt.Errorf("unauthorized (401): check your API token")
	case code == http.StatusTooManyRequests:
		return fmt.Errorf("rate limited (429): too many requests, try again later")
	case code >= 500:
		return fmt.Errorf("server error (%d): %s", code, snippet)
	default:
		return fmt.Errorf("API error (%d): %s", code, snippet)
	}
}

// newUUID generates a random UUID v4 string.
func newUUID() string {
	var uuid [16]byte
	_, _ = rand.Read(uuid[:])
	uuid[6] = (uuid[6] & 0x0f) | 0x40 // version 4
	uuid[8] = (uuid[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:16])
}
