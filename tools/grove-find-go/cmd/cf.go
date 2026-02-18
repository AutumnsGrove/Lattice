package cmd

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/spf13/cobra"
	"golang.org/x/sync/errgroup"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
)

// ---------- cf (parent command with default overview) ----------

var cfCmd = &cobra.Command{
	Use:   "cf",
	Short: "Cloudflare bindings and infrastructure commands",
	Long: `Cloudflare subcommands for exploring D1 databases, KV namespaces,
R2 storage, and Durable Objects across the codebase.

When run without a subcommand, shows a full bindings overview.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return cfOverview()
	},
}

func init() {
	cfCmd.AddCommand(cfD1Cmd)
	cfCmd.AddCommand(cfKVCmd)
	cfCmd.AddCommand(cfR2Cmd)
	cfCmd.AddCommand(cfDOCmd)
}

// cfOverview shows all Cloudflare bindings across the codebase.
func cfOverview() error {
	cfg := config.Get()

	type sectionResult struct {
		title string
		lines []string
	}

	results := make([]sectionResult, 4)
	g, ctx := errgroup.WithContext(context.Background())

	// D1 bindings.
	g.Go(func() error {
		out, err := search.RunRg(`\bD1Database\b|d1_databases|binding\s*=.*D1`,
			search.WithContext(ctx), search.WithGlob("*.{toml,ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("D1 Databases: %w", err)
		}
		results[0] = sectionResult{title: "D1 Databases", lines: search.SplitLines(out)}
		return nil
	})

	// KV bindings.
	g.Go(func() error {
		out, err := search.RunRg(`\bKVNamespace\b|kv_namespaces|binding\s*=.*KV`,
			search.WithContext(ctx), search.WithGlob("*.{toml,ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("KV Namespaces: %w", err)
		}
		results[1] = sectionResult{title: "KV Namespaces", lines: search.SplitLines(out)}
		return nil
	})

	// R2 bindings.
	g.Go(func() error {
		out, err := search.RunRg(`\bR2Bucket\b|r2_buckets|binding\s*=.*R2`,
			search.WithContext(ctx), search.WithGlob("*.{toml,ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("R2 Buckets: %w", err)
		}
		results[2] = sectionResult{title: "R2 Buckets", lines: search.SplitLines(out)}
		return nil
	})

	// Durable Objects.
	g.Go(func() error {
		out, err := search.RunRg(`\bDurableObject\b|durable_objects|DurableObjectNamespace`,
			search.WithContext(ctx), search.WithGlob("*.{toml,ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("Durable Objects: %w", err)
		}
		results[3] = sectionResult{title: "Durable Objects", lines: search.SplitLines(out)}
		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	if cfg.JSONMode {
		data := map[string]any{
			"command": "cf",
		}
		for _, r := range results {
			key := strings.ToLower(strings.ReplaceAll(r.title, " ", "_"))
			data[key] = map[string]any{
				"count":   len(r.lines),
				"results": r.lines,
			}
		}
		output.PrintJSON(data)
		return nil
	}

	output.PrintMajorHeader("Cloudflare Bindings Overview")

	for _, r := range results {
		output.PrintSection(r.title)
		if len(r.lines) > 0 {
			show, overflow := output.TruncateResults(r.lines, 25)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if overflow > 0 {
				output.Printf("  ... and %d more", overflow)
			}
		} else {
			output.PrintNoResults(strings.ToLower(r.title))
		}
	}

	return nil
}

// ---------- d1 [pattern] ----------

var cfD1Cmd = &cobra.Command{
	Use:   "d1 [pattern]",
	Short: "D1 database usage: bindings, queries, schema references",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}

		if pattern != "" {
			return cfD1Filtered(cfg, pattern)
		}
		return cfD1Full(cfg)
	},
}

func cfD1Filtered(cfg *config.Config, pattern string) error {
	// Search for D1-related code filtered by the pattern.
	d1Pattern := fmt.Sprintf(`(%s).*(\bD1\b|d1_databases|\.prepare\b|\.exec\b|\.all\b|\.first\b|\.run\b|\.batch\b)|(\bD1\b|d1_databases|\.prepare\b|\.exec\b|\.all\b|\.first\b|\.run\b|\.batch\b).*(%s)`, pattern, pattern)
	result, err := search.RunRg(d1Pattern,
		search.WithGlob("*.{toml,ts,js,svelte,sql}"))
	if err != nil {
		// Fall back to a simpler combined search.
		result, err = search.RunRg(pattern,
			search.WithGlob("*.{toml,ts,js,svelte,sql}"))
		if err != nil {
			return fmt.Errorf("D1 search failed: %w", err)
		}
	}

	lines := search.SplitLines(result)

	// Also search for schema references.
	schemaResult, _ := search.RunRg(pattern, search.WithGlob("*.sql"))
	schemaLines := search.SplitLines(schemaResult)

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":     "cf d1",
			"pattern":     pattern,
			"results":     lines,
			"schema_refs": schemaLines,
			"count":       len(lines),
		})
		return nil
	}

	output.PrintSection(fmt.Sprintf("D1 references matching: %s", pattern))

	if len(lines) > 0 {
		show, overflow := output.TruncateResults(lines, 30)
		output.PrintRaw(strings.Join(show, "\n") + "\n")
		if overflow > 0 {
			output.Printf("  ... and %d more", overflow)
		}
	} else {
		output.PrintNoResults("D1 references")
	}

	if len(schemaLines) > 0 {
		output.PrintSection("Schema References")
		show, overflow := output.TruncateResults(schemaLines, 20)
		output.PrintRaw(strings.Join(show, "\n") + "\n")
		if overflow > 0 {
			output.Printf("  ... and %d more", overflow)
		}
	}

	return nil
}

func cfD1Full(cfg *config.Config) error {
	type sectionResult struct {
		title string
		lines []string
	}

	results := make([]sectionResult, 4)
	g, ctx := errgroup.WithContext(context.Background())

	// D1 bindings in wrangler config.
	g.Go(func() error {
		out, err := search.RunRg(`d1_databases|D1Database|\[\[d1`,
			search.WithContext(ctx), search.WithGlob("*.{toml,ts}"))
		if err != nil {
			return fmt.Errorf("D1 Bindings: %w", err)
		}
		results[0] = sectionResult{title: "D1 Bindings", lines: search.SplitLines(out)}
		return nil
	})

	// Query operations (.prepare, .exec, .all, .first, .run, .batch).
	g.Go(func() error {
		out, err := search.RunRg(`\.prepare\s*\(|\.exec\s*\(|\.all\s*\(|\.first\s*\(|\.run\s*\(|\.batch\s*\(`,
			search.WithContext(ctx), search.WithGlob("*.{ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("Query Operations: %w", err)
		}
		results[1] = sectionResult{title: "Query Operations", lines: search.SplitLines(out)}
		return nil
	})

	// SQL files.
	g.Go(func() error {
		files, err := search.FindFilesByGlob([]string{"*.sql"})
		if err != nil {
			return fmt.Errorf("SQL Files: %w", err)
		}
		results[2] = sectionResult{title: "SQL Files", lines: files}
		return nil
	})

	// Wrangler D1 config sections.
	g.Go(func() error {
		out, err := search.RunRg(`database_name|database_id`,
			search.WithContext(ctx), search.WithGlob("wrangler*.toml"))
		if err != nil {
			return fmt.Errorf("Wrangler D1 Config: %w", err)
		}
		results[3] = sectionResult{title: "Wrangler D1 Config", lines: search.SplitLines(out)}
		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	if cfg.JSONMode {
		data := map[string]any{"command": "cf d1"}
		for _, r := range results {
			key := strings.ToLower(strings.ReplaceAll(r.title, " ", "_"))
			data[key] = map[string]any{
				"count":   len(r.lines),
				"results": r.lines,
			}
		}
		output.PrintJSON(data)
		return nil
	}

	output.PrintMajorHeader("D1 Database Overview")

	for _, r := range results {
		output.PrintSection(r.title)
		if len(r.lines) > 0 {
			show, overflow := output.TruncateResults(r.lines, 25)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if overflow > 0 {
				output.Printf("  ... and %d more", overflow)
			}
		} else {
			output.PrintNoResults(strings.ToLower(r.title))
		}
	}

	return nil
}

// ---------- kv [pattern] ----------

var cfKVCmd = &cobra.Command{
	Use:   "kv [pattern]",
	Short: "KV namespace usage: bindings, operations, config",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}

		if pattern != "" {
			return cfKVFiltered(cfg, pattern)
		}
		return cfKVFull(cfg)
	},
}

func cfKVFiltered(cfg *config.Config, pattern string) error {
	kvPattern := fmt.Sprintf(`(%s).*(\bKV\b|KVNamespace|kv_namespaces|\.get\s*\(|\.put\s*\(|\.delete\s*\(|\.list\s*\()|(\bKV\b|KVNamespace|kv_namespaces|\.get\s*\(|\.put\s*\(|\.delete\s*\(|\.list\s*\().*(%s)`, pattern, pattern)
	result, err := search.RunRg(kvPattern,
		search.WithGlob("*.{toml,ts,js,svelte}"))
	if err != nil {
		result, err = search.RunRg(pattern,
			search.WithGlob("*.{toml,ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("KV search failed: %w", err)
		}
	}

	lines := search.SplitLines(result)

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command": "cf kv",
			"pattern": pattern,
			"results": lines,
			"count":   len(lines),
		})
		return nil
	}

	output.PrintSection(fmt.Sprintf("KV references matching: %s", pattern))

	if len(lines) > 0 {
		show, overflow := output.TruncateResults(lines, 30)
		output.PrintRaw(strings.Join(show, "\n") + "\n")
		if overflow > 0 {
			output.Printf("  ... and %d more", overflow)
		}
	} else {
		output.PrintNoResults("KV references")
	}

	return nil
}

func cfKVFull(cfg *config.Config) error {
	type sectionResult struct {
		title string
		lines []string
	}

	results := make([]sectionResult, 3)
	g, ctx := errgroup.WithContext(context.Background())

	// KV bindings.
	g.Go(func() error {
		out, err := search.RunRg(`kv_namespaces|KVNamespace|\[\[kv`,
			search.WithContext(ctx), search.WithGlob("*.{toml,ts}"))
		if err != nil {
			return fmt.Errorf("KV Bindings: %w", err)
		}
		results[0] = sectionResult{title: "KV Bindings", lines: search.SplitLines(out)}
		return nil
	})

	// KV operations.
	g.Go(func() error {
		out, err := search.RunRg(`\.get\s*\(|\.put\s*\(|\.delete\s*\(|\.list\s*\(|\.getWithMetadata\s*\(`,
			search.WithContext(ctx), search.WithGlob("*.{ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("KV Operations: %w", err)
		}
		results[1] = sectionResult{title: "KV Operations", lines: search.SplitLines(out)}
		return nil
	})

	// Wrangler KV config.
	g.Go(func() error {
		out, err := search.RunRg(`kv_namespaces|preview_id|namespace_id`,
			search.WithContext(ctx), search.WithGlob("wrangler*.toml"))
		if err != nil {
			return fmt.Errorf("Wrangler KV Config: %w", err)
		}
		results[2] = sectionResult{title: "Wrangler KV Config", lines: search.SplitLines(out)}
		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	if cfg.JSONMode {
		data := map[string]any{"command": "cf kv"}
		for _, r := range results {
			key := strings.ToLower(strings.ReplaceAll(r.title, " ", "_"))
			data[key] = map[string]any{
				"count":   len(r.lines),
				"results": r.lines,
			}
		}
		output.PrintJSON(data)
		return nil
	}

	output.PrintMajorHeader("KV Namespace Overview")

	for _, r := range results {
		output.PrintSection(r.title)
		if len(r.lines) > 0 {
			show, overflow := output.TruncateResults(r.lines, 25)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if overflow > 0 {
				output.Printf("  ... and %d more", overflow)
			}
		} else {
			output.PrintNoResults(strings.ToLower(r.title))
		}
	}

	return nil
}

// ---------- r2 [pattern] ----------

var cfR2Cmd = &cobra.Command{
	Use:   "r2 [pattern]",
	Short: "R2 storage usage: bindings, operations, config",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}

		if pattern != "" {
			return cfR2Filtered(cfg, pattern)
		}
		return cfR2Full(cfg)
	},
}

func cfR2Filtered(cfg *config.Config, pattern string) error {
	r2Pattern := fmt.Sprintf(`(%s).*(\bR2\b|R2Bucket|r2_buckets|\.put\s*\(|\.get\s*\(|\.delete\s*\(|\.list\s*\()|(\bR2\b|R2Bucket|r2_buckets|\.put\s*\(|\.get\s*\(|\.delete\s*\(|\.list\s*\().*(%s)`, pattern, pattern)
	result, err := search.RunRg(r2Pattern,
		search.WithGlob("*.{toml,ts,js,svelte}"))
	if err != nil {
		result, err = search.RunRg(pattern,
			search.WithGlob("*.{toml,ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("R2 search failed: %w", err)
		}
	}

	lines := search.SplitLines(result)

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command": "cf r2",
			"pattern": pattern,
			"results": lines,
			"count":   len(lines),
		})
		return nil
	}

	output.PrintSection(fmt.Sprintf("R2 references matching: %s", pattern))

	if len(lines) > 0 {
		show, overflow := output.TruncateResults(lines, 30)
		output.PrintRaw(strings.Join(show, "\n") + "\n")
		if overflow > 0 {
			output.Printf("  ... and %d more", overflow)
		}
	} else {
		output.PrintNoResults("R2 references")
	}

	return nil
}

func cfR2Full(cfg *config.Config) error {
	type sectionResult struct {
		title string
		lines []string
	}

	results := make([]sectionResult, 3)
	g, ctx := errgroup.WithContext(context.Background())

	// R2 bindings.
	g.Go(func() error {
		out, err := search.RunRg(`r2_buckets|R2Bucket|\[\[r2`,
			search.WithContext(ctx), search.WithGlob("*.{toml,ts}"))
		if err != nil {
			return fmt.Errorf("R2 Bindings: %w", err)
		}
		results[0] = sectionResult{title: "R2 Bindings", lines: search.SplitLines(out)}
		return nil
	})

	// R2 operations.
	g.Go(func() error {
		out, err := search.RunRg(`\.put\s*\(|\.get\s*\(|\.delete\s*\(|\.list\s*\(|\.head\s*\(|\.createMultipartUpload\s*\(`,
			search.WithContext(ctx), search.WithGlob("*.{ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("R2 Operations: %w", err)
		}
		results[1] = sectionResult{title: "R2 Operations", lines: search.SplitLines(out)}
		return nil
	})

	// Wrangler R2 config.
	g.Go(func() error {
		out, err := search.RunRg(`r2_buckets|bucket_name`,
			search.WithContext(ctx), search.WithGlob("wrangler*.toml"))
		if err != nil {
			return fmt.Errorf("Wrangler R2 Config: %w", err)
		}
		results[2] = sectionResult{title: "Wrangler R2 Config", lines: search.SplitLines(out)}
		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	if cfg.JSONMode {
		data := map[string]any{"command": "cf r2"}
		for _, r := range results {
			key := strings.ToLower(strings.ReplaceAll(r.title, " ", "_"))
			data[key] = map[string]any{
				"count":   len(r.lines),
				"results": r.lines,
			}
		}
		output.PrintJSON(data)
		return nil
	}

	output.PrintMajorHeader("R2 Storage Overview")

	for _, r := range results {
		output.PrintSection(r.title)
		if len(r.lines) > 0 {
			show, overflow := output.TruncateResults(r.lines, 25)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if overflow > 0 {
				output.Printf("  ... and %d more", overflow)
			}
		} else {
			output.PrintNoResults(strings.ToLower(r.title))
		}
	}

	return nil
}

// ---------- do [name] ----------

var cfDOCmd = &cobra.Command{
	Use:   "do [name]",
	Short: "Durable Objects usage: classes, stubs, config",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		name := ""
		if len(args) > 0 {
			name = args[0]
		}

		if name != "" {
			return cfDOFiltered(cfg, name)
		}
		return cfDOFull(cfg)
	},
}

func cfDOFiltered(cfg *config.Config, name string) error {
	// Search for DO-related code filtered by the name.
	doPattern := fmt.Sprintf(`(%s).*(\bDurableObject\b|DurableObjectNamespace|DurableObjectStub|durable_objects)|(\bDurableObject\b|DurableObjectNamespace|DurableObjectStub|durable_objects).*(%s)`, name, name)
	result, err := search.RunRg(doPattern,
		search.WithGlob("*.{toml,ts,js,svelte}"))
	if err != nil {
		// Fall back to name-only search in DO-related files.
		result, err = search.RunRg(name,
			search.WithGlob("*.{toml,ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("DO search failed: %w", err)
		}
	}

	lines := search.SplitLines(result)

	// Also search for the class definition specifically.
	classPattern := fmt.Sprintf(`class\s+%s.*DurableObject|export\s+class\s+%s`, name, name)
	classResult, _ := search.RunRg(classPattern,
		search.WithGlob("*.{ts,js}"))
	classLines := search.SplitLines(classResult)

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":    "cf do",
			"name":       name,
			"results":    lines,
			"class_defs": classLines,
			"count":      len(lines),
		})
		return nil
	}

	output.PrintSection(fmt.Sprintf("Durable Object references matching: %s", name))

	if len(classLines) > 0 {
		output.PrintSection("Class Definitions")
		output.PrintRaw(strings.Join(classLines, "\n") + "\n")
	}

	if len(lines) > 0 {
		output.PrintSection("All References")
		show, overflow := output.TruncateResults(lines, 30)
		output.PrintRaw(strings.Join(show, "\n") + "\n")
		if overflow > 0 {
			output.Printf("  ... and %d more", overflow)
		}
	} else {
		output.PrintNoResults("DO references")
	}

	return nil
}

func cfDOFull(cfg *config.Config) error {
	type sectionResult struct {
		title string
		lines []string
	}

	results := make([]sectionResult, 4)
	g, ctx := errgroup.WithContext(context.Background())

	// DO class definitions.
	g.Go(func() error {
		out, err := search.RunRg(`class\s+\w+.*(?:extends\s+DurableObject|implements\s+DurableObject)`,
			search.WithContext(ctx), search.WithGlob("*.{ts,js}"))
		if err != nil {
			return fmt.Errorf("DO Class Definitions: %w", err)
		}
		results[0] = sectionResult{title: "DO Class Definitions", lines: search.SplitLines(out)}
		return nil
	})

	// DO-related files.
	g.Go(func() error {
		files, err := search.FindFiles("durable", search.WithGlob("*.{ts,js}"))
		if err != nil {
			return fmt.Errorf("DO Files: %w", err)
		}
		results[1] = sectionResult{title: "DO Files", lines: files}
		return nil
	})

	// Stub usage (idFromName, idFromString, get).
	g.Go(func() error {
		out, err := search.RunRg(`\.idFromName\s*\(|\.idFromString\s*\(|DurableObjectNamespace|\.get\s*\(\s*id\b`,
			search.WithContext(ctx), search.WithGlob("*.{ts,js,svelte}"))
		if err != nil {
			return fmt.Errorf("Stub Usage: %w", err)
		}
		results[2] = sectionResult{title: "Stub Usage", lines: search.SplitLines(out)}
		return nil
	})

	// Wrangler DO config.
	g.Go(func() error {
		out, err := search.RunRg(`durable_objects|class_name|script_name`,
			search.WithContext(ctx), search.WithGlob("wrangler*.toml"))
		if err != nil {
			return fmt.Errorf("Wrangler DO Config: %w", err)
		}
		results[3] = sectionResult{title: "Wrangler DO Config", lines: search.SplitLines(out)}
		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	if cfg.JSONMode {
		data := map[string]any{"command": "cf do"}
		for _, r := range results {
			key := strings.ToLower(strings.ReplaceAll(r.title, " ", "_"))
			data[key] = map[string]any{
				"count":   len(r.lines),
				"results": r.lines,
			}
		}
		output.PrintJSON(data)
		return nil
	}

	output.PrintMajorHeader("Durable Objects Overview")

	for _, r := range results {
		output.PrintSection(r.title)
		if len(r.lines) > 0 {
			show, overflow := output.TruncateResults(r.lines, 25)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if overflow > 0 {
				output.Printf("  ... and %d more", overflow)
			}
		} else {
			output.PrintNoResults(strings.ToLower(r.title))
		}
	}

	// Provide a summary count of unique DO classes found.
	classDefs := results[0].lines
	if len(classDefs) > 0 {
		classNames := make(map[string]bool)
		for _, line := range classDefs {
			// Extract class name from "class Foo extends..."
			parts := strings.Fields(line)
			for i, p := range parts {
				if p == "class" && i+1 < len(parts) {
					classNames[parts[i+1]] = true
					break
				}
			}
		}
		if len(classNames) > 0 {
			sorted := make([]string, 0, len(classNames))
			for name := range classNames {
				sorted = append(sorted, name)
			}
			sort.Strings(sorted)
			output.PrintSection("Summary")
			output.Printf("  DO classes: %s", strings.Join(sorted, ", "))
		}
	}

	return nil
}
