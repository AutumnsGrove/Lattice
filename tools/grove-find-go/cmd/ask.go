package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/asktui"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/nlp"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
)

var (
	askFlagInteractive bool
	askFlagNoAutostart bool
	askFlagMaxRounds   int
	askFlagIndex       bool
	askFlagReindex     bool
	askFlagNoVectors   bool
)

var askCmd = &cobra.Command{
	Use:   "ask <query>",
	Short: "Natural language codebase search (requires local LLM)",
	Long: `Search the codebase using natural language. Powered by a local LLM
running in LM Studio, gf ask translates your description into structured
searches and returns file paths with explanations.

Examples:
  gf ask "where are the service icons defined"
  gf ask "the thing that handles rate limiting"
  gf ask "wherever the seasonal theme colors live"`,
	Args: cobra.ArbitraryArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		ctx := context.Background()

		// Handle --index / --reindex (no query required)
		if askFlagIndex || askFlagReindex {
			return runIndexBuild(ctx, cfg, askFlagReindex)
		}

		if len(args) == 0 {
			return fmt.Errorf("query required (or use --index to build the vector index)")
		}

		query := strings.Join(args, " ")

		// Interactive TUI mode
		if askFlagInteractive {
			return asktui.Run(asktui.Options{
				Query:     query,
				Autostart: !askFlagNoAutostart,
				MaxRounds: askFlagMaxRounds,
			})
		}

		// Status callback: prints to stderr so stdout stays clean for piping
		onStatus := func(msg string) {
			if cfg.JSONMode {
				return
			}
			if cfg.AgentMode {
				fmt.Fprintf(os.Stderr, "--- %s ---\n", msg)
			} else {
				fmt.Fprintf(os.Stderr, "  %s\n", msg)
			}
		}

		// Round status callback
		onRoundStatus := func(round, maxRounds int, status string) {
			if cfg.JSONMode {
				return
			}
			if cfg.AgentMode {
				fmt.Fprintf(os.Stderr, "--- round %d/%d: %s ---\n", round, maxRounds, status)
			} else {
				fmt.Fprintf(os.Stderr, "\r  \033[K  ◐ %s  (round %d/%d)", status, round, maxRounds)
			}
		}

		// Print the query header
		if !cfg.JSONMode {
			if cfg.AgentMode {
				fmt.Fprintf(os.Stderr, "--- Searching: %s ---\n", query)
			} else {
				output.PrintSection(fmt.Sprintf("Searching: %q", query))
			}
		}

		// Ensure LM Studio is running
		client, err := nlp.EnsureServer(ctx, !askFlagNoAutostart, onStatus)
		if err != nil {
			return err
		}

		// Load vector index (if available and not skipped)
		var idx *nlp.Index
		if !askFlagNoVectors {
			loaded, err := nlp.LoadIndex()
			if err != nil {
				onStatus(fmt.Sprintf("Warning: could not load index: %v", err))
			} else if loaded == nil {
				if !cfg.JSONMode {
					onStatus("No vector index found. Run `gf ask --index` for faster, smarter search.")
				}
			} else {
				idx = loaded
				if !cfg.JSONMode {
					onStatus(fmt.Sprintf("Loaded index: %d chunks, %d dimensions", len(idx.Entries), idx.Dimensions))
				}
			}
		}

		// Run the agentic loop
		result, err := nlp.RunAgent(ctx, client, query, nlp.AgentOptions{
			MaxRounds: askFlagMaxRounds,
			Verbose:   cfg.Verbose,
			OnStatus:  onRoundStatus,
			Index:     idx,
			NoVectors: askFlagNoVectors,
		})
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		// Clear the status line in human mode
		if cfg.IsHumanMode() {
			fmt.Fprintf(os.Stderr, "\r\033[K")
		}

		// Render output
		if cfg.JSONMode {
			return renderJSON(query, result)
		}

		if result.GaveUp {
			return renderGiveUp(cfg, result)
		}

		return renderAnswer(cfg, result)
	},
}

