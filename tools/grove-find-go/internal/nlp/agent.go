package nlp

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

// DefaultMaxRounds is the default maximum number of agentic loop iterations.
const DefaultMaxRounds = 14

// hybridSystemPromptTemplate is used when vector search results are available.
// Designed for small models (1-4B params): present candidates, model just verifies.
const hybridSystemPromptTemplate = `You are a codebase search assistant. The user asked: %q

CANDIDATE FILES (from semantic search, most relevant first):
%s

TASK: Verify which candidates match the query. Use grep_search with a SHORT keyword (one word) from the query to check the top candidates.

IMPORTANT:
- grep_search keyword must be ONE word, not a phrase. Example: "seasonal colors" → grep "season"
- Only use list_directory on DIRECTORIES, never on file paths
- If candidates look right, answer with those file paths
- If candidates are wrong, use vector_search with different terms

OUTPUT: File paths and one-line descriptions only.

%s`

// fallbackSystemPromptTemplate is the prompt for pure agent mode (no index).
const fallbackSystemPromptTemplate = `You are a codebase search assistant for a TypeScript/Svelte monorepo called Lattice.

Find the files that match the user's description.

STRATEGY:
1. Extract keywords from the query. Search ONE keyword at a time.
2. Use SHORT keywords. "glassmorphism card" → search "glass". "rate limiting" → search "rate".
3. Try singular AND plural. "icons" → also try "icon".
4. Check the CODEBASE MAP — if a directory name matches, use list_directory.

CODEBASE MAP:
- apps/ = web pages. workers/ = background jobs. services/ = APIs.
- libs/engine/src/lib/ = most business logic (subdirs listed below)
- Other libs: foliage=themes, prism=colors, gossamer=ascii-effects, vineyard=UI-components

OUTPUT: File paths and one-line descriptions only. Do not guess paths.

%s`

// AgentOptions configures the agentic loop.
type AgentOptions struct {
	MaxRounds     int
	Verbose       bool
	VerboseWriter io.Writer // where to print verbose output (defaults to os.Stderr)
	OnStatus      func(round int, maxRounds int, status string) // called on each round for UI feedback
	Index         *Index         // optional: vector index for hybrid mode
	NoVectors     bool           // when true, skip vector search even if index is available
	Filter        *QueryFilter   // optional: restrict vector search to matching entries
	Pricing       *ModelPricing  // optional: for cost tracking (cloud mode)
}

