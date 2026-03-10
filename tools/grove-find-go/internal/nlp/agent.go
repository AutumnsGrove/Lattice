package nlp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// DefaultMaxRounds is the default maximum number of agentic loop iterations.
const DefaultMaxRounds = 7

// systemPromptTemplate is the static portion of the system prompt.
const systemPromptTemplate = `You are a codebase search assistant for a monorepo called Lattice.

Given a natural language description, use the provided tools to find the relevant files and code. Return specific file paths and a brief description of what you found.

Rules:
- Start with the most likely location based on the codebase map below
- Use grep_search for content, find_files for file names, list_directory to explore
- If a search returns nothing, try alternative keywords or broader patterns
- Keep pattern arguments short and specific
- If nothing matches after thorough searching, call give_up with what you tried
- When you find it, respond with the file path(s) and a one-sentence description
- Do not guess file paths. Only report paths from search results.

%s`

// AgentOptions configures the agentic loop.
type AgentOptions struct {
	MaxRounds  int
	Verbose    bool
	OnStatus   func(round int, maxRounds int, status string) // called on each round for UI feedback
}

// AgentResult holds the outcome of the agentic search loop.
type AgentResult struct {
	Answer    string          // final model answer (empty if give_up)
	Files     []string        // file paths extracted from the answer
	Rounds    int             // number of rounds executed
	ToolCalls []ToolCallLog   // log of all tool calls made
	GaveUp    bool            // true if the model called give_up
	GiveUp    *GiveUpResult   // populated when GaveUp is true
}

// ToolCallLog records a single tool call for output.
type ToolCallLog struct {
	Tool        string `json:"tool"`
	Args        any    `json:"args"`
	ResultCount int    `json:"result_count"`
}

// RunAgent executes the agentic search loop.
func RunAgent(ctx context.Context, client *Client, query string, opts AgentOptions) (*AgentResult, error) {
	if opts.MaxRounds <= 0 {
		opts.MaxRounds = DefaultMaxRounds
	}

	codebaseMap := BuildCodebaseMap()
	systemPrompt := fmt.Sprintf(systemPromptTemplate, codebaseMap)
	tools := ToolDefs()

	messages := []Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: query},
	}

	var allToolCalls []ToolCallLog
	seenCalls := make(map[string]bool) // for duplicate detection
	emptyRounds := 0

	for round := 1; round <= opts.MaxRounds; round++ {
		if opts.OnStatus != nil {
			opts.OnStatus(round, opts.MaxRounds, "Thinking...")
		}

		resp, err := client.ChatCompletion(ctx, ChatRequest{
			Messages: messages,
			Tools:    tools,
		})
		if err != nil {
			return nil, fmt.Errorf("round %d: %w", round, err)
		}

		choice := resp.Choices[0]

		// Natural stop: model has an answer
		if choice.FinishReason == "stop" || (choice.FinishReason != "tool_calls" && choice.Message.Content != "") {
			return &AgentResult{
				Answer:    choice.Message.Content,
				Files:     extractFilePaths(choice.Message.Content),
				Rounds:    round,
				ToolCalls: allToolCalls,
			}, nil
		}

		// No tool calls and no content: unexpected
		if len(choice.Message.ToolCalls) == 0 {
			return &AgentResult{
				Answer:    choice.Message.Content,
				Files:     extractFilePaths(choice.Message.Content),
				Rounds:    round,
				ToolCalls: allToolCalls,
			}, nil
		}

		// Execute tool calls
		// Append the assistant message with tool calls (required by the protocol)
		messages = append(messages, Message{
			Role:      "assistant",
			ToolCalls: choice.Message.ToolCalls,
		})

		roundAllEmpty := true
		for _, tc := range choice.Message.ToolCalls {
			// Duplicate detection
			callSig := tc.Function.Name + ":" + tc.Function.Arguments
			if seenCalls[callSig] {
				messages = append(messages, Message{
					Role:       "tool",
					ToolCallID: tc.ID,
					Content:    "You already tried this exact search. Try different terms, a broader pattern, or call give_up if nothing matches.",
				})
				continue
			}
			seenCalls[callSig] = true

			if opts.OnStatus != nil {
				opts.OnStatus(round, opts.MaxRounds, formatToolStatus(tc))
			}

			result := ExecuteToolCall(tc)

			// Log the call
			var parsedArgs any
			json.Unmarshal([]byte(tc.Function.Arguments), &parsedArgs)
			resultLines := len(strings.Split(strings.TrimSpace(result.Content), "\n"))
			if result.Content == "(no matches)" || result.Content == "(no files found)" || result.Content == "(empty directory)" {
				resultLines = 0
			}
			allToolCalls = append(allToolCalls, ToolCallLog{
				Tool:        tc.Function.Name,
				Args:        parsedArgs,
				ResultCount: resultLines,
			})

			// Handle give_up
			if result.IsGiveUp {
				return &AgentResult{
					Rounds:    round,
					ToolCalls: allToolCalls,
					GaveUp:    true,
					GiveUp:    result.GiveUp,
				}, nil
			}

			if resultLines > 0 {
				roundAllEmpty = false
			}

			messages = append(messages, Message{
				Role:       "tool",
				ToolCallID: tc.ID,
				Content:    result.Content,
			})
		}

		if roundAllEmpty {
			emptyRounds++
		} else {
			emptyRounds = 0
		}

		// Empty result escalation: after 5 consecutive empty rounds, hint to give up
		if emptyRounds >= 5 {
			messages = append(messages, Message{
				Role:    "system",
				Content: "All recent searches have returned empty. Call give_up with what you tried, or try a completely different approach.",
			})
		}
	}

	// Max rounds exceeded: force the model to summarize
	messages = append(messages, Message{
		Role:    "system",
		Content: "Maximum search rounds reached. Summarize what you found so far. If you found nothing, say so.",
	})

	resp, err := client.ChatCompletion(ctx, ChatRequest{
		Messages: messages,
		// No tools on the final call — force a text response
	})
	if err != nil {
		return &AgentResult{
			Answer:    "Search reached maximum rounds without a conclusive answer.",
			Rounds:    opts.MaxRounds,
			ToolCalls: allToolCalls,
		}, nil
	}

	return &AgentResult{
		Answer:    resp.Choices[0].Message.Content,
		Files:     extractFilePaths(resp.Choices[0].Message.Content),
		Rounds:    opts.MaxRounds,
		ToolCalls: allToolCalls,
	}, nil
}