func init() {
	askCmd.Flags().BoolVarP(&askFlagInteractive, "interactive", "i", false, "Interactive TUI mode (Phase 2)")
	askCmd.Flags().BoolVar(&askFlagNoAutostart, "no-autostart", false, "Skip LM Studio auto-start")
	askCmd.Flags().IntVar(&askFlagMaxRounds, "max-rounds", nlp.DefaultMaxRounds, "Maximum agentic loop iterations")
	askCmd.Flags().BoolVar(&askFlagIndex, "index", false, "Build the vector index from scratch")
	askCmd.Flags().BoolVar(&askFlagReindex, "reindex", false, "Incrementally update the vector index")
	askCmd.Flags().BoolVar(&askFlagNoVectors, "no-vectors", false, "Skip vector search, use pure agent mode")
}

func renderJSON(query string, result *nlp.AgentResult) error {
	data := map[string]any{
		"command":    "ask",
		"query":      query,
		"rounds":     result.Rounds,
		"tool_calls": result.ToolCalls,
	}

	if result.GaveUp {
		data["gave_up"] = true
		data["reason"] = result.GiveUp.Reason
		data["tried"] = result.GiveUp.Tried
		if len(result.GiveUp.Suggestions) > 0 {
			data["suggestions"] = result.GiveUp.Suggestions
		}
	} else {
		data["answer"] = result.Answer
		data["files"] = result.Files
	}

	output.PrintJSON(data)
	return nil
}

func renderGiveUp(cfg *config.Config, result *nlp.AgentResult) error {
	if cfg.AgentMode {
		fmt.Println("\n--- Could not find what you described ---")
		fmt.Printf("Reason: %s\n", result.GiveUp.Reason)
		if len(result.GiveUp.Tried) > 0 {
			fmt.Println("\nTried:")
			for _, t := range result.GiveUp.Tried {
				fmt.Printf("  %s\n", t)
			}
		}
		if len(result.GiveUp.Suggestions) > 0 {
			fmt.Println("\nSuggested commands:")
			for _, s := range result.GiveUp.Suggestions {
				fmt.Printf("  %s\n", s)
			}
		}
		return nil
	}

	// Human mode
	fmt.Println()
	output.PrintWarning("Could not find what you described.")
	fmt.Println()

	if result.GiveUp.Reason != "" {
		output.PrintDim("  " + result.GiveUp.Reason)
		fmt.Println()
	}

	if len(result.GiveUp.Tried) > 0 {
		output.PrintDim("  Tried:")
		for _, t := range result.GiveUp.Tried {
			output.PrintDim("    " + t)
		}
		fmt.Println()
	}

	if len(result.GiveUp.Suggestions) > 0 {
		output.PrintSection("You could try")
		for _, s := range result.GiveUp.Suggestions {
			fmt.Printf("    %s\n", s)
		}
		fmt.Println()
	}

	return nil
}

func renderAnswer(cfg *config.Config, result *nlp.AgentResult) error {
	if cfg.AgentMode {
		if len(result.Files) > 0 {
			fmt.Println("\n--- Found ---")
			for _, f := range result.Files {
				fmt.Println(f)
			}
			fmt.Println()
		}
		if result.Answer != "" {
			fmt.Println(result.Answer)
		}
		return nil
	}

	// Human mode
	fmt.Println()
	if len(result.Files) > 0 {
		output.PrintSuccess("Found it!")
		fmt.Println()
		for _, f := range result.Files {
			output.PrintColor("#e8a838", "  "+f)
		}
		fmt.Println()
	}

	if result.Answer != "" {
		// Print the answer, indented
		for _, line := range strings.Split(result.Answer, "\n") {
			// Skip lines that are just file paths (already printed above)
			trimmed := strings.TrimSpace(line)
			if trimmed != "" && !isInFileList(trimmed, result.Files) {
				fmt.Printf("  %s\n", line)
			}
		}
		fmt.Println()
	}

	return nil
}

