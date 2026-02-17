package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
)

// fileSearch is a generic helper that finds files by extension glob patterns,
// optionally filtered by a name pattern, and prints the results.
func fileSearch(extension string, pattern string, description string, excludes []string) error {
	return fileSearchMulti([]string{extension}, pattern, description, excludes)
}

// fileSearchMulti handles multiple extensions (e.g. yaml: ["yml", "yaml"]).
func fileSearchMulti(extensions []string, pattern string, description string, excludes []string) error {
	cfg := config.Get()

	// Build glob patterns: "*.svelte", "*.ts", etc.
	globs := make([]string, 0, len(extensions)+len(excludes))
	for _, ext := range extensions {
		globs = append(globs, "*."+ext)
	}

	// Build search options with exclusion globs.
	var opts []search.Option
	for _, exc := range excludes {
		opts = append(opts, search.WithExcludes(append(search.DefaultExcludes, "--glob", "!"+exc)))
	}

	files, err := search.FindFilesByGlob(globs, opts...)
	if err != nil {
		return fmt.Errorf("file search failed: %w", err)
	}

	// Filter by pattern if provided.
	if pattern != "" && len(files) > 0 {
		lowerPattern := strings.ToLower(pattern)
		filtered := make([]string, 0)
		for _, f := range files {
			if strings.Contains(strings.ToLower(f), lowerPattern) {
				filtered = append(filtered, f)
			}
		}
		files = filtered
	}

	// Apply exclude patterns manually (for rg fallback where globs may not exclude).
	if len(excludes) > 0 && len(files) > 0 {
		filtered := make([]string, 0, len(files))
		for _, f := range files {
			excluded := false
			for _, exc := range excludes {
				// Simple glob match: "*.d.ts" -> check suffix ".d.ts"
				if strings.HasPrefix(exc, "*") {
					suffix := exc[1:] // e.g. ".d.ts"
					if strings.HasSuffix(f, suffix) {
						excluded = true
						break
					}
				} else if strings.Contains(f, exc) {
					excluded = true
					break
				}
			}
			if !excluded {
				filtered = append(filtered, f)
			}
		}
		files = filtered
	}

	// JSON output mode.
	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"files": files,
			"count": len(files),
		})
		return nil
	}

	// Print section header.
	if pattern != "" {
		output.PrintSection(fmt.Sprintf("%s matching: %s", description, pattern))
	} else {
		output.PrintSection(description)
	}

	if len(files) == 0 {
		output.PrintNoResults("files")
		return nil
	}

	// Truncate to 50 results.
	const limit = 50
	truncated := false
	if len(files) > limit {
		files = files[:limit]
		truncated = true
	}

	output.PrintRaw(strings.Join(files, "\n") + "\n")

	if truncated {
		output.Print(fmt.Sprintf("\n(Showing first %d results. Add a pattern to filter.)", limit))
	}

	return nil
}

// --- Svelte ---

var svelteCmd = &cobra.Command{
	Use:   "svelte [pattern]",
	Short: "Find Svelte component files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("svelte", pattern, "Svelte components", nil)
	},
}

// --- TypeScript ---

var tsCmd = &cobra.Command{
	Use:   "ts [pattern]",
	Short: "Find TypeScript files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("ts", pattern, "TypeScript files", []string{"*.d.ts"})
	},
}

// --- JavaScript ---

var jsCmd = &cobra.Command{
	Use:   "js [pattern]",
	Short: "Find JavaScript files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("js", pattern, "JavaScript files", []string{"*.min.js"})
	},
}

// --- CSS ---

var cssCmd = &cobra.Command{
	Use:   "css [pattern]",
	Short: "Find CSS files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("css", pattern, "CSS files", []string{"*.min.css"})
	},
}

// --- Markdown ---

var mdCmd = &cobra.Command{
	Use:   "md [pattern]",
	Short: "Find Markdown files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("md", pattern, "Markdown files", nil)
	},
}

// --- JSON ---

