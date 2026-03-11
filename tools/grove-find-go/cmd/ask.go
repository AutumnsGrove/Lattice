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
	askFlagUpdateFile  string
	askFlagRemoveFile  string
	askFlagScope       string
	askFlagType        string
	askFlagTier        string
	askFlagDocs        bool
	askFlagAll         bool
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

		// Handle --update-file / --remove-file (single-entry mutations)
		if askFlagUpdateFile != "" || askFlagRemoveFile != "" {
			return runIndexMutate(ctx, cfg)
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
			idx = loadSearchIndex(cfg, askFlagDocs, askFlagAll, onStatus)
		}

		// Run the agentic loop
		// Build query filter from --scope and --type flags
		var filter *nlp.QueryFilter
		if askFlagScope != "" || askFlagType != "" {
			filter = &nlp.QueryFilter{
				PathPrefix: askFlagScope,
				FileType:   askFlagType,
			}
		}

		result, err := nlp.RunAgent(ctx, client, query, nlp.AgentOptions{
			MaxRounds: askFlagMaxRounds,
			Verbose:   cfg.Verbose,
			OnStatus:  onRoundStatus,
			Index:     idx,
			NoVectors: askFlagNoVectors,
			Filter:    filter,
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
	askCmd.Flags().BoolVar(&askFlagReindex, "reindex", false, "Update the index: embed changed/new files, drop deleted ones")
	askCmd.Flags().BoolVar(&askFlagNoVectors, "no-vectors", false, "Skip vector search, use pure agent mode")
	askCmd.Flags().StringVar(&askFlagUpdateFile, "update-file", "", "Re-embed a single file in the index")
	askCmd.Flags().StringVar(&askFlagRemoveFile, "remove-file", "", "Remove a file from the index")
	askCmd.Flags().StringVar(&askFlagScope, "scope", "", "Limit search to a path prefix (e.g. libs/engine)")
	askCmd.Flags().StringVar(&askFlagType, "type", "", "Limit search to a file extension (e.g. ts, svelte, go)")
	askCmd.Flags().StringVar(&askFlagTier, "tier", "", "Embedding model tier: tiny, small, full (default: full)")
	askCmd.Flags().BoolVar(&askFlagDocs, "docs", false, "Index/search documentation (.md) instead of code")
	askCmd.Flags().BoolVar(&askFlagAll, "all", false, "Search both code and docs indexes")
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

	// Determine index mode and model from flags
	mode := nlp.IndexCode
	indexName := "code"
	embedModel := cfg.EmbedModel

	if askFlagDocs {
		mode = nlp.IndexDocs
		indexName = "docs"
		embedModel = nlp.ResolveModel(nlp.DocsTier, cfg.EmbedModel)
		onStatus("Indexing documentation (.md files)...")
	} else if askFlagTier != "" {
		// Validate tier
		if _, ok := nlp.Tiers[askFlagTier]; !ok {
			return fmt.Errorf("unknown tier %q — use: tiny, small, full", askFlagTier)
		}
		embedModel = nlp.ResolveModel(askFlagTier, cfg.EmbedModel)
		tier := nlp.Tiers[askFlagTier]
		onStatus(fmt.Sprintf("Using tier %q: %s (%s)", askFlagTier, tier.Model, tier.Desc))
	}

	indexPath := nlp.IndexPathFor(indexName)

	if !cfg.JSONMode {
		if incremental {
			onStatus(fmt.Sprintf("Updating %s index...", indexName))
		} else {
			onStatus(fmt.Sprintf("Building %s index with model %s...", indexName, embedModel))
		}
	}

	// Ensure LM Studio is running
	client, err := nlp.EnsureServer(ctx, !askFlagNoAutostart, onStatus)
	if err != nil {
		return err
	}
	_ = client

	// Create an embed-capable client with the resolved model
	embedClient := nlp.NewClientWithEmbed(
		cfg.LLMEndpoint,
		cfg.LLMModel,
		embedModel,
		time.Duration(cfg.LLMTimeout)*time.Second,
	)

	// Progress callback for embedding — fires after each batch
	embedStart := time.Now()
	onProgress := func(done, total int) {
		if cfg.JSONMode {
			return
		}
		pct := 0
		if total > 0 {
			pct = done * 100 / total
		}
		elapsed := time.Since(embedStart).Round(time.Second)
		eta := ""
		if done > 0 && done < total {
			rate := float64(done) / time.Since(embedStart).Seconds()
			remaining := time.Duration(float64(total-done)/rate) * time.Second
			eta = fmt.Sprintf(", ~%s remaining", remaining.Round(time.Second))
		}
		if cfg.AgentMode {
			fmt.Fprintf(os.Stderr, "--- Embedding %d/%d (%d%%) [%s elapsed%s] ---\n", done, total, pct, elapsed, eta)
		} else {
			fmt.Fprintf(os.Stderr, "\r\033[K  Embedding... %d/%d (%d%%) [%s elapsed%s]", done, total, pct, elapsed, eta)
		}
	}

	var idx *nlp.Index
	if incremental {
		// Load existing index and only re-embed changed files
		existing, err := nlp.LoadIndexFrom(indexPath)
		if err != nil {
			onStatus(fmt.Sprintf("Warning: could not load existing index: %v", err))
		}
		if existing == nil {
			onStatus("No existing index found, building from scratch...")
		}
		embedStart = time.Now()
		idx, err = nlp.RebuildIndex(ctx, embedClient, existing, mode, onStatus, onProgress)
		if err != nil {
			return fmt.Errorf("rebuild index: %w", err)
		}
	} else {
		// Full build from scratch
		onStatus("Scanning files...")
		chunks, err := nlp.WalkAndChunkMode(mode)
		if err != nil {
			return fmt.Errorf("scan codebase: %w", err)
		}
		onStatus(fmt.Sprintf("Found %d files, %d chunks", countUniqueFiles(chunks), len(chunks)))
		embedStart = time.Now()
		idx, err = nlp.BuildIndex(ctx, embedClient, mode, onProgress)
		if err != nil {
			return fmt.Errorf("build index: %w", err)
		}
	}

	if !cfg.JSONMode && !cfg.AgentMode {
		fmt.Fprintln(os.Stderr) // newline after progress
	}

	// Save to the correct index path
	if err := nlp.SaveIndexTo(indexPath, idx); err != nil {
		return fmt.Errorf("save index: %w", err)
	}

	info, _ := os.Stat(indexPath)
	sizeMB := float64(0)
	if info != nil {
		sizeMB = float64(info.Size()) / (1024 * 1024)
	}

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":    "ask",
			"action":     "index",
			"index":      indexName,
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

// runIndexMutate handles --update-file and --remove-file.
func runIndexMutate(ctx context.Context, cfg *config.Config) error {
	idx, err := nlp.LoadIndex()
	if err != nil {
		return fmt.Errorf("load index: %w", err)
	}
	if idx == nil {
		return fmt.Errorf("no index found — run `gf ask --index` first")
	}

	if askFlagRemoveFile != "" {
		removed := idx.RemoveFile(askFlagRemoveFile)
		if removed == 0 {
			fmt.Fprintf(os.Stderr, "  No entries found for %s\n", askFlagRemoveFile)
			return nil
		}
		if err := nlp.SaveIndex(idx); err != nil {
			return fmt.Errorf("save index: %w", err)
		}
		fmt.Fprintf(os.Stderr, "  Removed %d chunks for %s\n", removed, askFlagRemoveFile)
		return nil
	}

	if askFlagUpdateFile != "" {
		// Need embedding client
		embedClient := nlp.NewClientWithEmbed(
			cfg.LLMEndpoint,
			cfg.LLMModel,
			cfg.EmbedModel,
			time.Duration(cfg.LLMTimeout)*time.Second,
		)

		added, err := idx.UpdateFile(ctx, embedClient, askFlagUpdateFile)
		if err != nil {
			return fmt.Errorf("update file: %w", err)
		}
		if err := nlp.SaveIndex(idx); err != nil {
			return fmt.Errorf("save index: %w", err)
		}
		fmt.Fprintf(os.Stderr, "  Updated %s: %d chunks embedded\n", askFlagUpdateFile, added)
		return nil
	}

	return nil
}

// loadSearchIndex loads the appropriate index(es) for the search flags.
// --docs loads the docs index, --all merges both, default loads the code index.
func loadSearchIndex(cfg *config.Config, docs, all bool, onStatus func(string)) *nlp.Index {
	loadOne := func(name string) *nlp.Index {
		path := nlp.IndexPathFor(name)
		loaded, err := nlp.LoadIndexFrom(path)
		if err != nil {
			onStatus(fmt.Sprintf("Warning: could not load %s index: %v", name, err))
			return nil
		}
		if loaded == nil {
			return nil
		}
		if !cfg.JSONMode {
			onStatus(fmt.Sprintf("Loaded %s index: %d chunks, %d dimensions", name, len(loaded.Entries), loaded.Dimensions))
		}
		return loaded
	}

	if docs && !all {
		idx := loadOne("docs")
		if idx == nil && !cfg.JSONMode {
			onStatus("No docs index found. Run `gf ask --index --docs` to build it.")
		}
		return idx
	}

	if all {
		codeIdx := loadOne("code")
		docsIdx := loadOne("docs")

		if codeIdx == nil && docsIdx == nil {
			if !cfg.JSONMode {
				onStatus("No indexes found. Run `gf ask --index` and `gf ask --index --docs` to build them.")
			}
			return nil
		}
		if codeIdx == nil {
			return docsIdx
		}
		if docsIdx == nil {
			return codeIdx
		}

		// Merge: append docs entries to code index.
		// If dimensions differ, keep them separate — QueryIndex handles mixed dims
		// by checking cosine similarity (mismatched dims return 0).
		// For same-model indexes this is a clean merge.
		merged := &nlp.Index{
			Dimensions: codeIdx.Dimensions,
			EmbedModel: codeIdx.EmbedModel,
			Entries:    make([]nlp.IndexEntry, 0, len(codeIdx.Entries)+len(docsIdx.Entries)),
		}
		merged.Entries = append(merged.Entries, codeIdx.Entries...)
		merged.Entries = append(merged.Entries, docsIdx.Entries...)
		if !cfg.JSONMode {
			onStatus(fmt.Sprintf("Merged: %d total chunks (%d code + %d docs)",
				len(merged.Entries), len(codeIdx.Entries), len(docsIdx.Entries)))
		}
		return merged
	}

	// Default: code index
	idx := loadOne("code")
	if idx == nil && !cfg.JSONMode {
		onStatus("No vector index found. Run `gf ask --index` for faster, smarter search.")
	}
	return idx
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