// AgentResult holds the outcome of the agentic search loop.
type AgentResult struct {
	Answer           string        // final model answer (empty if give_up)
	Files            []string      // file paths extracted from the answer
	Rounds           int           // number of rounds executed
	ToolCalls        []ToolCallLog // log of all tool calls made
	GaveUp           bool          // true if the model called give_up
	GiveUp           *GiveUpResult // populated when GaveUp is true
	UsedIndex        bool          // true if vector index was used
	PromptTokens     int           // total prompt tokens across all rounds
	CompletionTokens int           // total completion tokens across all rounds
	Cost             float64       // estimated cost in USD (cloud mode only)
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
	if opts.VerboseWriter == nil {
		opts.VerboseWriter = os.Stderr
	}

	useIndex := opts.Index != nil && !opts.NoVectors
	codebaseMap := BuildCodebaseMap()

	// Build system prompt and tool set based on mode
	var systemPrompt string
	var tools []Tool
	var toolCtx *ToolContext

	if useIndex {
		// Hybrid mode: pre-search vectors and embed results in prompt
		vectorResults := preSearchVectors(ctx, client, opts.Index, query, opts.Filter)
		systemPrompt = fmt.Sprintf(hybridSystemPromptTemplate, query, vectorResults, codebaseMap)
		tools = HybridToolDefs()
		toolCtx = &ToolContext{
			Ctx:    ctx,
			Index:  opts.Index,
			Client: client,
			Filter: opts.Filter,
		}
	} else {
		// Fallback mode: pure agent (no vectors)
		systemPrompt = fmt.Sprintf(fallbackSystemPromptTemplate, codebaseMap)
		tools = FallbackToolDefs()
		toolCtx = nil
	}

	if opts.Verbose {
		fmt.Fprintf(opts.VerboseWriter, "\n--- System Prompt ---\n%s\n--- End System Prompt ---\n\n", systemPrompt)
	}

	messages := []Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: query},
	}

	// In hybrid mode, the agent has pre-loaded candidates — fewer required searches
	minToolCalls := 6
	if useIndex {
		minToolCalls = 2
	}

	var allToolCalls []ToolCallLog
	seenCalls := make(map[string]bool) // for duplicate detection
	emptyRounds := 0
	nudgedOnce := false // only nudge once to avoid infinite loops
	totalPromptTokens := 0
	totalCompletionTokens := 0

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

		// Track token usage
		if resp.Usage != nil {
			totalPromptTokens += resp.Usage.PromptTokens
			totalCompletionTokens += resp.Usage.CompletionTokens
		}

		choice := resp.Choices[0]

		// Natural stop: model has an answer
		if choice.FinishReason == "stop" || (choice.FinishReason != "tool_calls" && choice.Message.Content != "") {
			// If the model hasn't done enough searching, push it back
			searchCount := countSearchCalls(allToolCalls)
			if searchCount < minToolCalls && !nudgedOnce {
				nudgedOnce = true
				messages = append(messages, Message{
					Role:    "assistant",
					Content: choice.Message.Content,
				})
				if useIndex {
					messages = append(messages, Message{
						Role:    "user",
						Content: fmt.Sprintf("You only tried %d search(es). Use grep_search to verify at least one file from the vector results before answering.", searchCount),
					})
				} else {
					messages = append(messages, Message{
						Role:    "user",
						Content: fmt.Sprintf("You only tried %d search(es). Try at least %d. Check the codebase map for matching directory names, try shorter keywords (single words), and explore apps/, workers/, services/ with list_directory.", searchCount, minToolCalls),
					})
				}
				continue
			}
			return &AgentResult{
				Answer:           choice.Message.Content,
				Files:            extractFilePaths(choice.Message.Content),
				Rounds:           round,
				ToolCalls:        allToolCalls,
				UsedIndex:        useIndex,
				PromptTokens:     totalPromptTokens,
				CompletionTokens: totalCompletionTokens,
				Cost:             computeCost(opts.Pricing, totalPromptTokens, totalCompletionTokens),
			}, nil
		}

		// No tool calls and no content: unexpected
		if len(choice.Message.ToolCalls) == 0 {
			return &AgentResult{
				Answer:           choice.Message.Content,
				Files:            extractFilePaths(choice.Message.Content),
				Rounds:           round,
				ToolCalls:        allToolCalls,
				UsedIndex:        useIndex,
				PromptTokens:     totalPromptTokens,
				CompletionTokens: totalCompletionTokens,
				Cost:             computeCost(opts.Pricing, totalPromptTokens, totalCompletionTokens),
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

			result := ExecuteToolCall(tc, toolCtx)

			// Log the call
			var parsedArgs any
			json.Unmarshal([]byte(tc.Function.Arguments), &parsedArgs)
			resultLines := len(strings.Split(strings.TrimSpace(result.Content), "\n"))
			if result.Content == "(no matches)" || result.Content == "(no files found)" || result.Content == "(empty directory)" || result.Content == "(no matches in vector index)" {
				resultLines = 0
			}
			allToolCalls = append(allToolCalls, ToolCallLog{
				Tool:        tc.Function.Name,
				Args:        parsedArgs,
				ResultCount: resultLines,
			})

			// Handle give_up — block if model hasn't searched enough yet
			if result.IsGiveUp {
				searchCount := countSearchCalls(allToolCalls)
				if searchCount < minToolCalls {
					// Replace the give_up result with a nudge to keep searching
					if useIndex {
						messages = append(messages, Message{
							Role:       "tool",
							ToolCallID: tc.ID,
							Content:    fmt.Sprintf("Do NOT give up yet. You have only tried %d search(es). Look at the VECTOR SEARCH RESULTS at the top of this conversation — pick files from there and use grep_search to verify them.", searchCount),
						})
					} else {
						messages = append(messages, Message{
							Role:       "tool",
							ToolCallID: tc.ID,
							Content:    fmt.Sprintf("Do NOT give up yet. You have only tried %d search(es) — try at least %d. Try these strategies:\n- Look at the codebase map for matching directory names\n- grep_search with shorter keywords (single words)\n- list_directory on apps/, workers/, services/, or libs/\n- Try singular/plural forms of the keyword", searchCount, minToolCalls),
						})
					}
					continue
				}
				return &AgentResult{
					Rounds:           round,
					ToolCalls:        allToolCalls,
					GaveUp:           true,
					GiveUp:           result.GiveUp,
					UsedIndex:        useIndex,
					PromptTokens:     totalPromptTokens,
					CompletionTokens: totalCompletionTokens,
					Cost:             computeCost(opts.Pricing, totalPromptTokens, totalCompletionTokens),
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
			Answer:           "Search reached maximum rounds without a conclusive answer.",
			Rounds:           opts.MaxRounds,
			ToolCalls:        allToolCalls,
			UsedIndex:        useIndex,
			PromptTokens:     totalPromptTokens,
			CompletionTokens: totalCompletionTokens,
			Cost:             computeCost(opts.Pricing, totalPromptTokens, totalCompletionTokens),
		}, nil
	}

	if resp.Usage != nil {
		totalPromptTokens += resp.Usage.PromptTokens
		totalCompletionTokens += resp.Usage.CompletionTokens
	}

	return &AgentResult{
		Answer:           resp.Choices[0].Message.Content,
		Files:            extractFilePaths(resp.Choices[0].Message.Content),
		Rounds:           opts.MaxRounds,
		ToolCalls:        allToolCalls,
		UsedIndex:        useIndex,
		PromptTokens:     totalPromptTokens,
		CompletionTokens: totalCompletionTokens,
		Cost:             computeCost(opts.Pricing, totalPromptTokens, totalCompletionTokens),
	}, nil
}

// preSearchVectors embeds the query and returns formatted vector search results
// for inclusion in the system prompt. This gives the agent a head start.
func preSearchVectors(ctx context.Context, client *Client, idx *Index, query string, filter *QueryFilter) string {
	vectors, err := client.Embed(ctx, []string{query}, nil)
	if err != nil {
		return "(vector search failed: " + err.Error() + ")"
	}
	if len(vectors) == 0 || len(vectors[0]) == 0 {
		return "(vector search returned empty embedding)"
	}

	results := QueryIndex(idx, vectors[0], 10, filter)
	if len(results) == 0 {
		return "(no matches found in vector index)"
	}

	var lines []string
	for i, r := range results {
		line := fmt.Sprintf("%d. %s", i+1, r.FilePath)
		if r.StartLine > 0 && r.EndLine > r.StartLine {
			line += fmt.Sprintf(":%d-%d", r.StartLine, r.EndLine)
		}
		line += fmt.Sprintf(" (score: %.3f)", r.Score)
		if r.Snippet != "" {
			snippet := r.Snippet
			if len(snippet) > 120 {
				snippet = snippet[:120] + "..."
			}
			line += "\n   " + snippet
		}
		lines = append(lines, line)
	}

	return strings.Join(lines, "\n")
}

// computeCost calculates the estimated cost based on pricing and token counts.
func computeCost(pricing *ModelPricing, promptTokens, completionTokens int) float64 {
	if pricing == nil {
		return 0
	}
	return float64(promptTokens)*pricing.PromptCost + float64(completionTokens)*pricing.CompletionCost
}

// countSearchCalls counts actual search tool calls (excludes give_up).
func countSearchCalls(calls []ToolCallLog) int {
	n := 0
	for _, c := range calls {
		if c.Tool != "give_up" {
			n++
		}
	}
	return n
}

// formatToolStatus returns a human-readable status for a tool call.
func formatToolStatus(tc ToolCall) string {
	var args map[string]any
	json.Unmarshal([]byte(tc.Function.Arguments), &args)

	switch tc.Function.Name {
	case "vector_search":
		query, _ := args["query"].(string)
		return fmt.Sprintf("vector_search(%q)", query)
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
