package nlp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestChatCompletion_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/chat/completions" {
			t.Errorf("expected /chat/completions, got %s", r.URL.Path)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}

		// Verify request body
		var req ChatRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("failed to decode request: %v", err)
		}
		if req.Model != "test-model" {
			t.Errorf("expected model test-model, got %s", req.Model)
		}
		if len(req.Messages) != 1 || req.Messages[0].Content != "hello" {
			t.Errorf("unexpected messages: %+v", req.Messages)
		}

		json.NewEncoder(w).Encode(ChatResponse{
			Choices: []Choice{{
				Message:      Message{Role: "assistant", Content: "world"},
				FinishReason: "stop",
			}},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-model", 5*time.Second)
	resp, err := client.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hello"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(resp.Choices) != 1 {
		t.Fatalf("expected 1 choice, got %d", len(resp.Choices))
	}
	if resp.Choices[0].Message.Content != "world" {
		t.Errorf("expected content 'world', got %q", resp.Choices[0].Message.Content)
	}
	if resp.Choices[0].FinishReason != "stop" {
		t.Errorf("expected finish_reason 'stop', got %q", resp.Choices[0].FinishReason)
	}
}

func TestChatCompletion_ToolCalls(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(ChatResponse{
			Choices: []Choice{{
				Message: Message{
					Role: "assistant",
					ToolCalls: []ToolCall{{
						ID:   "call_123",
						Type: "function",
						Function: FunctionCall{
							Name:      "grep_search",
							Arguments: `{"pattern":"icon"}`,
						},
					}},
				},
				FinishReason: "tool_calls",
			}},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-model", 5*time.Second)
	resp, err := client.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "find icons"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Choices[0].FinishReason != "tool_calls" {
		t.Errorf("expected finish_reason 'tool_calls', got %q", resp.Choices[0].FinishReason)
	}
	if len(resp.Choices[0].Message.ToolCalls) != 1 {
		t.Fatalf("expected 1 tool call, got %d", len(resp.Choices[0].Message.ToolCalls))
	}
	tc := resp.Choices[0].Message.ToolCalls[0]
	if tc.Function.Name != "grep_search" {
		t.Errorf("expected grep_search, got %s", tc.Function.Name)
	}
}

func TestChatCompletion_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal error"))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-model", 5*time.Second)
	_, err := client.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hello"}},
	})
	if err == nil {
		t.Fatal("expected error for 500 response")
	}
}

func TestChatCompletion_EmptyChoices(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(ChatResponse{Choices: []Choice{}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-model", 5*time.Second)
	_, err := client.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hello"}},
	})
	if err == nil {
		t.Fatal("expected error for empty choices")
	}
}

func TestListModels(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/models" {
			t.Errorf("expected /models, got %s", r.URL.Path)
		}
		json.NewEncoder(w).Encode(ModelsResponse{
			Data: []ModelInfo{
				{ID: "model-a"},
				{ID: "model-b"},
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-model", 5*time.Second)
	models, err := client.ListModels(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(models) != 2 {
		t.Fatalf("expected 2 models, got %d", len(models))
	}
	if models[0] != "model-a" || models[1] != "model-b" {
		t.Errorf("unexpected models: %v", models)
	}
}

func TestIsHealthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(ModelsResponse{Data: []ModelInfo{{ID: "m"}}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-model", 5*time.Second)
	if !client.IsHealthy(context.Background()) {
		t.Error("expected healthy")
	}

	// Test unhealthy (server closed)
	server.Close()
	if client.IsHealthy(context.Background()) {
		t.Error("expected unhealthy after server close")
	}
}

func TestChatCompletion_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		json.NewEncoder(w).Encode(ChatResponse{
			Choices: []Choice{{Message: Message{Content: "late"}, FinishReason: "stop"}},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-model", 50*time.Millisecond)
	_, err := client.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hello"}},
	})
	if err == nil {
		t.Fatal("expected timeout error")
	}
}

func TestTruncate(t *testing.T) {
	if got := truncate("short", 10); got != "short" {
		t.Errorf("expected 'short', got %q", got)
	}
	if got := truncate("a long string here", 6); got != "a long..." {
		t.Errorf("expected 'a long...', got %q", got)
	}
}
