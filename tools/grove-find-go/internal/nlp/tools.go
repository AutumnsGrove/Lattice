package nlp

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
)

// maxDirEntries caps list_directory output to protect the model's context window.
const maxDirEntries = 100

// defaultMaxResults caps grep_search results returned to the model.
const defaultMaxResults = 20

// ToolContext provides the index and client needed by vector_search.
// When nil or missing fields, vector_search is unavailable and the tool
// returns an error suggesting --index.
type ToolContext struct {
	Ctx    context.Context
	Index  *Index
	Client *Client
}

// HybridToolDefs returns tool definitions for the hybrid (vector + agent) mode.
// The agent gets vector_search as its primary tool plus grep/list_dir for refinement.
func HybridToolDefs() []Tool {
	return []Tool{
		vectorSearchToolDef(),
		grepSearchToolDef(),
		listDirectoryToolDef(),
		giveUpToolDef(),
	}
}

// FallbackToolDefs returns tool definitions for pure agent mode (no index).
// Same as the old tool set: grep, find_files, list_dir, give_up.
func FallbackToolDefs() []Tool {
	return []Tool{
		grepSearchToolDef(),
		findFilesToolDef(),
		listDirectoryToolDef(),
		giveUpToolDef(),
	}
}

func vectorSearchToolDef() Tool {
	return Tool{
		Type: "function",
		Function: ToolDefinition{
			Name:        "vector_search",
			Description: "Semantic search across the codebase. Returns the most relevant files ranked by similarity to your query. This is your primary search tool — use it first.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{
						"type":        "string",
						"description": "Natural language description of what you are looking for",
					},
					"top_n": map[string]any{
						"type":        "integer",
						"description": "Number of results to return (default: 20)",
					},
				},
				"required": []string{"query"},
			},
		},
	}
}

func grepSearchToolDef() Tool {
	return Tool{
		Type: "function",
		Function: ToolDefinition{
			Name:        "grep_search",
			Description: "Search file contents for a regex pattern. Returns matching lines with file paths and line numbers. Use this to refine after vector_search.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"pattern": map[string]any{
						"type":        "string",
						"description": "Regex pattern to search for",
					},
					"file_type": map[string]any{
						"type":        "string",
						"description": "Filter by file type: svelte, ts, js, py, go, md, json, yaml, css, html",
					},
					"path": map[string]any{
						"type":        "string",
						"description": "Limit search to this directory path (relative to project root)",
					},
					"max_results": map[string]any{
						"type":        "integer",
						"description": "Maximum number of result lines to return (default: 20)",
					},
				},
				"required": []string{"pattern"},
			},
		},
	}
}

func findFilesToolDef() Tool {
	return Tool{
		Type: "function",
		Function: ToolDefinition{
			Name:        "find_files",
			Description: "Search for files by name. If no filenames match, automatically searches file contents too.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"pattern": map[string]any{
						"type":        "string",
						"description": "File name pattern to search for (e.g. 'workshop', 'icon')",
					},
					"glob": map[string]any{
						"type":        "string",
						"description": "Glob pattern filter (e.g. '*.svelte', '*.ts')",
					},
				},
				"required": []string{"pattern"},
			},
		},
	}
}

func listDirectoryToolDef() Tool {
	return Tool{
		Type: "function",
		Function: ToolDefinition{
			Name:        "list_directory",
			Description: "List files and subdirectories in a directory (one level). Use this to explore directories found in search results.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"path": map[string]any{
						"type":        "string",
						"description": "Directory path relative to project root",
					},
				},
				"required": []string{"path"},
			},
		},
	}
}

func giveUpToolDef() Tool {
	return Tool{
		Type: "function",
		Function: ToolDefinition{
			Name:        "give_up",
			Description: "Call this when you cannot find what the user described after reviewing results and trying refinement searches.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"reason": map[string]any{
						"type":        "string",
						"description": "Why you could not find it",
					},
					"tried": map[string]any{
						"type":        "array",
						"items":       map[string]any{"type": "string"},
						"description": "List of search strategies you attempted",
					},
					"suggestions": map[string]any{
						"type":        "array",
						"items":       map[string]any{"type": "string"},
						"description": "Suggested gf commands the user could try manually",
					},
				},
				"required": []string{"reason", "tried"},
			},
		},
	}
}

// GiveUpResult holds the parsed give_up tool call arguments.
type GiveUpResult struct {
	Reason      string   `json:"reason"`
	Tried       []string `json:"tried"`
	Suggestions []string `json:"suggestions"`
}

// ToolResult holds the output of executing a single tool call.
type ToolResult struct {
	ToolCallID string
	Content    string
	IsGiveUp   bool
	GiveUp     *GiveUpResult
}

