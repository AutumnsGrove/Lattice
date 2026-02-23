package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
	"golang.org/x/sync/errgroup"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/pager"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
)

// ---------- search ----------

var (
	searchFlagPath       string
	searchFlagType       string
	searchFlagMaxResults int
	searchFlagArchived   bool
)

// typeMap maps user-friendly type names to ripgrep --type or --glob arguments.
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
}

var searchCmd = &cobra.Command{
	Use:   "search <pattern>",
	Short: "General codebase search",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := args[0]
		cfg := config.Get()

		// Apply --archived flag to config so shouldExclude respects it.
		if searchFlagArchived {
			cfg.IncludeArchived = true
		}

		output.PrintSection(fmt.Sprintf("Searching for: %s", pattern))

		// Build search options from flags.
		var opts []search.Option

		if searchFlagType != "" {
			lower := strings.ToLower(searchFlagType)
			if mapped, ok := typeMap[lower]; ok {
				opts = append(opts, search.WithExtraArgs(mapped...))
			} else {
				opts = append(opts, search.WithType(lower))
			}
		}

		if searchFlagPath != "" {
			opts = append(opts, search.WithExtraArgs(searchFlagPath))
		}

		// Exclude _archived/ by default unless --archived is set.
		if !cfg.IncludeArchived {
			opts = append(opts, search.WithExtraArgs("--glob", "!*/_archived/*"))
		}

		result, err := search.RunRg(pattern, opts...)
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		lines := search.SplitLines(result)

		// Apply --max-results cap.
		truncated := false
		if searchFlagMaxResults > 0 && len(lines) > searchFlagMaxResults {
			lines = lines[:searchFlagMaxResults]
			truncated = true
		}

		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":   "search",
				"pattern":   pattern,
				"type":      searchFlagType,
				"path":      searchFlagPath,
				"count":     len(lines),
				"truncated": truncated,
				"results":   lines,
			})
			return nil
		}

		if cfg.AgentMode && truncated {
			fmt.Printf("--- truncated at %d results (use --max-results 0 for all) ---\n", searchFlagMaxResults)
		}

		if len(lines) > 0 {
			body := strings.Join(lines, "\n") + "\n"
			if truncated {
				output.PrintDim(fmt.Sprintf("  (truncated at %d results — use --max-results 0 for all)", searchFlagMaxResults))
			}
			return pager.MaybePage(body)
		}
		output.PrintWarning("No results found")

		return nil
	},
}

func init() {
	searchCmd.Flags().StringVarP(&searchFlagPath, "path", "p", "", "Limit search to path")
	searchCmd.Flags().StringVarP(&searchFlagType, "type", "t", "", "Filter by file type (svelte, ts, js, py, etc.)")
	searchCmd.Flags().IntVar(&searchFlagMaxResults, "max-results", 0, "Cap result count (0 = unlimited; best practice: --max-results 50 in agent mode)")
	searchCmd.Flags().BoolVar(&searchFlagArchived, "archived", false, "Include _archived/ directories in results")
}

// ---------- class ----------

