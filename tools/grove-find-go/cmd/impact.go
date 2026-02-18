package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
	"golang.org/x/sync/errgroup"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
)

// ---------- impact ----------

var impactCmd = &cobra.Command{
	Use:   "impact <file_path>",
	Short: "Full impact analysis for a file",
	Long: `Shows what breaks if you change a file:
- Direct importers (who imports this file?)
- Test coverage (which tests cover this?)
- Route exposure (is this used in routes?)
- Affected packages`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runImpact(args[0])
	},
}

func runImpact(filePath string) error {
	cfg := config.Get()
	root := cfg.GroveRoot

	// Normalize to relative path.
	targetRel := filePath
	if filepath.IsAbs(filePath) {
		rel, err := filepath.Rel(root, filePath)
		if err == nil {
			targetRel = rel
		}
	}
	// Clean up the path (remove leading ./ etc.)
	targetRel = filepath.Clean(targetRel)

	// Determine the stem (filename without extension) for import matching.
	stem := filenameStem(targetRel)

	// Build import patterns for searching.
	// Strip the extension for import resolution.
	importPath := targetRel
	for _, ext := range []string{".ts", ".js", ".svelte"} {
		importPath = strings.TrimSuffix(importPath, ext)
	}

	importPatterns := []string{}

	// Convert packages/X/src/Y (or apps/X/src/Y, etc.) to $lib/Y style import path.
	{
		parts := strings.Split(importPath, "/")
		if len(parts) > 3 && isPackageDir(parts[0]) && parts[2] == "src" {
			libPath := strings.Join(parts[3:], "/")
			importPatterns = append(importPatterns, libPath)
		}
	}

	importPatterns = append(importPatterns, stem)
	importPatterns = append(importPatterns, targetRel)

	// Run all three searches in parallel.
	type sectionResult struct {
		items []string
	}

	results := make([]sectionResult, 3)
	g, ctx := errgroup.WithContext(context.Background())

	// 1. Find direct importers (parallel over patterns, then dedupe).
	g.Go(func() error {
		seen := make(map[string]bool)
		var allImporters []string

		for _, pattern := range importPatterns {
			escaped := regexp.QuoteMeta(pattern)
			rgPattern := fmt.Sprintf(`(from|import).*%s`, escaped)
			out, err := search.RunRg(rgPattern,
				search.WithContext(ctx),
				search.WithType("ts"),
				search.WithGlob("*.svelte"),
				search.WithExtraArgs("-l"),
			)
			if err != nil {
				return fmt.Errorf("importer search failed: %w", err)
			}
			for _, line := range search.SplitLines(out) {
				if line != targetRel && !seen[line] {
					seen[line] = true
					allImporters = append(allImporters, line)
				}
			}
		}

		results[0] = sectionResult{items: allImporters}
		return nil
	})

	// 2. Find test files referencing the module.
	g.Go(func() error {
		seen := make(map[string]bool)
		var tests []string

		// Search test/spec files for references to the stem.
		out, err := search.RunRg(stem,
			search.WithContext(ctx),
			search.WithGlob("*.test.*"),
			search.WithGlob("*.spec.*"),
			search.WithExtraArgs("-l"),
		)
		if err != nil {
			return fmt.Errorf("test search failed: %w", err)
		}
		for _, line := range search.SplitLines(out) {
			if !seen[line] {
				seen[line] = true
				tests = append(tests, line)
			}
		}

		// Also check for co-located test files.
		dir := filepath.Dir(targetRel)
		coLocated := []string{
			filepath.Join(dir, stem+".test.ts"),
			filepath.Join(dir, stem+".spec.ts"),
		}
		for _, sibling := range coLocated {
			fullPath := filepath.Join(root, sibling)
			if _, statErr := os.Stat(fullPath); statErr == nil && !seen[sibling] {
				seen[sibling] = true
				tests = append(tests, sibling)
			}
		}

		results[1] = sectionResult{items: tests}
		return nil
	})

	// 3. Find route exposure.
	g.Go(func() error {
		out, err := search.RunRg(stem,
			search.WithContext(ctx),
			search.WithGlob("**/routes/**"),
			search.WithExtraArgs("-l"),
		)
		if err != nil {
			return fmt.Errorf("route search failed: %w", err)
		}
		var routes []string
		for _, line := range search.SplitLines(out) {
			if line != targetRel {
				routes = append(routes, line)
			}
		}
		results[2] = sectionResult{items: routes}
		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	importers := results[0].items
	tests := results[1].items
	routes := results[2].items

	if importers == nil {
		importers = []string{}
	}
	if tests == nil {
		tests = []string{}
	}
	if routes == nil {
		routes = []string{}
	}

	// 4. Determine affected packages from all discovered files.
	affectedSet := make(map[string]bool)
	allFiles := []string{targetRel}
	allFiles = append(allFiles, importers...)
	allFiles = append(allFiles, tests...)
	allFiles = append(allFiles, routes...)

	for _, f := range allFiles {
		if pkg := extractPackageFromPath(f); pkg != "" {
			affectedSet[pkg] = true
		}
	}

	affectedPackages := make([]string, 0, len(affectedSet))
	for pkg := range affectedSet {
		affectedPackages = append(affectedPackages, pkg)
	}
	sort.Strings(affectedPackages)

	// Output.
	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"target":            targetRel,
			"importers":         importers,
			"importers_count":   len(importers),
			"tests":             tests,
			"tests_count":       len(tests),
			"routes":            routes,
			"routes_count":      len(routes),
			"affected_packages": affectedPackages,
		})
		return nil
	}

	output.PrintSection(fmt.Sprintf("Impact Analysis: %s", targetRel))

	// Direct importers.
	if len(importers) > 0 {
		output.PrintSection(fmt.Sprintf("Direct Importers (%d)", len(importers)))
		show := importers
		if len(show) > 20 {
			show = show[:20]
		}
		for _, f := range show {
			output.Printf("  %s", f)
		}
		if len(importers) > 20 {
			output.PrintDim(fmt.Sprintf("  ... +%d more", len(importers)-20))
		}
	} else {
		output.PrintNoResults("direct importers")
	}

	// Test coverage.
	if len(tests) > 0 {
		output.PrintSection(fmt.Sprintf("Test Coverage (%d)", len(tests)))
		for _, f := range tests {
			output.Printf("  %s", f)
		}
	} else {
		output.PrintWarning("No test coverage found")
	}

	// Route exposure.
	if len(routes) > 0 {
		output.PrintSection(fmt.Sprintf("Route Exposure (%d)", len(routes)))
		for _, f := range routes {
			output.Printf("  %s", f)
		}
	}

	// Affected packages.
	if len(affectedPackages) > 0 {
		output.PrintSection("Affected Packages")
		output.Printf("  %s", strings.Join(affectedPackages, ", "))
	}

	return nil
}

