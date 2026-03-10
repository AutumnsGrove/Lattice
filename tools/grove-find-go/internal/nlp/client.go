// Package nlp provides the natural language search layer for gf ask.
// It communicates with a local LLM (via LM Studio's OpenAI-compatible API)
// to translate natural language queries into structured codebase searches.
package nlp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ---------- OpenAI-compatible types ----------

// Message represents a chat message in the OpenAI format.
type Message struct {
	Role       string     `json:"role"`
	Content    string     `json:"content,omitempty"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

// ToolCall represents a function call requested by the model.
type ToolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Function FunctionCall `json:"function"`
}

// FunctionCall holds the function name and JSON-encoded arguments.
type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// ChatRequest is the POST body for /v1/chat/completions.
type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Tools    []Tool    `json:"tools,omitempty"`
	Stream   bool      `json:"stream,omitempty"`
}

// ChatResponse is the parsed response from /v1/chat/completions.
type ChatResponse struct {
	Choices []Choice `json:"choices"`
}

// Choice holds one completion result.
type Choice struct {
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Tool defines a function the model can call.
type Tool struct {
	Type     string         `json:"type"`
	Function ToolDefinition `json:"function"`
}

// ToolDefinition holds the function schema.
type ToolDefinition struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Parameters  any    `json:"parameters"`
}

// ModelsResponse is the parsed response from GET /v1/models.
type ModelsResponse struct {
	Data []ModelInfo `json:"data"`
}

// ModelInfo describes a single model in the models list.
type ModelInfo struct {
	ID string `json:"id"`
}

// ---------- Client ----------

// Client communicates with an OpenAI-compatible LLM API (e.g. LM Studio).
type Client struct {
	endpoint   string
	model      string
	httpClient *http.Client
}

// NewClient creates a client for the given endpoint and model.
func NewClient(endpoint, model string, timeout time.Duration) *Client {
	return &Client{
		endpoint: endpoint,
		model:    model,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// ChatCompletion sends a chat completion request and returns the parsed response.
func (c *Client) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	if req.Model == "" {
		req.Model = c.model
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LLM API returned %d: %s", resp.StatusCode, truncate(string(respBody), 200))
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("LLM returned no choices")
	}

	return &chatResp, nil
}

// ListModels returns the IDs of models available at the endpoint.
func (c *Client) ListModels(ctx context.Context) ([]string, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, c.endpoint+"/models", nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("models endpoint returned %d", resp.StatusCode)
	}

	var modelsResp ModelsResponse
	if err := json.NewDecoder(resp.Body).Decode(&modelsResp); err != nil {
		return nil, fmt.Errorf("parse models: %w", err)
	}

	ids := make([]string, len(modelsResp.Data))
	for i, m := range modelsResp.Data {
		ids[i] = m.ID
	}
	return ids, nil
}

// IsHealthy returns true if the LLM server is reachable.
func (c *Client) IsHealthy(ctx context.Context) bool {
	_, err := c.ListModels(ctx)
	return err == nil
}

// truncate cuts a string to maxLen and adds "..." if truncated.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