var classCmd = &cobra.Command{
	Use:   "class <name>",
	Short: "Find class/component definitions",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		cfg := config.Get()

		output.PrintSection(fmt.Sprintf("Finding class/component: %s", name))

		// Run 4 searches in parallel using goroutines.
		type sectionResult struct {
			title string
			lines []string
		}

		results := make([]sectionResult, 4)
		g, ctx := errgroup.WithContext(context.Background())

		// 1. Svelte component files
		g.Go(func() error {
			files, err := search.FindFiles(name, search.WithGlob("*.svelte"))
			if err != nil {
				return fmt.Errorf("Svelte Components: %w", err)
			}
			results[0] = sectionResult{title: "Svelte Components", lines: files}
			return nil
		})

		// 2. Component exports in .svelte files
		g.Go(func() error {
			pattern := fmt.Sprintf(`(export\s+(let|const|interface)\s+.*%s|<script.*>.*%s)`, name, name)
			out, err := search.RunRg(pattern, search.WithContext(ctx), search.WithGlob("*.svelte"))
			if err != nil {
				return fmt.Errorf("Component Exports: %w", err)
			}
			results[1] = sectionResult{title: "Component Exports", lines: search.SplitLines(out)}
			return nil
		})

		// 3. Class definitions
		g.Go(func() error {
			pattern := fmt.Sprintf(`class\s+%s`, name)
			out, err := search.RunRg(pattern, search.WithContext(ctx), search.WithType("ts"), search.WithType("js"))
			if err != nil {
				return fmt.Errorf("Class Definitions: %w", err)
			}
			results[2] = sectionResult{title: "Class Definitions", lines: search.SplitLines(out)}
			return nil
		})

		// 4. Type/interface definitions
		g.Go(func() error {
			pattern := fmt.Sprintf(`(interface|type)\s+%s`, name)
			out, err := search.RunRg(pattern, search.WithContext(ctx), search.WithType("ts"))
			if err != nil {
				return fmt.Errorf("Type/Interface Definitions: %w", err)
			}
			results[3] = sectionResult{title: "Type/Interface Definitions", lines: search.SplitLines(out)}
			return nil
		})

		if err := g.Wait(); err != nil {
			return fmt.Errorf("search failed in %s", err)
		}

		if cfg.JSONMode {
			jsonData := map[string]any{
				"command": "class",
				"name":    name,
			}
			for _, r := range results {
				// Convert title to a JSON-friendly key.
				key := strings.ToLower(strings.ReplaceAll(r.title, " ", "_"))
				key = strings.ReplaceAll(key, "/", "_")
				jsonData[key] = r.lines
			}
			output.PrintJSON(jsonData)
			return nil
		}

		for _, r := range results {
			output.PrintSection(r.title)
			if len(r.lines) > 0 {
				// Limit component exports to 20 lines.
				lines := r.lines
				if r.title == "Component Exports" && len(lines) > 20 {
					lines = lines[:20]
				}
				output.PrintRaw(strings.Join(lines, "\n") + "\n")
			} else {
				noCtx := strings.ToLower(r.title)
				output.PrintNoResults(noCtx)
			}
		}

		return nil
	},
}

// ---------- func ----------

var funcCmd = &cobra.Command{
	Use:   "func <name>",
	Short: "Find function definitions",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		cfg := config.Get()

		output.PrintSection(fmt.Sprintf("Finding function: %s", name))

		// Pattern matches various function definition styles.
		pattern := fmt.Sprintf(
			`(function\s+%s|const\s+%s\s*=|let\s+%s\s*=|export\s+(async\s+)?function\s+%s|%s\s*[:=]\s*(async\s+)?\()`,
			name, name, name, name, name,
		)

		result, err := search.RunRg(pattern,
			search.WithGlob("*.{ts,js,svelte}"),
		)
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		if cfg.JSONMode {
			lines := search.SplitLines(result)
			output.PrintJSON(map[string]any{
				"command": "func",
				"name":    name,
				"pattern": pattern,
				"count":   len(lines),
				"results": lines,
			})
			return nil
		}

		if result != "" {
			output.PrintRaw(strings.TrimRight(result, "\n") + "\n")
		} else {
			output.PrintWarning(fmt.Sprintf("No function '%s' found", name))
		}

		return nil
	},
}

// ---------- usage ----------