// typeMap maps user-friendly type names to ripgrep arguments.
var typeMap = map[string][]string{
	"svelte":     {"--glob", "*.svelte"},
	"ts":         {"--type", "ts"},
	"typescript": {"--type", "ts"},
	"js":         {"--type", "js"},
	"javascript": {"--type", "js"},
	"py":         {"--type", "py"},
	"python":     {"--type", "py"},
	"rust":       {"--type", "rust"},
	"go":         {"--type", "go"},
	"md":         {"--type", "markdown"},
	"markdown":   {"--type", "markdown"},
	"json":       {"--type", "json"},
	"yaml":       {"--type", "yaml"},
	"css":        {"--type", "css"},
	"html":       {"--type", "html"},
}

// ExecuteToolCall runs a single tool call and returns the result.
// The toolCtx is needed for vector_search; it can be nil for other tools.
func ExecuteToolCall(tc ToolCall, toolCtx *ToolContext) ToolResult {
	switch tc.Function.Name {
	case "vector_search":
		return execVectorSearch(tc, toolCtx)
	case "grep_search":
		return execGrepSearch(tc)
	case "find_files":
		return execFindFiles(tc)
	case "find_by_glob":
		return execFindByGlob(tc)
	case "list_directory":
		return execListDirectory(tc)
	case "give_up":
		return execGiveUp(tc)
	default:
		return ToolResult{
			ToolCallID: tc.ID,
			Content:    fmt.Sprintf("Unknown tool: %s", tc.Function.Name),
		}
	}
}

func execVectorSearch(tc ToolCall, toolCtx *ToolContext) ToolResult {
	var args struct {
		Query string `json:"query"`
		TopN  int    `json:"top_n"`
	}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: invalid arguments"}
	}
	if args.Query == "" {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: query is required"}
	}
	if args.TopN <= 0 {
		args.TopN = 20
	}

	if toolCtx == nil || toolCtx.Index == nil || toolCtx.Client == nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: no vector index available. Run `gf ask --index` to build one."}
	}

	// Embed the query
	vectors, err := toolCtx.Client.Embed(toolCtx.Ctx, []string{args.Query}, nil)
	if err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error embedding query: " + err.Error()}
	}
	if len(vectors) == 0 || len(vectors[0]) == 0 {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: embedding returned empty vector"}
	}

	results := QueryIndex(toolCtx.Index, vectors[0], args.TopN)
	if len(results) == 0 {
		return ToolResult{ToolCallID: tc.ID, Content: "(no matches in vector index)"}
	}

	// Format results for the model
	var lines []string
	for i, r := range results {
		line := fmt.Sprintf("%d. %s", i+1, r.FilePath)
		if r.StartLine > 0 && r.EndLine > r.StartLine {
			line += fmt.Sprintf(":%d-%d", r.StartLine, r.EndLine)
		}
		line += fmt.Sprintf(" (score: %.3f)", r.Score)
		if r.Snippet != "" {
			// Show first 100 chars of snippet
			snippet := r.Snippet
			if len(snippet) > 100 {
				snippet = snippet[:100] + "..."
			}
			line += "\n   " + snippet
		}
		lines = append(lines, line)
	}

	return ToolResult{ToolCallID: tc.ID, Content: strings.Join(lines, "\n")}
}

func execGrepSearch(tc ToolCall) ToolResult {
	var args struct {
		Pattern    string `json:"pattern"`
		FileType   string `json:"file_type"`
		Path       string `json:"path"`
		MaxResults int    `json:"max_results"`
	}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: invalid arguments"}
	}
	if args.Pattern == "" {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: pattern is required"}
	}

	var opts []search.Option

	if args.FileType != "" {
		lower := strings.ToLower(args.FileType)
		if mapped, ok := typeMap[lower]; ok {
			opts = append(opts, search.WithExtraArgs(mapped...))
		} else {
			opts = append(opts, search.WithType(lower))
		}
	}

	if args.Path != "" {
		safePath, err := safePath(args.Path)
		if err != nil {
			return ToolResult{ToolCallID: tc.ID, Content: "Error: " + err.Error()}
		}
		opts = append(opts, search.WithPath(safePath))
	}

	result, err := search.RunRg(args.Pattern, opts...)
	if err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: " + err.Error()}
	}

	if result == "" {
		return ToolResult{ToolCallID: tc.ID, Content: "(no matches)"}
	}

	lines := search.SplitLines(result)
	maxResults := args.MaxResults
	if maxResults <= 0 {
		maxResults = defaultMaxResults
	}
	if len(lines) > maxResults {
		truncated := lines[:maxResults]
		return ToolResult{
			ToolCallID: tc.ID,
			Content:    strings.Join(truncated, "\n") + fmt.Sprintf("\n... (%d more results)", len(lines)-maxResults),
		}
	}

	return ToolResult{ToolCallID: tc.ID, Content: strings.Join(lines, "\n")}
}

