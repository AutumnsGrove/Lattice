package nlp

import (
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

// ToolDefs returns the tool definitions sent to the model.
func ToolDefs() []Tool {
	return []Tool{
		{
			Type: "function",
			Function: ToolDefinition{
				Name:        "grep_search",
				Description: "Search file contents for a regex pattern. Returns matching lines with file paths and line numbers.",
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
		},
		{
			Type: "function",
			Function: ToolDefinition{
				Name:        "find_files",
				Description: "Find files whose names match a pattern. Returns file paths.",
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
		},
		{
			Type: "function",
			Function: ToolDefinition{
				Name:        "find_by_glob",
				Description: "Find files matching one or more glob patterns. Returns file paths.",
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"globs": map[string]any{
							"type":        "array",
							"items":       map[string]any{"type": "string"},
							"description": "Glob patterns (e.g. ['libs/engine/**/*.ts', 'apps/**/*.svelte'])",
						},
					},
					"required": []string{"globs"},
				},
			},
		},
		{
			Type: "function",
			Function: ToolDefinition{
				Name:        "list_directory",
				Description: "List files and subdirectories in a directory (one level). Use this to explore before searching.",
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
		},
		{
			Type: "function",
			Function: ToolDefinition{
				Name:        "give_up",
				Description: "Call this when you cannot find what the user described after trying multiple searches. Provide what you tried so the user can refine their query.",
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
// Matches the map in cmd/search.go for consistency.
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
func ExecuteToolCall(tc ToolCall) ToolResult {
	switch tc.Function.Name {
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
