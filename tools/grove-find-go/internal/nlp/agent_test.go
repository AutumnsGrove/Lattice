package nlp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

// mockServer creates a test server that plays a scripted conversation.
// Each call to the handler returns the next response in the sequence.
func mockServer(t *testing.T, responses []ChatResponse) *httptest.Server {
	t.Helper()
	callIndex := 0
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if callIndex >= len(responses) {
			t.Fatalf("unexpected call %d (only %d responses scripted)", callIndex+1, len(responses))
		}
		resp := responses[callIndex]
		callIndex++
		json.NewEncoder(w).Encode(resp)
	}))
}

func setupTestConfig(t *testing.T) func() {
	t.Helper()
	cfg := config.Get()
	orig := cfg.GroveRoot
	cfg.GroveRoot = t.TempDir()
	return func() { cfg.GroveRoot = orig }
}

func TestRunAgent_DirectAnswer(t *testing.T) {
	cleanup := setupTestConfig(t)
	defer cleanup()

	// The model answers immediately twice: first triggers the "try more searches" nudge,
	// second is accepted (nudge only fires once).
	server := mockServer(t, []ChatResponse{
		{Choices: []Choice{{
			Message:      Message{Role: "assistant", Content: "The file is at libs/engine/src/workshop.ts"},
			FinishReason: "stop",
		}}},
		{Choices: []Choice{{
			Message:      Message{Role: "assistant", Content: "The file is at libs/engine/src/workshop.ts"},
			FinishReason: "stop",
		}}},
	})
	defer server.Close()

	client := NewClient(server.URL, "test", 5*time.Second)
	result, err := RunAgent(context.Background(), client, "find the workshop", AgentOptions{MaxRounds: 7})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Rounds != 2 {
		t.Errorf("expected 2 rounds (1 nudge + 1 answer), got %d", result.Rounds)
	}
	if !strings.Contains(result.Answer, "workshop.ts") {
		t.Errorf("expected answer to mention workshop.ts, got: %s", result.Answer)
	}
	if result.GaveUp {
		t.Error("should not have given up")
	}
}

func TestRunAgent_ToolCallThenAnswer(t *testing.T) {
	cleanup := setupTestConfig(t)
	defer cleanup()

	server := mockServer(t, []ChatResponse{
		// Round 1: model requests a tool call
		{Choices: []Choice{{
			Message: Message{
				Role: "assistant",
				ToolCalls: []ToolCall{{
					ID:   "call_1",
					Type: "function",
					Function: FunctionCall{
						Name:      "give_up",
						Arguments: `{"reason":"nothing found","tried":["grep_search icon"]}`,
					},
				}},
			},
			FinishReason: "tool_calls",
		}}},
	})
	defer server.Close()

	client := NewClient(server.URL, "test", 5*time.Second)
	result, err := RunAgent(context.Background(), client, "find icons", AgentOptions{MaxRounds: 7})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !result.GaveUp {
		t.Error("expected give up")
	}
	if result.GiveUp.Reason != "nothing found" {
		t.Errorf("unexpected reason: %s", result.GiveUp.Reason)
	}
}

func TestRunAgent_MaxRoundsForcesSummary(t *testing.T) {
	cleanup := setupTestConfig(t)
	defer cleanup()

	// Create responses that always return tool calls, never stop
	toolCallResponse := ChatResponse{Choices: []Choice{{
		Message: Message{
			Role: "assistant",
			ToolCalls: []ToolCall{{
				ID:   "call_loop",
				Type: "function",
				Function: FunctionCall{
					Name:      "list_directory",
					Arguments: `{"path":"."}`,
				},
			}},
		},
		FinishReason: "tool_calls",
	}}}

	// 3 rounds of tool calls + 1 forced summary
	responses := []ChatResponse{
		toolCallResponse,
		toolCallResponse,
		toolCallResponse,
		// Final forced summary (no tools provided)
		{Choices: []Choice{{
			Message:      Message{Role: "assistant", Content: "I searched but found nothing conclusive."},
			FinishReason: "stop",
		}}},
	}

	server := mockServer(t, responses)
	defer server.Close()

	client := NewClient(server.URL, "test", 5*time.Second)
	result, err := RunAgent(context.Background(), client, "find something", AgentOptions{MaxRounds: 3})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Rounds != 3 {
		t.Errorf("expected 3 rounds, got %d", result.Rounds)
	}
	if result.GaveUp {
		t.Error("max rounds should not set GaveUp (it forces a summary instead)")
	}
	if result.Answer == "" {
		t.Error("expected a forced summary answer")
	}
}