var jsonCmd = &cobra.Command{
	Use:   "json [pattern]",
	Short: "Find JSON files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("json", pattern, "JSON files", []string{"package-lock.json"})
	},
}

// --- TOML ---

var tomlCmd = &cobra.Command{
	Use:   "toml [pattern]",
	Short: "Find TOML files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("toml", pattern, "TOML files", nil)
	},
}

// --- YAML ---

var yamlCmd = &cobra.Command{
	Use:   "yaml [pattern]",
	Short: "Find YAML files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearchMulti([]string{"yml", "yaml"}, pattern, "YAML files", nil)
	},
}

// --- HTML ---

var htmlCmd = &cobra.Command{
	Use:   "html [pattern]",
	Short: "Find HTML files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearch("html", pattern, "HTML files", nil)
	},
}

// --- Shell ---

var shellCmd = &cobra.Command{
	Use:   "shell [pattern]",
	Short: "Find shell script files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}
		return fileSearchMulti([]string{"sh", "bash", "zsh"}, pattern, "Shell scripts", nil)
	},
}

// --- Test ---

var testCmd = &cobra.Command{
	Use:   "test [name]",
	Short: "Find test files and test directories",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := ""
		if len(args) > 0 {
			name = args[0]
		}
		return runTestSearch(name)
	},
}

func runTestSearch(name string) error {
	cfg := config.Get()

	// Find test files matching .(test|spec).(ts|js)$ via glob patterns.
	testGlobs := []string{
		"*.test.ts",
		"*.test.js",
		"*.spec.ts",
		"*.spec.js",
	}

	files, err := search.FindFilesByGlob(testGlobs)
	if err != nil {
		return fmt.Errorf("test file search failed: %w", err)
	}

	// Filter by name if provided.
	if name != "" && len(files) > 0 {
		lowerName := strings.ToLower(name)
		filtered := make([]string, 0)
		for _, f := range files {
			if strings.Contains(strings.ToLower(f), lowerName) {
				filtered = append(filtered, f)
			}
		}
		files = filtered
	}

	// Also find test directories.
	testDirGlobs := []string{
		"**/test/",
		"**/tests/",
		"**/__tests__/",
	}
	dirs, _ := search.FindFiles("", search.WithGlobs(testDirGlobs...))

	// Filter directories to only include actual test dirs.
	testDirs := make([]string, 0)
	for _, d := range dirs {
		lower := strings.ToLower(d)
		if strings.Contains(lower, "/test") || strings.Contains(lower, "/__tests__") || strings.HasSuffix(lower, "test") || strings.HasSuffix(lower, "tests") || strings.HasSuffix(lower, "__tests__") {
			testDirs = append(testDirs, d)
		}
	}

	// JSON output mode.
	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"files": files,
			"count": len(files),
		})
		return nil
	}

	// Print test files section.
	if name != "" {
		output.PrintSection(fmt.Sprintf("Test files matching: %s", name))
	} else {
		output.PrintSection("Test files")
	}

	if len(files) == 0 {
		output.PrintNoResults("test files")
	} else {
		const limit = 30
		displayed := files
		if len(displayed) > limit {
			displayed = displayed[:limit]
		}
		output.PrintRaw(strings.Join(displayed, "\n") + "\n")
		if len(files) > limit {
			output.Print(fmt.Sprintf("\n(Showing first %d of %d test files)", limit, len(files)))
		}
	}

	// Print test directories section.
	output.PrintSection("Test Directories")
	if len(testDirs) == 0 {
		output.Print("  (no test directories found)")
	} else {
		displayed := testDirs
		if len(displayed) > 20 {
			displayed = displayed[:20]
		}
		output.PrintRaw(strings.Join(displayed, "\n") + "\n")
	}

	return nil
}

// --- Config ---

var configCmd = &cobra.Command{
	Use:   "config [name]",
	Short: "Find configuration files",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := ""
		if len(args) > 0 {
			name = args[0]
		}
		return runConfigSearch(name)
	},
}

