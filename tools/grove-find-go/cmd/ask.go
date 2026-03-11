package cmd

import (
	"context"
	"fmt"
	"math"
	"os"
	"path/filepath"
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
	askFlagCloud       bool
	askFlagCloudModel  string
)

var askCmd = &cobra.Command{
	Use:   "ask <query>",
	Short: "Natural language codebase search",
	Long: `Search the codebase using natural language via semantic vector search.

By default, uses fast vector-only mode (no LLM needed, just local embeddings).
Add --cloud for a deeper agentic search powered by a cloud LLM.

Examples:
  gf ask "seasonal theme colors"           # fast vector search (default)
  gf ask --cloud "where is rate limiting"   # cloud agent with tool calling
  gf ask --scope libs/engine "auth logic"   # scoped to a directory
  gf ask --docs "how do backups work"       # search docs index only`,
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

		// Build query filter from --scope and --type flags
		var filter *nlp.QueryFilter
		if askFlagScope != "" || askFlagType != "" {
			filter = &nlp.QueryFilter{
				PathPrefix: askFlagScope,
				FileType:   askFlagType,
			}
		}

		// ─── FAST MODE (default): vector-only, no LLM ───
		if !askFlagCloud {
			return runFastSearch(ctx, cfg, query, filter, onStatus)
		}

		// ─── CLOUD MODE (--cloud): full agentic loop via OpenRouter ───
		return runCloudSearch(ctx, cfg, query, filter, onStatus)
	},
}

func init() {
	// Index management
	askCmd.Flags().BoolVar(&askFlagIndex, "index", false, "Build the vector index from scratch")
	askCmd.Flags().BoolVar(&askFlagReindex, "reindex", false, "Update the index: embed changed/new files, drop deleted ones")
	askCmd.Flags().StringVar(&askFlagTier, "tier", "", "Embedding model tier: tiny, small, full (default: full)")
	askCmd.Flags().StringVar(&askFlagUpdateFile, "update-file", "", "Re-embed a single file in the index")
	askCmd.Flags().StringVar(&askFlagRemoveFile, "remove-file", "", "Remove a file from the index")

	// Search filters
	askCmd.Flags().StringVar(&askFlagScope, "scope", "", "Limit search to a path prefix (e.g. libs/engine)")
	askCmd.Flags().StringVar(&askFlagType, "type", "", "Limit search to a file extension (e.g. ts, svelte, go)")
	askCmd.Flags().BoolVar(&askFlagDocs, "docs", false, "Index/search documentation (.md) instead of code")
	askCmd.Flags().BoolVar(&askFlagAll, "all", false, "Search both code and docs indexes")

	// Cloud agent mode
	askCmd.Flags().BoolVar(&askFlagCloud, "cloud", false, "Use cloud LLM (OpenRouter) for deeper agentic search")
	askCmd.Flags().StringVar(&askFlagCloudModel, "cloud-model", "", "Override cloud model (default: xiaomi/mimo-v2-flash)")
	askCmd.Flags().IntVar(&askFlagMaxRounds, "max-rounds", nlp.DefaultMaxRounds, "Maximum agentic loop iterations (--cloud only)")
	askCmd.Flags().BoolVar(&askFlagNoVectors, "no-vectors", false, "Skip vector pre-search in agent mode (--cloud only)")
	askCmd.Flags().BoolVar(&askFlagNoAutostart, "no-autostart", false, "Skip LM Studio auto-start")

	// Phase 2
	askCmd.Flags().BoolVarP(&askFlagInteractive, "interactive", "i", false, "Interactive TUI mode (Phase 2)")
}