func execFindFiles(tc ToolCall) ToolResult {
	var args struct {
		Pattern string `json:"pattern"`
		Glob    string `json:"glob"`
	}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: invalid arguments"}
	}
	if args.Pattern == "" {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: pattern is required"}
	}

	var opts []search.Option
	if args.Glob != "" {
		opts = append(opts, search.WithGlob(args.Glob))
	}

	files, err := search.FindFiles(args.Pattern, opts...)
	if err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: " + err.Error()}
	}

	var parts []string

	if len(files) > 0 {
		if len(files) > defaultMaxResults {
			parts = append(parts, "Files matching name:")
			parts = append(parts, strings.Join(files[:defaultMaxResults], "\n"))
			parts = append(parts, fmt.Sprintf("... (%d more files)", len(files)-defaultMaxResults))
		} else {
			parts = append(parts, "Files matching name:")
			parts = append(parts, strings.Join(files, "\n"))
		}
	}

	// Auto-fallback: if no filename matches, also grep file contents for the pattern.
	if len(files) == 0 {
		grepResult, grepErr := search.RunRg(args.Pattern)
		if grepErr == nil && grepResult != "" {
			lines := search.SplitLines(grepResult)
			if len(lines) > defaultMaxResults {
				lines = lines[:defaultMaxResults]
			}
			parts = append(parts, "No files with that name, but found in file contents:")
			parts = append(parts, strings.Join(lines, "\n"))
		}
	}

	if len(parts) == 0 {
		return ToolResult{ToolCallID: tc.ID, Content: "(no files found)"}
	}

	return ToolResult{ToolCallID: tc.ID, Content: strings.Join(parts, "\n")}
}

func execFindByGlob(tc ToolCall) ToolResult {
	var args struct {
		Globs []string `json:"globs"`
	}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: invalid arguments"}
	}
	if len(args.Globs) == 0 {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: globs is required"}
	}

	files, err := search.FindFilesByGlob(args.Globs)
	if err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: " + err.Error()}
	}

	if len(files) == 0 {
		return ToolResult{ToolCallID: tc.ID, Content: "(no files found)"}
	}

	if len(files) > defaultMaxResults {
		result := strings.Join(files[:defaultMaxResults], "\n")
		return ToolResult{
			ToolCallID: tc.ID,
			Content:    result + fmt.Sprintf("\n... (%d more files)", len(files)-defaultMaxResults),
		}
	}

	return ToolResult{ToolCallID: tc.ID, Content: strings.Join(files, "\n")}
}

func execListDirectory(tc ToolCall) ToolResult {
	var args struct {
		Path string `json:"path"`
	}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: invalid arguments"}
	}

	resolved, err := safePath(args.Path)
	if err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: " + err.Error()}
	}

	entries, err := os.ReadDir(resolved)
	if err != nil {
		return ToolResult{ToolCallID: tc.ID, Content: "Error: " + err.Error()}
	}

	var lines []string
	for i, entry := range entries {
		if i >= maxDirEntries {
			lines = append(lines, fmt.Sprintf("... (%d more entries)", len(entries)-maxDirEntries))
			break
		}
		name := entry.Name()
		if entry.IsDir() {
			name += "/"
		}
		lines = append(lines, name)
	}

	if len(lines) == 0 {
		return ToolResult{ToolCallID: tc.ID, Content: "(empty directory)"}
	}

	return ToolResult{ToolCallID: tc.ID, Content: strings.Join(lines, "\n")}
}

func execGiveUp(tc ToolCall) ToolResult {
	var giveUp GiveUpResult
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &giveUp); err != nil {
		return ToolResult{
			ToolCallID: tc.ID,
			Content:    "Giving up (could not parse reason).",
			IsGiveUp:   true,
			GiveUp:     &GiveUpResult{Reason: "Unknown", Tried: nil},
		}
	}
	return ToolResult{
		ToolCallID: tc.ID,
		Content:    "Search ended.",
		IsGiveUp:   true,
		GiveUp:     &giveUp,
	}
}

// safePath resolves a relative path within GroveRoot and rejects traversal attempts.
func safePath(relPath string) (string, error) {
	cfg := config.Get()
	if relPath == "" {
		return cfg.GroveRoot, nil
	}

	// Clean and resolve
	cleaned := filepath.Clean(relPath)
	if filepath.IsAbs(cleaned) {
		return "", fmt.Errorf("absolute paths not allowed: %s", relPath)
	}

	resolved := filepath.Join(cfg.GroveRoot, cleaned)

	// Verify the resolved path is still under GroveRoot
	resolvedAbs, err := filepath.Abs(resolved)
	if err != nil {
		return "", fmt.Errorf("invalid path: %s", relPath)
	}
	rootAbs, err := filepath.Abs(cfg.GroveRoot)
	if err != nil {
		return "", fmt.Errorf("invalid root path")
	}

	if !strings.HasPrefix(resolvedAbs, rootAbs) {
		return "", fmt.Errorf("path escapes project root: %s", relPath)
	}

	return resolved, nil
}