func runConfigSearch(name string) error {
	cfg := config.Get()

	if name != "" {
		return runConfigSearchByName(name)
	}

	// JSON mode: collect all config files into a single response.
	if cfg.JSONMode {
		allFiles := make([]string, 0)

		buildGlobs := []string{
			"**/vite.config.*",
			"**/svelte.config.*",
			"**/tailwind.config.*",
			"**/postcss.config.*",
			"**/tsconfig.config.*",
			"**/jsconfig.config.*",
		}
		if files, err := search.FindFilesByGlob(buildGlobs); err == nil {
			allFiles = append(allFiles, files...)
		}

		if files, err := search.FindFilesByGlob([]string{"**/wrangler*.toml"}); err == nil {
			allFiles = append(allFiles, files...)
		}

		if files, err := search.FindFilesByGlob([]string{"**/package.json"}); err == nil {
			allFiles = append(allFiles, files...)
		}

		if files, err := search.FindFilesByGlob([]string{"**/tsconfig*.json"}); err == nil {
			allFiles = append(allFiles, files...)
		}

		output.PrintJSON(map[string]any{
			"files": allFiles,
			"count": len(allFiles),
		})
		return nil
	}

	output.PrintSection("Configuration files")

	// Build & Bundler Configs
	output.PrintSection("Build & Bundler Configs")
	buildGlobs := []string{
		"**/vite.config.*",
		"**/svelte.config.*",
		"**/tailwind.config.*",
		"**/postcss.config.*",
		"**/tsconfig.config.*",
		"**/jsconfig.config.*",
	}
	buildFiles, err := search.FindFilesByGlob(buildGlobs)
	if err != nil {
		return fmt.Errorf("config search failed: %w", err)
	}
	if len(buildFiles) > 0 {
		output.PrintRaw(strings.Join(buildFiles, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	// Wrangler Configs
	output.PrintSection("Wrangler Configs")
	wranglerFiles, err := search.FindFilesByGlob([]string{"**/wrangler*.toml"})
	if err != nil {
		return fmt.Errorf("config search failed: %w", err)
	}
	if len(wranglerFiles) > 0 {
		output.PrintRaw(strings.Join(wranglerFiles, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	// Package Configs
	output.PrintSection("Package Configs")
	pkgFiles, err := search.FindFilesByGlob([]string{"**/package.json"})
	if err != nil {
		return fmt.Errorf("config search failed: %w", err)
	}
	if len(pkgFiles) > 0 {
		displayed := pkgFiles
		if len(displayed) > 20 {
			displayed = displayed[:20]
		}
		output.PrintRaw(strings.Join(displayed, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	// TypeScript Configs
	output.PrintSection("TypeScript Configs")
	tsFiles, err := search.FindFilesByGlob([]string{"**/tsconfig*.json"})
	if err != nil {
		return fmt.Errorf("config search failed: %w", err)
	}
	if len(tsFiles) > 0 {
		output.PrintRaw(strings.Join(tsFiles, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	return nil
}

func runConfigSearchByName(name string) error {
	cfg := config.Get()

	// Search for files matching the name that look like config files.
	files, err := search.FindFiles(name)
	if err != nil {
		return fmt.Errorf("config search failed: %w", err)
	}

	// Filter to only config-like files.
	configKeywords := []string{"config", "rc", ".toml", ".json", ".yaml", ".yml"}
	filtered := make([]string, 0)
	for _, f := range files {
		lower := strings.ToLower(f)
		for _, kw := range configKeywords {
			if strings.Contains(lower, kw) {
				filtered = append(filtered, f)
				break
			}
		}
	}

	// JSON output mode.
	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"files": filtered,
			"count": len(filtered),
		})
		return nil
	}

	output.PrintSection(fmt.Sprintf("Configuration files matching: %s", name))

	if len(filtered) == 0 {
		output.PrintNoResults("matching config files")
	} else {
		output.PrintRaw(strings.Join(filtered, "\n") + "\n")
	}

	return nil
}