// ---------- test-for ----------

var testForCmd = &cobra.Command{
	Use:   "test-for <file_path>",
	Short: "Find tests covering a file",
	Long: `Searches for tests related to a file:
- Co-located test files (same directory, .test.ts/.spec.ts)
- Test files that import/reference the target
- Integration tests that reference the module name`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return runTestFor(args[0])
	},
}

func runTestFor(filePath string) error {
	cfg := config.Get()
	root := cfg.GroveRoot

	// Normalize to relative path.
	targetRel := filePath
	if filepath.IsAbs(filePath) {
		rel, err := filepath.Rel(root, filePath)
		if err == nil {
			targetRel = rel
		}
	}
	targetRel = filepath.Clean(targetRel)

	stem := filenameStem(targetRel)
	dir := filepath.Dir(targetRel)

	type testEntry struct {
		File string `json:"file"`
		Type string `json:"type"`
	}

	seen := make(map[string]bool)
	var tests []testEntry

	// 1. Co-located test files.
	coLocated := []string{
		filepath.Join(dir, stem+".test.ts"),
		filepath.Join(dir, stem+".spec.ts"),
		filepath.Join(dir, stem+".test.tsx"),
		filepath.Join(dir, stem+".spec.tsx"),
	}
	for _, candidate := range coLocated {
		fullPath := filepath.Join(root, candidate)
		if _, err := os.Stat(fullPath); err == nil && !seen[candidate] {
			seen[candidate] = true
			tests = append(tests, testEntry{File: candidate, Type: "co-located"})
		}
	}

	// 2. Test files that reference this module (parallel with integration search).
	type rgResult struct {
		lines []string
	}

	rgResults := make([]rgResult, 2)
	g, ctx := errgroup.WithContext(context.Background())

	g.Go(func() error {
		out, err := search.RunRg(stem,
			search.WithContext(ctx),
			search.WithGlob("*.test.*"),
			search.WithGlob("*.spec.*"),
			search.WithExtraArgs("-l"),
		)
		if err != nil {
			return fmt.Errorf("test reference search failed: %w", err)
		}
		rgResults[0] = rgResult{lines: search.SplitLines(out)}
		return nil
	})

	// 3. Integration tests.
	g.Go(func() error {
		out, err := search.RunRg(stem,
			search.WithContext(ctx),
			search.WithGlob("**/tests/integration/**"),
			search.WithExtraArgs("-l"),
		)
		if err != nil {
			return fmt.Errorf("integration test search failed: %w", err)
		}
		rgResults[1] = rgResult{lines: search.SplitLines(out)}
		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	for _, line := range rgResults[0].lines {
		if !seen[line] {
			seen[line] = true
			tests = append(tests, testEntry{File: line, Type: "references"})
		}
	}
	for _, line := range rgResults[1].lines {
		if !seen[line] {
			seen[line] = true
			tests = append(tests, testEntry{File: line, Type: "integration"})
		}
	}

	// Output.
	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"target": targetRel,
			"tests":  tests,
			"total":  len(tests),
		})
		return nil
	}

	if len(tests) > 0 {
		output.PrintSectionWithDetail(
			fmt.Sprintf("Tests for: %s", targetRel),
			fmt.Sprintf("Found %d test file(s)", len(tests)),
		)
		for _, t := range tests {
			output.Printf("  %s (%s)", t.File, t.Type)
		}
	} else {
		output.PrintWarning(fmt.Sprintf("No tests found for %s", targetRel))
		output.PrintDim("Consider adding a test file!")
	}

	return nil
}