// formatToolStatus returns a human-readable status for a tool call.
func formatToolStatus(tc ToolCall) string {
	var args map[string]any
	json.Unmarshal([]byte(tc.Function.Arguments), &args)

	switch tc.Function.Name {
	case "grep_search":
		pattern, _ := args["pattern"].(string)
		parts := []string{fmt.Sprintf("grep_search(%q", pattern)}
		if ft, ok := args["file_type"].(string); ok && ft != "" {
			parts = append(parts, fmt.Sprintf("type: %s", ft))
		}
		if p, ok := args["path"].(string); ok && p != "" {
			parts = append(parts, fmt.Sprintf("path: %q", p))
		}
		return strings.Join(parts, ", ") + ")"
	case "find_files":
		pattern, _ := args["pattern"].(string)
		return fmt.Sprintf("find_files(%q)", pattern)
	case "find_by_glob":
		return fmt.Sprintf("find_by_glob(%v)", args["globs"])
	case "list_directory":
		path, _ := args["path"].(string)
		return fmt.Sprintf("list_directory(%q)", path)
	case "give_up":
		return "give_up"
	default:
		return tc.Function.Name
	}
}

// extractFilePaths finds file-path-like strings in the model's answer.
// It scans each line for tokens that look like relative paths (contain "/" and a file extension).
func extractFilePaths(text string) []string {
	if text == "" {
		return nil
	}

	var paths []string
	seen := make(map[string]bool)

	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		// Strip common markdown list markers
		line = strings.TrimPrefix(line, "- ")
		line = strings.TrimPrefix(line, "* ")
		line = strings.TrimSpace(line)

		// Try the whole line first (after stripping backticks)
		cleaned := strings.TrimPrefix(line, "`")
		cleaned = strings.TrimSuffix(cleaned, "`")
		cleaned = strings.TrimSpace(cleaned)
		if looksLikeFilePath(cleaned) && !seen[cleaned] {
			seen[cleaned] = true
			paths = append(paths, cleaned)
			continue
		}

		// Scan individual tokens for embedded paths
		for _, token := range strings.Fields(line) {
			token = strings.TrimPrefix(token, "`")
			token = strings.TrimSuffix(token, "`")
			token = strings.TrimSuffix(token, ",")
			token = strings.TrimSuffix(token, ".")
			token = strings.TrimSuffix(token, ")")
			token = strings.TrimPrefix(token, "(")
			if looksLikeFilePath(token) && !seen[token] {
				seen[token] = true
				paths = append(paths, token)
			}
		}
	}

	return paths
}

// looksLikeFilePath returns true if the string resembles a relative file path.
func looksLikeFilePath(s string) bool {
	if s == "" || len(s) > 200 {
		return false
	}
	// Must contain a slash and a dot (extension)
	if !strings.Contains(s, "/") || !strings.Contains(s, ".") {
		return false
	}
	// Should not contain spaces (file paths rarely do in codebases)
	if strings.Contains(s, " ") {
		return false
	}
	// Should not start with http
	if strings.HasPrefix(s, "http") {
		return false
	}
	return true
}