func renderJSON(query string, result *nlp.AgentResult) error {
	data := map[string]any{
		"command":    "ask",
		"query":      query,
		"rounds":     result.Rounds,
		"tool_calls": result.ToolCalls,
		"usage": map[string]any{
			"prompt_tokens":     result.PromptTokens,
			"completion_tokens": result.CompletionTokens,
			"total_tokens":      result.PromptTokens + result.CompletionTokens,
			"cost_usd":          result.Cost,
		},
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

// runFastSearch does vector-only search: embed the query, cosine scan, print results.
// No LLM chat model needed — just the local embedding model.
func runFastSearch(ctx context.Context, cfg *config.Config, query string, filter *nlp.QueryFilter, onStatus func(string)) error {
	// Load the vector index
	idx := loadSearchIndex(cfg, askFlagDocs, askFlagAll, onStatus)
	if idx == nil {
		return fmt.Errorf("no vector index found. Run `gf ask --index` to build one, or use `--cloud` for agent mode")
	}

	// We need a local embed client to embed the query
	embedClient := nlp.NewClientWithEmbed(cfg.LLMEndpoint, "", idx.EmbedModel, time.Duration(cfg.LLMTimeout)*time.Second)

	// Check that LM Studio is running (for embedding only)
	if !embedClient.IsHealthy(ctx) {
		return fmt.Errorf("LM Studio is not running (needed for embedding). Start it or use `--cloud` for cloud-only mode")
	}

	if !cfg.JSONMode {
		if cfg.AgentMode {
			fmt.Fprintf(os.Stderr, "--- Searching: %s ---\n", query)
		} else {
			output.PrintSection(fmt.Sprintf("Searching: %q", query))
		}
	}

	// Embed the query
	vectors, err := embedClient.Embed(ctx, []string{query}, nil)
	if err != nil {
		return fmt.Errorf("embed query: %w", err)
	}
	if len(vectors) == 0 || len(vectors[0]) == 0 {
		return fmt.Errorf("embedding returned empty vector")
	}

	// Search the index
	results := nlp.QueryIndex(idx, vectors[0], 10, filter)
	if len(results) == 0 {
		if cfg.JSONMode {
			output.PrintJSON(map[string]any{"command": "ask", "query": query, "results": []any{}})
			return nil
		}
		output.PrintWarning("No matches found.")
		return nil
	}

	// Render results
	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command": "ask",
			"query":   query,
			"results": results,
		})
		return nil
	}

	if cfg.AgentMode {
		fmt.Println("\n--- Found ---")
		for _, r := range results {
			loc := r.FilePath
			if r.StartLine > 0 && r.EndLine > r.StartLine {
				loc += fmt.Sprintf(":%d-%d", r.StartLine, r.EndLine)
			}
			fmt.Printf("%s (%.3f)\n", loc, r.Score)
		}
		return nil
	}

	// Human mode — group by file, show relevance bar + description
	grouped := groupResultsByFile(results)
	fmt.Println()
	output.PrintSuccess("Found it!")
	fmt.Println()

	for i, g := range grouped {
		if i >= 7 {
			break
		}
		renderFileResult(g)
	}

	// Summary
	extra := len(grouped) - 7
	if extra > 0 {
		output.PrintDim(fmt.Sprintf("  ... and %d more files", extra))
	}
	fmt.Println()
	return nil
}