func TestRunAgent_DuplicateDetection(t *testing.T) {
	cleanup := setupTestConfig(t)
	defer cleanup()

	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount <= 2 {
			// First two calls: same tool call
			json.NewEncoder(w).Encode(ChatResponse{Choices: []Choice{{
				Message: Message{
					Role: "assistant",
					ToolCalls: []ToolCall{{
						ID:   "call_dup",
						Type: "function",
						Function: FunctionCall{
							Name:      "grep_search",
							Arguments: `{"pattern":"icon"}`,
						},
					}},
				},
				FinishReason: "tool_calls",
			}}})
		} else {
			// After duplicate hint, model gives up
			json.NewEncoder(w).Encode(ChatResponse{Choices: []Choice{{
				Message:      Message{Role: "assistant", Content: "Could not find icons."},
				FinishReason: "stop",
			}}})
		}
	}))
	defer server.Close()

	client := NewClient(server.URL, "test", 5*time.Second)
	result, err := RunAgent(context.Background(), client, "find icons", AgentOptions{MaxRounds: 7})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have completed (duplicate detected on round 2, then model answered)
	if result.Answer == "" {
		t.Error("expected an answer after duplicate detection")
	}
}

func TestExtractFilePaths(t *testing.T) {
	tests := []struct {
		name  string
		text  string
		paths []string
	}{
		{
			name:  "simple paths",
			text:  "Found at libs/engine/src/workshop.ts\nand also apps/login/src/routes/+page.svelte",
			paths: []string{"libs/engine/src/workshop.ts", "apps/login/src/routes/+page.svelte"},
		},
		{
			name:  "markdown list",
			text:  "- libs/engine/src/a.ts\n- libs/engine/src/b.ts",
			paths: []string{"libs/engine/src/a.ts", "libs/engine/src/b.ts"},
		},
		{
			name:  "backtick wrapped",
			text:  "`libs/engine/src/workshop.ts`",
			paths: []string{"libs/engine/src/workshop.ts"},
		},
		{
			name:  "ignores urls",
			text:  "See https://example.com/path/to/file.txt for details",
			paths: nil,
		},
		{
			name:  "ignores prose",
			text:  "The icons are defined in the workshop module.",
			paths: nil,
		},
		{
			name:  "deduplicates",
			text:  "libs/a.ts\nlibs/a.ts",
			paths: []string{"libs/a.ts"},
		},
		{
			name:  "empty",
			text:  "",
			paths: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractFilePaths(tt.text)
			if len(got) != len(tt.paths) {
				t.Errorf("expected %d paths, got %d: %v", len(tt.paths), len(got), got)
				return
			}
			for i, p := range tt.paths {
				if got[i] != p {
					t.Errorf("path[%d]: expected %q, got %q", i, p, got[i])
				}
			}
		})
	}
}

func TestLooksLikeFilePath(t *testing.T) {
	trueCases := []string{
		"libs/engine/src/workshop.ts",
		"apps/login/+page.svelte",
		"workers/lumen/src/index.ts",
	}
	falseCases := []string{
		"",
		"just a word",
		"no-slash-here.ts",
		"no/extension/here",
		"has spaces/in/path.ts",
		"https://example.com/file.ts",
		strings.Repeat("a/", 150) + "file.ts", // too long
	}

	for _, c := range trueCases {
		if !looksLikeFilePath(c) {
			t.Errorf("expected %q to look like a file path", c)
		}
	}
	for _, c := range falseCases {
		if looksLikeFilePath(c) {
			t.Errorf("expected %q to NOT look like a file path", c)
		}
	}
}
