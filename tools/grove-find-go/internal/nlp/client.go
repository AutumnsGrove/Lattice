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
	Usage   *Usage   `json:"usage,omitempty"`
}

// Choice holds one completion result.
type Choice struct {
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage holds token counts from the API response.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
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

// ---------- Embedding types ----------

// EmbedRequest is the POST body for /v1/embeddings.
type EmbedRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

// EmbedResponse is the response from /v1/embeddings.
type EmbedResponse struct {
	Data []EmbedData `json:"data"`
}

// EmbedData holds one embedding result.
type EmbedData struct {
	Embedding []float32 `json:"embedding"`
	Index     int       `json:"index"`
}

// ---------- Client ----------

// Client communicates with an OpenAI-compatible LLM API (e.g. LM Studio, OpenRouter).
type Client struct {
	endpoint   string
	model      string
	embedModel string
	apiKey     string  // optional: Bearer token for cloud providers
	localEmbed *Client // optional: separate client for local embeddings (cloud mode)
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

// NewClientWithEmbed creates a client for both chat and embedding models.
func NewClientWithEmbed(endpoint, model, embedModel string, timeout time.Duration) *Client {
	return &Client{
		endpoint:   endpoint,
		model:      model,
		embedModel: embedModel,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// NewCloudClient creates a client for a cloud API (OpenRouter, etc.) with an API key.
// The embedModel is optional — cloud mode typically uses a local embed model.
func NewCloudClient(endpoint, model, apiKey string, timeout time.Duration) *Client {
	return &Client{
		endpoint: endpoint,
		model:    model,
		apiKey:   apiKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// SetEmbedModel overrides the embedding model used for queries.
// This is used to match the model that was used to build the index.
func (c *Client) SetEmbedModel(model string) {
	c.embedModel = model
}

// SetEmbedFrom copies embedding config from another client.
// Used in cloud mode: chat goes to OpenRouter, embeddings go to local LM Studio.
func (c *Client) SetEmbedFrom(local *Client) {
	c.embedModel = local.embedModel
	c.localEmbed = local
}

// embedClient returns the client to use for embedding requests.
// In cloud mode this is the local LM Studio client; otherwise it's self.
func (c *Client) embedClient() *Client {
	if c.localEmbed != nil {
		return c.localEmbed
	}
	return c
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
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

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
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
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

// Embed sends texts to /v1/embeddings and returns their vector representations.
// Batch size is 64 texts per request. Each batch gets a generous 5-minute
// timeout since embedding can be slow for large inputs on smaller GPUs.
// The optional onProgress callback is called after each batch with (done, total) counts.
func (c *Client) Embed(ctx context.Context, texts []string, onProgress func(done, total int)) ([][]float32, error) {
	// Delegate to local embed client if in cloud mode
	ec := c.embedClient()
	return ec.doEmbed(ctx, texts, onProgress)
}

func (c *Client) doEmbed(ctx context.Context, texts []string, onProgress func(done, total int)) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	model := c.embedModel
	if model == "" {
		return nil, fmt.Errorf("no embedding model configured")
	}

	const batchSize = 64
	allEmbeddings := make([][]float32, len(texts))

	for start := 0; start < len(texts); start += batchSize {
		end := start + batchSize
		if end > len(texts) {
			end = len(texts)
		}
		batch := texts[start:end]

		reqBody := EmbedRequest{
			Model: model,
			Input: batch,
		}
		body, err := json.Marshal(reqBody)
		if err != nil {
			return nil, fmt.Errorf("marshal embed request: %w", err)
		}

		// Use a per-batch timeout (5 minutes) since embedding can be slow
		batchCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
		httpReq, err := http.NewRequestWithContext(batchCtx, http.MethodPost, c.endpoint+"/embeddings", bytes.NewReader(body))
		if err != nil {
			cancel()
			return nil, fmt.Errorf("create embed request: %w", err)
		}
		httpReq.Header.Set("Content-Type", "application/json")

		// Use a separate client without the global timeout for embedding
		embedHTTP := &http.Client{Timeout: 0} // context handles timeout
		resp, err := embedHTTP.Do(httpReq)
		if err != nil {
			cancel()
			return nil, fmt.Errorf("embed request failed: %w", err)
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		cancel()
		if err != nil {
			return nil, fmt.Errorf("read embed response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("embed API returned %d: %s", resp.StatusCode, truncate(string(respBody), 200))
		}

		var embedResp EmbedResponse
		if err := json.Unmarshal(respBody, &embedResp); err != nil {
			return nil, fmt.Errorf("parse embed response: %w", err)
		}

		if len(embedResp.Data) != len(batch) {
			return nil, fmt.Errorf("embed returned %d results for %d inputs", len(embedResp.Data), len(batch))
		}

		for _, d := range embedResp.Data {
			allEmbeddings[start+d.Index] = d.Embedding
		}

		if onProgress != nil {
			onProgress(end, len(texts))
		}
	}

	return allEmbeddings, nil
}

// ModelPricing holds per-token pricing for a model.
type ModelPricing struct {
	PromptCost     float64 // cost per token for prompt
	CompletionCost float64 // cost per token for completion
}

// FetchModelPricing queries OpenRouter's /api/v1/models endpoint for pricing.
func FetchModelPricing(ctx context.Context, modelID string) (*ModelPricing, error) {
	url := "https://openrouter.ai/api/v1/models"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("models API returned %d", resp.StatusCode)
	}

	var result struct {
		Data []struct {
			ID      string `json:"id"`
			Pricing struct {
				Prompt     string `json:"prompt"`
				Completion string `json:"completion"`
			} `json:"pricing"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	for _, m := range result.Data {
		if m.ID == modelID {
			promptCost := parseFloat(m.Pricing.Prompt)
			completionCost := parseFloat(m.Pricing.Completion)
			return &ModelPricing{
				PromptCost:     promptCost,
				CompletionCost: completionCost,
			}, nil
		}
	}

	return nil, fmt.Errorf("model %q not found in OpenRouter catalog", modelID)
}

// parseFloat parses a string to float64, returning 0 on error.
func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}

// truncate cuts a string to maxLen and adds "..." if truncated.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