var usageCmd = &cobra.Command{
	Use:   "usage <name>",
	Short: "Find where a component/function is used",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		cfg := config.Get()

		output.PrintSection(fmt.Sprintf("Finding usage of: %s", name))

		const maxLines = 25

		// definitionKeywords used to filter out definitions from function call results.
		definitionKeywords := []string{"function ", "const ", "let ", "var ", "import ", "export "}

		// --- Imports ---
		importPattern := fmt.Sprintf(
			`import.*\{[^}]*\b%s\b[^}]*\}|import\s+%s\s+from|import\s+\*\s+as\s+%s`,
			name, name, name,
		)
		importResult, err := search.RunRg(importPattern,
			search.WithGlob("*.{ts,js,svelte}"),
		)
		if err != nil {
			return fmt.Errorf("import search failed: %w", err)
		}
		importLines := search.SplitLines(importResult)

		// --- JSX/Svelte usage ---
		jsxPattern := fmt.Sprintf(`<%s[\s/>]`, name)
		jsxResult, err := search.RunRg(jsxPattern,
			search.WithGlob("*.svelte"),
		)
		if err != nil {
			return fmt.Errorf("JSX/Svelte search failed: %w", err)
		}
		jsxLines := search.SplitLines(jsxResult)

		// --- Function calls (filter out definitions) ---
		callPattern := fmt.Sprintf(`\b%s\s*\(`, name)
		callResult, err := search.RunRg(callPattern,
			search.WithGlob("*.{ts,js,svelte}"),
		)
		if err != nil {
			return fmt.Errorf("function call search failed: %w", err)
		}
		rawCallLines := search.SplitLines(callResult)

		// Filter out lines that look like definitions.
		callLines := make([]string, 0, len(rawCallLines))
		for _, line := range rawCallLines {
			isDef := false
			for _, kw := range definitionKeywords {
				if strings.Contains(line, kw) {
					isDef = true
					break
				}
			}
			if !isDef {
				callLines = append(callLines, line)
			}
		}

		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":        "usage",
				"name":           name,
				"imports":        importLines,
				"jsx_usage":      jsxLines,
				"function_calls": callLines,
			})
			return nil
		}

		// Print Imports section.
		output.PrintSection("Imports")
		if len(importLines) > 0 {
			show := importLines
			if len(show) > maxLines {
				show = show[:maxLines]
			}
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if len(importLines) > maxLines {
				output.Printf("  ... and %d more", len(importLines)-maxLines)
			}
		} else {
			output.PrintNoResults("imports")
		}

		// Print JSX/Svelte usage section.
		output.PrintSection("JSX/Svelte Usage")
		if len(jsxLines) > 0 {
			show := jsxLines
			if len(show) > maxLines {
				show = show[:maxLines]
			}
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if len(jsxLines) > maxLines {
				output.Printf("  ... and %d more", len(jsxLines)-maxLines)
			}
		} else {
			output.PrintNoResults("JSX/Svelte usage")
		}

		// Print Function Calls section.
		output.PrintSection("Function Calls")
		if len(callLines) > 0 {
			show := callLines
			if len(show) > maxLines {
				show = show[:maxLines]
			}
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if len(callLines) > maxLines {
				output.Printf("  ... and %d more", len(callLines)-maxLines)
			}
		} else {
			output.PrintNoResults("function calls")
		}

		return nil
	},
}

// ---------- imports ----------

var importsCmd = &cobra.Command{
	Use:   "imports <module>",
	Short: "Find imports of a module",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		module := args[0]
		cfg := config.Get()

		output.PrintSection(fmt.Sprintf("Finding imports of: %s", module))

		pattern := fmt.Sprintf(`import.*['"].*%s`, module)
		result, err := search.RunRg(pattern,
			search.WithGlob("*.{ts,js,svelte}"),
		)
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		if cfg.JSONMode {
			lines := search.SplitLines(result)
			output.PrintJSON(map[string]any{
				"command": "imports",
				"module":  module,
				"count":   len(lines),
				"results": lines,
			})
			return nil
		}

		if result != "" {
			output.PrintRaw(strings.TrimRight(result, "\n") + "\n")
		} else {
			output.PrintWarning(fmt.Sprintf("No imports of '%s' found", module))
		}

		return nil
	},
}