// runIndexBuild handles --index and --reindex.
func runIndexBuild(ctx context.Context, cfg *config.Config, incremental bool) error {
	// Status callback
	onStatus := func(msg string) {
		if cfg.JSONMode {
			return
		}
		if cfg.AgentMode {
			fmt.Fprintf(os.Stderr, "--- %s ---\n", msg)
		} else {
			fmt.Fprintf(os.Stderr, "  %s\n", msg)
		}
	}

	if !cfg.JSONMode {
		if incremental {
			onStatus("Updating vector index...")
		} else {
			onStatus("Building vector index...")
		}
	}

	// Ensure LM Studio is running with the embedding model
	client, err := nlp.EnsureServer(ctx, !askFlagNoAutostart, onStatus)
	if err != nil {
		return err
	}

	// Create an embed-capable client
	embedClient := nlp.NewClientWithEmbed(
		cfg.LLMEndpoint,
		cfg.LLMModel,
		cfg.EmbedModel,
		time.Duration(cfg.LLMTimeout)*time.Second,
	)
	// Copy health state from the ensured client
	_ = client

	// Walk and chunk
	onStatus("Scanning files...")
	chunks, err := nlp.WalkAndChunk()
	if err != nil {
		return fmt.Errorf("scan codebase: %w", err)
	}
	onStatus(fmt.Sprintf("Found %d files, %d chunks", countUniqueFiles(chunks), len(chunks)))

	// Progress callback for embedding
	onProgress := func(done, total int) {
		if cfg.JSONMode {
			return
		}
		if cfg.AgentMode {
			if done%100 == 0 || done == total {
				fmt.Fprintf(os.Stderr, "--- Embedding %d/%d ---\n", done, total)
			}
		} else {
			pct := 0
			if total > 0 {
				pct = done * 100 / total
			}
			fmt.Fprintf(os.Stderr, "\r  \033[K  Embedding... %d/%d (%d%%)", done, total, pct)
		}
	}

	idx, err := nlp.BuildIndex(ctx, embedClient, onProgress)
	if err != nil {
		return fmt.Errorf("build index: %w", err)
	}

	if !cfg.JSONMode && !cfg.AgentMode {
		fmt.Fprintln(os.Stderr) // newline after progress
	}

	// Save
	if err := nlp.SaveIndex(idx); err != nil {
		return fmt.Errorf("save index: %w", err)
	}

	indexPath := nlp.IndexPath()
	info, _ := os.Stat(indexPath)
	sizeMB := float64(0)
	if info != nil {
		sizeMB = float64(info.Size()) / (1024 * 1024)
	}

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":    "ask",
			"action":     "index",
			"chunks":     len(idx.Entries),
			"dimensions": idx.Dimensions,
			"model":      idx.EmbedModel,
			"size_mb":    fmt.Sprintf("%.1f", sizeMB),
			"path":       indexPath,
		})
	} else {
		onStatus(fmt.Sprintf("Index built: %d chunks, %d dimensions, %.1f MB", len(idx.Entries), idx.Dimensions, sizeMB))
		onStatus(fmt.Sprintf("Saved to %s", indexPath))
	}

	return nil
}

// countUniqueFiles counts distinct file paths across chunks.
func countUniqueFiles(chunks []nlp.Chunk) int {
	seen := make(map[string]bool)
	for _, c := range chunks {
		seen[c.FilePath] = true
	}
	return len(seen)
}

// isInFileList checks if a line matches one of the extracted file paths.
func isInFileList(line string, files []string) bool {
	cleaned := strings.TrimPrefix(line, "- ")
	cleaned = strings.TrimPrefix(cleaned, "* ")
	cleaned = strings.TrimPrefix(cleaned, "`")
	cleaned = strings.TrimSuffix(cleaned, "`")
	cleaned = strings.TrimSpace(cleaned)

	for _, f := range files {
		if cleaned == f {
			return true
		}
	}
	return false
}