// runCloudSearch runs the full agentic loop via a cloud LLM provider.
func runCloudSearch(ctx context.Context, cfg *config.Config, query string, filter *nlp.QueryFilter, onStatus func(string)) error {
	cloudModel := cfg.CloudModel
	if askFlagCloudModel != "" {
		cloudModel = askFlagCloudModel
	}
	if cfg.CloudAPIKey == "" {
		return fmt.Errorf("no API key found. Set GF_CLOUD_API_KEY env var or add \"openrouter_api_key\" to secrets.json")
	}

	client := nlp.NewCloudClient(cfg.CloudEndpoint, cloudModel, cfg.CloudAPIKey, 30*time.Second)
	onStatus(fmt.Sprintf("Using cloud model: %s", cloudModel))

	// Fetch pricing for cost tracking
	var pricing *nlp.ModelPricing
	if p, err := nlp.FetchModelPricing(ctx, cloudModel); err == nil {
		pricing = p
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

	// Load vector index for hybrid pre-search
	var idx *nlp.Index
	if !askFlagNoVectors {
		idx = loadSearchIndex(cfg, askFlagDocs, askFlagAll, onStatus)
		if idx != nil && idx.EmbedModel != "" {
			localEmbed := nlp.NewClientWithEmbed(cfg.LLMEndpoint, "", idx.EmbedModel, time.Duration(cfg.LLMTimeout)*time.Second)
			client.SetEmbedFrom(localEmbed)
		}
	}

	result, err := nlp.RunAgent(ctx, client, query, nlp.AgentOptions{
		MaxRounds: askFlagMaxRounds,
		Verbose:   cfg.Verbose,
		OnStatus:  onRoundStatus,
		Index:     idx,
		NoVectors: askFlagNoVectors,
		Filter:    filter,
		Pricing:   pricing,
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
		renderCostSummary(cfg, result)
		return renderGiveUp(cfg, result)
	}

	err = renderAnswer(cfg, result)
	renderCostSummary(cfg, result)
	return err
}

// renderCostSummary prints token usage and cost info to stderr (cloud mode only).
func renderCostSummary(cfg *config.Config, result *nlp.AgentResult) {
	if result.PromptTokens == 0 && result.CompletionTokens == 0 {
		return
	}
	if cfg.JSONMode {
		return
	}
	totalTokens := result.PromptTokens + result.CompletionTokens
	if cfg.AgentMode {
		fmt.Fprintf(os.Stderr, "--- tokens: %d prompt + %d completion = %d total", result.PromptTokens, result.CompletionTokens, totalTokens)
		if result.Cost > 0 {
			fmt.Fprintf(os.Stderr, " ($%.6f)", result.Cost)
		}
		fmt.Fprintln(os.Stderr, " ---")
	} else {
		costStr := ""
		if result.Cost > 0 {
			costStr = fmt.Sprintf("  cost: $%.6f", result.Cost)
		}
		output.PrintDim(fmt.Sprintf("  %d tokens (%d prompt + %d completion)%s", totalTokens, result.PromptTokens, result.CompletionTokens, costStr))
		fmt.Println()
	}
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

// fileGroup holds all results for a single file, with the best score.
type fileGroup struct {
	FilePath    string
	BestScore   float32
	Description string
	LineRange   string // e.g. "1-48" from the best-scoring chunk
	ChunkCount  int
}

// groupResultsByFile deduplicates results by file path, keeping best score and extracting a description.
func groupResultsByFile(results []nlp.SearchResult) []fileGroup {
	seen := make(map[string]*fileGroup)
	var order []string

	for _, r := range results {
		// Skip build artifacts
		if strings.Contains(r.FilePath, "/coverage/") || strings.Contains(r.FilePath, "/dist/") ||
			strings.Contains(r.FilePath, "/.preview/") || strings.HasPrefix(r.FilePath, ".preview/") ||
			strings.Contains(r.FilePath, "/node_modules/") {
			continue
		}
		if g, ok := seen[r.FilePath]; ok {
			g.ChunkCount++
			if r.Score > g.BestScore {
				g.BestScore = r.Score
				g.LineRange = fmt.Sprintf("%d-%d", r.StartLine, r.EndLine)
				if desc := extractDescription(r.Snippet); desc != "" {
					g.Description = desc
				}
			}
		} else {
			g := &fileGroup{
				FilePath:    r.FilePath,
				BestScore:   r.Score,
				Description: extractDescription(r.Snippet),
				LineRange:   fmt.Sprintf("%d-%d", r.StartLine, r.EndLine),
				ChunkCount:  1,
			}
			seen[r.FilePath] = g
			order = append(order, r.FilePath)
		}
	}

	groups := make([]fileGroup, 0, len(order))
	for _, path := range order {
		groups = append(groups, *seen[path])
	}
	return groups
}

// extractDescription pulls a readable description from a code snippet.
// Looks for JSDoc/Go-style comments, then falls back to the first meaningful line.
func extractDescription(snippet string) string {
	lines := strings.Split(snippet, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip empty lines, opening comment markers, import lines, boilerplate
		if trimmed == "" || trimmed == "/**" || trimmed == "*/" || trimmed == "/*" {
			continue
		}
		if strings.HasPrefix(trimmed, "import ") || strings.HasPrefix(trimmed, "import(") {
			continue
		}
		if strings.HasPrefix(trimmed, "// ====") || strings.HasPrefix(trimmed, "═") {
			continue
		}
		if strings.HasPrefix(trimmed, "<script") || strings.HasPrefix(trimmed, "</script") {
			continue
		}
		if strings.HasPrefix(trimmed, "<style") || strings.HasPrefix(trimmed, "</style") {
			continue
		}
		if strings.HasPrefix(trimmed, "/// <reference") {
			continue
		}
		// Skip shebangs and partial HTML fragments
		if strings.HasPrefix(trimmed, "#!") {
			continue
		}
		if len(trimmed) < 10 && (strings.HasSuffix(trimmed, ">") || strings.HasPrefix(trimmed, "<")) {
			continue
		}
		// Skip CSS property lines
		if strings.HasPrefix(trimmed, "font-") || strings.HasPrefix(trimmed, "animation") ||
			strings.HasPrefix(trimmed, "color:") || strings.HasPrefix(trimmed, "margin") {
			continue
		}

		// Strip comment prefixes
		if strings.HasPrefix(trimmed, "* ") {
			trimmed = trimmed[2:]
		} else if strings.HasPrefix(trimmed, "// ") {
			trimmed = trimmed[3:]
		} else if strings.HasPrefix(trimmed, "/// ") {
			trimmed = trimmed[4:]
		}

		// Skip @param, @returns, etc.
		if strings.HasPrefix(trimmed, "@") {
			continue
		}

		trimmed = strings.TrimSpace(trimmed)
		if trimmed == "" || len(trimmed) < 3 {
			continue
		}

		// Skip CSS selectors and other noise
		if strings.HasPrefix(trimmed, "*") && (strings.HasSuffix(trimmed, ",") || strings.HasSuffix(trimmed, "{")) {
			continue
		}
		if strings.HasPrefix(trimmed, ".") && !strings.Contains(trimmed, " ") {
			continue
		}

		// Truncate if too long
		if len(trimmed) > 80 {
			trimmed = trimmed[:77] + "..."
		}
		return trimmed
	}
	return ""
}

// renderFileResult renders a single file group with relevance bar and description.
func renderFileResult(g fileGroup) {
	// Relevance bar: map score to 1-8 filled blocks
	bar := relevanceBar(g.BestScore)

	// Shorten the file path for display: remove leading dirs that are obvious
	displayPath := g.FilePath

	// Show the bar + file path
	output.PrintColor("#4a7c59", fmt.Sprintf("  %s  %s", bar, displayPath))

	// Show description if we have one
	if g.Description != "" {
		output.PrintDim(fmt.Sprintf("       %s", g.Description))
	}

	// Show chunk count if multiple
	if g.ChunkCount > 1 {
		output.PrintDim(fmt.Sprintf("       (%d matching sections)", g.ChunkCount))
	}
}

// relevanceBar creates a visual bar like "████░░░░" from a cosine similarity score.
// Scores typically range from ~0.3 to ~0.7 for real matches.
func relevanceBar(score float32) string {
	const barLen = 8
	// Map score: 0.3 → 1 block, 0.7+ → 8 blocks
	normalized := (float64(score) - 0.3) / 0.4
	if normalized < 0 {
		normalized = 0
	}
	if normalized > 1 {
		normalized = 1
	}
	filled := int(math.Round(normalized * barLen))
	if filled < 1 {
		filled = 1
	}
	return strings.Repeat("█", filled) + strings.Repeat("░", barLen-filled)
}

// shortenPath trims a file path to make it more readable in terminal output.
func shortenPath(path string) string {
	// Remove ./ prefix
	path = strings.TrimPrefix(path, "./")

	// For very deep paths, show package/dir + filename
	parts := strings.Split(path, string(filepath.Separator))
	if len(parts) > 5 {
		return strings.Join(parts[:2], "/") + "/.../" + parts[len(parts)-1]
	}
	return path
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