// ---------- diff-summary ----------

var diffSummaryCmd = &cobra.Command{
	Use:   "diff-summary [base]",
	Short: "Structured diff summary optimized for agents",
	Long: `Shows files changed with line counts, package breakdown,
and change categories. Default base is HEAD.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		base := "HEAD"
		if len(args) > 0 {
			base = args[0]
		}
		return runDiffSummary(base)
	},
}

func runDiffSummary(base string) error {
	cfg := config.Get()

	// Run git diff --numstat.
	gitOutput, err := search.RunGit("diff", "--numstat", base)
	if err != nil {
		// If RunGit returned empty (no git available), try exec directly.
		gitCmd := exec.Command("git", "diff", "--numstat", base)
		gitCmd.Dir = cfg.GroveRoot
		out, execErr := gitCmd.Output()
		if execErr != nil {
			return fmt.Errorf("git diff failed: %w", execErr)
		}
		gitOutput = string(out)
	}

	type diffFile struct {
		Path      string `json:"path"`
		Additions int    `json:"additions"`
		Deletions int    `json:"deletions"`
		Package   string `json:"package"`
		Category  string `json:"category"`
	}

	var files []diffFile
	totalAdd := 0
	totalDel := 0
	packageSet := make(map[string]bool)

	for _, line := range strings.Split(strings.TrimSpace(gitOutput), "\n") {
		if line == "" || !strings.Contains(line, "\t") {
			continue
		}

		parts := strings.SplitN(line, "\t", 3)
		if len(parts) < 3 {
			continue
		}

		add := 0
		del := 0
		if parts[0] != "-" {
			add, _ = strconv.Atoi(parts[0])
		}
		if parts[1] != "-" {
			del, _ = strconv.Atoi(parts[1])
		}
		path := parts[2]

		totalAdd += add
		totalDel += del

		// Determine package.
		pkg := extractPackageFromPath(path)
		if pkg == "" {
			pkg = "root"
		}
		packageSet[pkg] = true

		// Categorize the change.
		category := categorizeFile(path)

		files = append(files, diffFile{
			Path:      path,
			Additions: add,
			Deletions: del,
			Package:   pkg,
			Category:  category,
		})
	}

	packages := make([]string, 0, len(packageSet))
	for pkg := range packageSet {
		packages = append(packages, pkg)
	}
	sort.Strings(packages)

	// Ensure non-nil slices for JSON output.
	if files == nil {
		files = []diffFile{}
	}

	// Output.
	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"base":             base,
			"files":            files,
			"total_files":      len(files),
			"total_additions":  totalAdd,
			"total_deletions":  totalDel,
			"packages":         packages,
		})
		return nil
	}

	output.PrintSectionWithDetail("Diff Summary", fmt.Sprintf("vs %s", base))
	output.Printf("%d files  |  +%d -%d  |  Packages: %s",
		len(files), totalAdd, totalDel, strings.Join(packages, ", "))

	if len(files) > 0 {
		output.Print("")
		show := files
		if len(show) > 30 {
			show = show[:30]
		}
		for _, f := range show {
			addStr := ""
			delStr := ""
			if f.Additions > 0 {
				addStr = fmt.Sprintf("+%d", f.Additions)
			}
			if f.Deletions > 0 {
				delStr = fmt.Sprintf("-%d", f.Deletions)
			}
			output.Printf("  %s %s %s", addStr, delStr, f.Path)
		}
		if len(files) > 30 {
			output.PrintDim(fmt.Sprintf("  ... +%d more files", len(files)-30))
		}
	}

	return nil
}

// ---------- helpers ----------

// filenameStem returns the filename without its extension(s).
// Handles double extensions like .test.ts by stripping only the last extension,
// matching the behavior needed for import resolution.
func filenameStem(path string) string {
	base := filepath.Base(path)
	// Strip known compound extensions first.
	for _, ext := range []string{".test.ts", ".spec.ts", ".test.tsx", ".spec.tsx", ".test.js", ".spec.js"} {
		if strings.HasSuffix(base, ext) {
			return strings.TrimSuffix(base, ext)
		}
	}
	// Strip last extension.
	ext := filepath.Ext(base)
	if ext != "" {
		return strings.TrimSuffix(base, ext)
	}
	return base
}

// categorizeFile determines the change category for a file path.
func categorizeFile(path string) string {
	lowerPath := strings.ToLower(path)
	ext := strings.ToLower(filepath.Ext(path))

	// Check for test files first (they may have .ts/.js extensions).
	if strings.Contains(lowerPath, ".test.") || strings.Contains(lowerPath, ".spec.") || strings.Contains(lowerPath, "/test/") || strings.Contains(lowerPath, "/tests/") || strings.Contains(lowerPath, "/__tests__/") {
		return "test"
	}

	switch ext {
	case ".ts", ".tsx", ".js", ".jsx":
		return "code"
	case ".svelte":
		return "component"
	case ".css", ".scss", ".postcss":
		return "style"
	case ".md", ".mdx":
		return "docs"
	case ".json", ".toml", ".yaml", ".yml":
		return "config"
	default:
		return "other"
	}
}
