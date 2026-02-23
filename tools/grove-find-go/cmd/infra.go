package cmd

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/spf13/cobra"
	"golang.org/x/sync/errgroup"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/pager"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
)

// countFileLines counts the number of lines in a file using a buffered scanner.
func countFileLines(path string) int {
	f, err := os.Open(path)
	if err != nil {
		return 0
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	count := 0
	for scanner.Scan() {
		count++
	}
	return count
}

// =============================================================================
// gf large -- Find oversized files
// =============================================================================

var largeCmd = &cobra.Command{
	Use:   "large [threshold]",
	Short: "Find files over N lines (default 500)",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		threshold := 500
		if len(args) > 0 {
			if _, err := fmt.Sscanf(args[0], "%d", &threshold); err != nil {
				return fmt.Errorf("invalid threshold: %s", args[0])
			}
		}
		return runLargeCommand(threshold)
	},
}

func runLargeCommand(threshold int) error {
	cfg := config.Get()

	output.PrintSection(fmt.Sprintf("Files over %d lines", threshold))

	// Find all source files (svelte, ts, js).
	extensions := []string{"svelte", "ts", "js"}
	type fileEntry struct {
		lines int
		path  string
	}
	var allFiles []fileEntry

	for _, ext := range extensions {
		files, err := search.FindFiles("", search.WithGlob("*."+ext))
		if err != nil {
			continue
		}
		for _, fp := range files {
			// Skip node_modules, dist, _deprecated, .git.
			if strings.Contains(fp, "node_modules") ||
				strings.Contains(fp, "/dist/") ||
				strings.Contains(fp, "/.git/") {
				continue
			}

			// Resolve the full path for counting.
			fullPath := fp
			if !filepath.IsAbs(fp) {
				fullPath = filepath.Join(cfg.GroveRoot, fp)
			}

			lineCount := countFileLines(fullPath)
			if lineCount >= threshold {
				allFiles = append(allFiles, fileEntry{lines: lineCount, path: fp})
			}
		}
	}

	// Sort by line count descending.
	sort.Slice(allFiles, func(i, j int) bool {
		return allFiles[i].lines > allFiles[j].lines
	})

	if len(allFiles) == 0 {
		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":   "large",
				"threshold": threshold,
				"total":     0,
				"svelte":    []any{},
				"ts_js":     []any{},
				"tests":     []any{},
			})
			return nil
		}
		output.Printf("  No files over %d lines found", threshold)
		return nil
	}

	// Group by type.
	var svelteFiles, tsFiles, testFiles []fileEntry
	for _, f := range allFiles {
		switch {
		case strings.Contains(f.path, ".test.") || strings.Contains(f.path, ".spec."):
			testFiles = append(testFiles, f)
		case strings.HasSuffix(f.path, ".svelte"):
			svelteFiles = append(svelteFiles, f)
		default:
			tsFiles = append(tsFiles, f)
		}
	}

	if cfg.JSONMode {
		toJSON := func(entries []fileEntry) []map[string]any {
			result := make([]map[string]any, 0, len(entries))
			for _, e := range entries {
				result = append(result, map[string]any{
					"path":  e.path,
					"lines": e.lines,
				})
			}
			return result
		}
		output.PrintJSON(map[string]any{
			"command":   "large",
			"threshold": threshold,
			"total":     len(allFiles),
			"svelte":    toJSON(svelteFiles),
			"ts_js":     toJSON(tsFiles),
			"tests":     toJSON(testFiles),
		})
		return nil
	}

	if len(svelteFiles) > 0 {
		output.PrintSection(fmt.Sprintf("Svelte Components (%d)", len(svelteFiles)))
		limit := 15
		if len(svelteFiles) < limit {
			limit = len(svelteFiles)
		}
		for _, f := range svelteFiles[:limit] {
			output.Printf("  %5d lines  %s", f.lines, f.path)
		}
	}

	if len(tsFiles) > 0 {
		output.PrintSection(fmt.Sprintf("TypeScript/JavaScript (%d)", len(tsFiles)))
		limit := 15
		if len(tsFiles) < limit {
			limit = len(tsFiles)
		}
		for _, f := range tsFiles[:limit] {
			output.Printf("  %5d lines  %s", f.lines, f.path)
		}
	}

	if len(testFiles) > 0 {
		output.PrintSection(fmt.Sprintf("Test Files (%d)", len(testFiles)))
		limit := 10
		if len(testFiles) < limit {
			limit = len(testFiles)
		}
		for _, f := range testFiles[:limit] {
			output.Printf("  %5d lines  %s", f.lines, f.path)
		}
	}

	output.Printf("\n  Total: %d files over %d lines", len(allFiles), threshold)

	return nil
}

// =============================================================================
// gf orphaned -- Find Svelte components not imported anywhere
// =============================================================================

var orphanedFlagAll bool

var orphanedCmd = &cobra.Command{
	Use:   "orphaned",
	Short: "Find Svelte components not imported anywhere",
	RunE: func(cmd *cobra.Command, args []string) error {
		if orphanedFlagAll {
			config.Get().IncludeArchived = true
		}
		return runOrphanedCommand()
	},
}

func init() {
	orphanedCmd.Flags().BoolVar(&orphanedFlagAll, "all", false, "Include _archived/ directories in results")
}

func runOrphanedCommand() error {
	cfg := config.Get()

	output.PrintSection("Orphaned Svelte Components")
	output.Print("  Searching for .svelte files with zero imports...")

	// Get all svelte files.
	allSvelte, err := search.FindFiles("", search.WithGlob("*.svelte"))
	if err != nil {
		return fmt.Errorf("file search failed: %w", err)
	}

	if len(allSvelte) == 0 {
		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":  "orphaned",
				"orphaned": []string{},
				"count":    0,
			})
			return nil
		}
		output.Print("  No Svelte files found")
		return nil
	}

	// Filter out route files (+page, +layout, +error, etc.), _deprecated, and _archived (unless --all).
	var componentFiles []string
	for _, fp := range allSvelte {
		name := filepath.Base(fp)
		if strings.HasPrefix(name, "+") {
			continue // Route files are implicitly used by SvelteKit.
		}
		if strings.Contains(fp, "_deprecated") {
			continue
		}
		if !cfg.IncludeArchived && strings.Contains(fp, "_archived") {
			continue
		}
		componentFiles = append(componentFiles, fp)
	}

	// Check each component for imports using errgroup with concurrency limit.
	g, ctx := errgroup.WithContext(context.Background())
	g.SetLimit(10)
	var mu sync.Mutex

	var orphaned []string

	for _, fp := range componentFiles {
		filePath := fp
		g.Go(func() error {
			componentName := strings.TrimSuffix(filepath.Base(filePath), ".svelte")

			// Check if this component is imported anywhere.
			pattern := fmt.Sprintf(`(import.*%s|<%s[\s/>])`, componentName, componentName)
			rgOutput, rgErr := search.RunRg(pattern,
				search.WithContext(ctx),
				search.WithGlob("*.{ts,js,svelte}"),
				search.WithExtraArgs("-l"),
			)
			if rgErr != nil {
				return nil
			}

			importFiles := search.SplitLines(rgOutput)

			// Filter out self-references.
			var otherFiles []string
			for _, f := range importFiles {
				if f != filePath {
					otherFiles = append(otherFiles, f)
				}
			}

			if len(otherFiles) == 0 {
				mu.Lock()
				orphaned = append(orphaned, filePath)
				mu.Unlock()
			}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return fmt.Errorf("search failed in %s", err)
	}

	// Sort orphaned list for stable output.
	sort.Strings(orphaned)

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":  "orphaned",
			"orphaned": orphaned,
			"count":    len(orphaned),
		})
		return nil
	}

	if len(orphaned) > 0 {
		var sb strings.Builder
		for _, fp := range orphaned {
			sb.WriteString(fmt.Sprintf("  %s\n", fp))
		}
		sb.WriteString(fmt.Sprintf("\n  %d components with no external imports\n", len(orphaned)))
		sb.WriteString("  These may be safe to remove or may be dynamically loaded\n")
		output.PrintSection(fmt.Sprintf("Orphaned Components (%d)", len(orphaned)))
		return pager.MaybePage(sb.String())
	}

	output.Print("  All components are imported somewhere!")
	return nil
}

// =============================================================================
// gf migrations -- List D1 migrations across packages
// =============================================================================

var migrationsCmd = &cobra.Command{
	Use:   "migrations",
	Short: "List D1 migrations across all packages",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runMigrationsCommand()
	},
}

func runMigrationsCommand() error {
	cfg := config.Get()

	output.PrintSection("D1 Migrations")

	// Walk the directory tree looking for "migrations" directories containing .sql files.
	type migrationGroup struct {
		dir      string
		relDir   string
		pkgName  string
		sqlFiles []string
	}

	var groups []migrationGroup

	filepath.WalkDir(cfg.GroveRoot, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		// Skip node_modules, .git, _deprecated.
		name := d.Name()
		if d.IsDir() && (name == "node_modules" || name == ".git" || name == "dist" || name == "build") {
			return filepath.SkipDir
		}
		if strings.Contains(path, "_deprecated") {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if d.IsDir() && name == "migrations" {
			// Collect .sql files in this directory.
			entries, readErr := os.ReadDir(path)
			if readErr != nil {
				return nil
			}
			var sqlFiles []string
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
					sqlFiles = append(sqlFiles, entry.Name())
				}
			}
			if len(sqlFiles) == 0 {
				return filepath.SkipDir
			}

			sort.Strings(sqlFiles)

			// Compute relative directory and package name.
			relDir, relErr := filepath.Rel(cfg.GroveRoot, path)
			if relErr != nil {
				relDir = path
			}

			pkgName := extractPackageFromPath(relDir)
			if pkgName == "" {
				pkgName = relDir
			}

			groups = append(groups, migrationGroup{
				dir:      path,
				relDir:   relDir,
				pkgName:  pkgName,
				sqlFiles: sqlFiles,
			})

			return filepath.SkipDir
		}

		return nil
	})

	if len(groups) == 0 {
		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":          "migrations",
				"groups":           []any{},
				"total_migrations": 0,
				"total_databases":  0,
			})
			return nil
		}
		output.Print("  No migration directories found")
		return nil
	}

	// Sort groups by directory path.
	sort.Slice(groups, func(i, j int) bool {
		return groups[i].dir < groups[j].dir
	})

	if cfg.JSONMode {
		jsonGroups := make([]map[string]any, 0, len(groups))
		totalMigrations := 0
		for _, g := range groups {
			totalMigrations += len(g.sqlFiles)
			jsonGroups = append(jsonGroups, map[string]any{
				"package":  g.pkgName,
				"path":     g.relDir,
				"count":    len(g.sqlFiles),
				"files":    g.sqlFiles,
				"first":    g.sqlFiles[0],
				"last":     g.sqlFiles[len(g.sqlFiles)-1],
			})
		}
		output.PrintJSON(map[string]any{
			"command":          "migrations",
			"groups":           jsonGroups,
			"total_migrations": totalMigrations,
			"total_databases":  len(groups),
		})
		return nil
	}

	totalMigrations := 0
	for _, g := range groups {
		count := len(g.sqlFiles)
		totalMigrations += count

		first := strings.TrimSuffix(g.sqlFiles[0], ".sql")
		last := strings.TrimSuffix(g.sqlFiles[count-1], ".sql")

		output.PrintSection(fmt.Sprintf("%s (%d migrations)", g.pkgName, count))
		output.Printf("  Path: %s", g.relDir)
		output.Printf("  Range: %s -> %s", first, last)

		// Show last 5 migrations.
		start := 0
		if count > 5 {
			start = count - 5
		}
		for _, sqlFile := range g.sqlFiles[start:] {
			output.Printf("    %s", sqlFile)
		}
		if count > 5 {
			output.Printf("    ... and %d earlier", count-5)
		}
	}

	output.Printf("\n  Total: %d migrations across %d databases", totalMigrations, len(groups))

	return nil
}

// =============================================================================
// gf flags -- Find feature flag (graft) definitions and usage
// =============================================================================

var flagsCmd = &cobra.Command{
	Use:   "flags [name]",
	Short: "Find feature flag (graft) definitions and usage",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := ""
		if len(args) > 0 {
			name = args[0]
		}
		return runFlagsCommand(name)
	},
}

func runFlagsCommand(name string) error {
	cfg := config.Get()

	if name != "" {
		// Search for a specific flag name.
		output.PrintSection(fmt.Sprintf("Feature flag: %s", name))

		result, err := search.RunRg(name,
			search.WithGlob("*.{ts,js,svelte,sql}"),
		)
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		if cfg.JSONMode {
			lines := search.SplitLines(result)
			output.PrintJSON(map[string]any{
				"command": "flags",
				"name":    name,
				"count":   len(lines),
				"results": lines,
			})
			return nil
		}

		if result != "" {
			// Filter to flag-related lines.
			allLines := search.SplitLines(result)
			keywords := []string{"flag", "graft", "feature", "toggle", strings.ToLower(name)}
			var filtered []string
			for _, line := range allLines {
				lower := strings.ToLower(line)
				for _, kw := range keywords {
					if strings.Contains(lower, kw) {
						filtered = append(filtered, line)
						break
					}
				}
			}

			if len(filtered) > 0 {
				limit := 30
				if len(filtered) < limit {
					limit = len(filtered)
				}
				output.PrintRaw(strings.Join(filtered[:limit], "\n") + "\n")
			} else {
				output.PrintRaw(strings.TrimRight(result, "\n") + "\n")
			}
		} else {
			output.Print("  (not found)")
		}

		return nil
	}

	// No specific name -- show overview of all grafts.
	output.PrintSection("Feature Flags (Grafts)")

	type sectionData struct {
		title  string
		result string
		err    error
	}

	// Graft definitions in migrations.
	output.PrintSection("Graft Definitions (migrations)")
	defResult, err := search.RunRg("INSERT.*grafts|CREATE.*grafts",
		search.WithGlob("*.sql"),
	)
	if err != nil {
		return fmt.Errorf("search failed: %w", err)
	}

	// Graft checks in code.
	checksResult, checksErr := search.RunRg(
		"(isGraftEnabled|checkGraft|graft|feature_flag|FLAGS_KV)",
		search.WithGlob("*.{ts,js,svelte}"),
	)
	if checksErr != nil {
		return fmt.Errorf("search failed: %w", checksErr)
	}

	// Graft inventory files.
	inventoryFiles, invErr := search.FindFiles("graft",
		search.WithGlobs("*.ts", "*.js", "*.json"),
	)
	if invErr != nil {
		return fmt.Errorf("file search failed: %w", invErr)
	}

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":     "flags",
			"definitions": search.SplitLines(defResult),
			"checks":      search.SplitLines(checksResult),
			"inventory":   inventoryFiles,
		})
		return nil
	}

	if defResult != "" {
		output.PrintRaw(strings.TrimRight(defResult, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	output.PrintSection("Graft Checks in Code")
	if checksResult != "" {
		lines := search.SplitLines(checksResult)
		limit := 25
		if len(lines) < limit {
			limit = len(lines)
		}
		output.PrintRaw(strings.Join(lines[:limit], "\n") + "\n")
		if len(lines) > 25 {
			output.Printf("  ... and %d more", len(lines)-25)
		}
	} else {
		output.Print("  (none found)")
	}

	output.PrintSection("Graft Inventory Files")
	if len(inventoryFiles) > 0 {
		output.PrintRaw(strings.Join(inventoryFiles, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	return nil
}

// =============================================================================
// gf workers -- List Cloudflare Worker configurations
// =============================================================================

var workersCmd = &cobra.Command{
	Use:   "workers",
	Short: "List Cloudflare Worker configurations",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runWorkersCommand()
	},
}

func runWorkersCommand() error {
	cfg := config.Get()

	output.PrintSection("Cloudflare Workers")

	// Find wrangler.toml files.
	wranglerFiles, err := search.FindFilesByGlob([]string{"**/wrangler.toml"})
	if err != nil {
		return fmt.Errorf("file search failed: %w", err)
	}

	// Filter out node_modules and _deprecated.
	var filtered []string
	for _, f := range wranglerFiles {
		if !strings.Contains(f, "node_modules") && !strings.Contains(f, "_deprecated") {
			filtered = append(filtered, f)
		}
	}
	wranglerFiles = filtered
	sort.Strings(wranglerFiles)

	type workerInfo struct {
		name     string
		path     string
		bindings []string
	}

	var workers []workerInfo

	for _, wf := range wranglerFiles {
		fullPath := wf
		if !filepath.IsAbs(wf) {
			fullPath = filepath.Join(cfg.GroveRoot, wf)
		}

		content, readErr := os.ReadFile(fullPath)
		if readErr != nil {
			continue
		}
		contentStr := string(content)

		// Extract worker name.
		name := "unknown"
		for _, line := range strings.Split(contentStr, "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "name") {
				parts := strings.SplitN(trimmed, "=", 2)
				if len(parts) == 2 {
					name = strings.Trim(strings.TrimSpace(parts[1]), `"'`)
					break
				}
			}
		}

		// Detect bindings and features.
		var bindings []string
		if strings.Contains(contentStr, "[[d1_databases") {
			bindings = append(bindings, "D1")
		}
		if strings.Contains(contentStr, "[[kv_namespaces") {
			bindings = append(bindings, "KV")
		}
		if strings.Contains(contentStr, "[[r2_buckets") {
			bindings = append(bindings, "R2")
		}
		if strings.Contains(contentStr, "[durable_objects]") {
			bindings = append(bindings, "DO")
		}
		if strings.Contains(contentStr, "[triggers]") || strings.Contains(contentStr, "crons") {
			bindings = append(bindings, "cron")
		}
		if strings.Contains(contentStr, "[[queues") || strings.Contains(contentStr, "[queues]") {
			bindings = append(bindings, "queues")
		}
		if strings.Contains(contentStr, "[ai]") {
			bindings = append(bindings, "AI")
		}
		if strings.Contains(contentStr, "[[services") {
			bindings = append(bindings, "services")
		}

		workers = append(workers, workerInfo{
			name:     name,
			path:     wf,
			bindings: bindings,
		})
	}

	if len(workers) == 0 {
		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":    "workers",
				"workers":    []any{},
				"total":      0,
				"do_classes": []string{},
				"cron":       []string{},
			})
			return nil
		}
		output.Print("  No wrangler.toml files found")
		return nil
	}

	// Durable Object classes.
	doResult, _ := search.RunRg(`export\s+class\s+\w+.*DurableObject`,
		search.WithGlob("*.ts"),
	)

	// Cron triggers.
	cronResult, _ := search.RunRg(`crons\s*=|scheduled.*fetch`,
		search.WithGlob("*.{toml,ts}"),
	)

	if cfg.JSONMode {
		jsonWorkers := make([]map[string]any, 0, len(workers))
		for _, w := range workers {
			bindingStr := "basic"
			if len(w.bindings) > 0 {
				bindingStr = strings.Join(w.bindings, ", ")
			}
			jsonWorkers = append(jsonWorkers, map[string]any{
				"name":     w.name,
				"path":     w.path,
				"bindings": bindingStr,
			})
		}
		output.PrintJSON(map[string]any{
			"command":    "workers",
			"workers":    jsonWorkers,
			"total":      len(workers),
			"do_classes": search.SplitLines(doResult),
			"cron":       search.SplitLines(cronResult),
		})
		return nil
	}

	for _, w := range workers {
		bindingStr := "basic"
		if len(w.bindings) > 0 {
			bindingStr = strings.Join(w.bindings, ", ")
		}
		output.Printf("  %-30s [%s]", w.name, bindingStr)
		output.Printf("    %s", w.path)
	}

	output.Printf("\n  Total: %d workers/apps", len(workers))

	// Durable Object classes.
	output.PrintSection("Durable Object Classes")
	if doResult != "" {
		output.PrintRaw(strings.TrimRight(doResult, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	// Cron triggers.
	output.PrintSection("Cron Triggers")
	if cronResult != "" {
		output.PrintRaw(strings.TrimRight(cronResult, "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	return nil
}

// =============================================================================
// gf emails -- Find email templates and send functions
// =============================================================================

var emailsCmd = &cobra.Command{
	Use:   "emails",
	Short: "Find email templates and send functions",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runEmailsCommand()
	},
}

func runEmailsCommand() error {
	cfg := config.Get()

	output.PrintSection("Email System")

	// Email template files.
	templateFiles, err := search.FindFiles("email",
		search.WithGlobs("*.ts", "*.js", "*.svelte"),
	)
	if err != nil {
		return fmt.Errorf("file search failed: %w", err)
	}
	// Filter out _deprecated.
	var templateFiltered []string
	for _, f := range templateFiles {
		if !strings.Contains(f, "_deprecated") {
			templateFiltered = append(templateFiltered, f)
		}
	}

	// Send functions.
	sendResult, sendErr := search.RunRg(
		`(sendEmail|send_email|sendMail|emailService|mailSend|resend\.emails)`,
		search.WithGlob("*.{ts,js}"),
	)
	if sendErr != nil {
		return fmt.Errorf("search failed: %w", sendErr)
	}

	// Email types/templates.
	typesResult, typesErr := search.RunRg(
		`(EmailTemplate|emailType|email_type|template.*email|subject.*email)`,
		search.WithGlob("*.{ts,js}"),
		search.WithExtraArgs("-i"),
	)
	if typesErr != nil {
		return fmt.Errorf("search failed: %w", typesErr)
	}

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":        "emails",
			"template_files": templateFiltered,
			"send_functions": search.SplitLines(sendResult),
			"types":          search.SplitLines(typesResult),
		})
		return nil
	}

	output.PrintSection("Email Template Files")
	if len(templateFiltered) > 0 {
		limit := 20
		if len(templateFiltered) < limit {
			limit = len(templateFiltered)
		}
		output.PrintRaw(strings.Join(templateFiltered[:limit], "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	output.PrintSection("Email Send Functions")
	if sendResult != "" {
		lines := search.SplitLines(sendResult)
		limit := 20
		if len(lines) < limit {
			limit = len(lines)
		}
		output.PrintRaw(strings.Join(lines[:limit], "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	output.PrintSection("Email Types & Templates")
	if typesResult != "" {
		lines := search.SplitLines(typesResult)
		limit := 15
		if len(lines) < limit {
			limit = len(lines)
		}
		output.PrintRaw(strings.Join(lines[:limit], "\n") + "\n")
	} else {
		output.Print("  (none found)")
	}

	return nil
}

// =============================================================================
// gf deps -- Workspace dependency graph
// =============================================================================

var depsCmd = &cobra.Command{
	Use:   "deps [package]",
	Short: "Show workspace dependency graph",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		pkg := ""
		if len(args) > 0 {
			pkg = args[0]
		}
		return runDepsCommand(pkg)
	},
}

func runDepsCommand(pkg string) error {
	cfg := config.Get()

	if pkg != "" {
		// Validate package name -- reject path traversal attempts.
		if strings.Contains(pkg, "..") {
			output.PrintWarning("Invalid package name")
			return nil
		}

		// Find package directory. Supports both bare names (engine → packages/engine)
		// and prefixed names (apps/landing → apps/landing).
		var packageDir string
		if strings.Contains(pkg, "/") {
			// Prefixed name — validate the category directory.
			parts := strings.SplitN(pkg, "/", 3)
			if len(parts) < 2 || !isPackageDir(parts[0]) {
				output.PrintWarning(fmt.Sprintf("Unknown package category: %s", pkg))
				return nil
			}
			packageDir = filepath.Join(cfg.GroveRoot, pkg)
		} else {
			// Bare name — search all category directories, packages/ first.
			for _, dir := range packageDirs {
				candidate := filepath.Join(cfg.GroveRoot, dir, pkg)
				if info, err := os.Stat(candidate); err == nil && info.IsDir() {
					packageDir = candidate
					break
				}
			}
		}
		if packageDir == "" {
			output.PrintWarning(fmt.Sprintf("Package not found: %s", pkg))
			return nil
		}

		output.PrintSection(fmt.Sprintf("Dependencies of: %s", pkg))

		// Find workspace imports within this package.
		output.PrintSection("Workspace Imports")
		importResult, err := search.RunRg("@autumnsgrove/",
			search.WithGlob("*.{ts,js,svelte}"),
			search.WithExtraArgs(packageDir),
		)
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		// Find who imports this package.
		importerResult, importerErr := search.RunRg(
			fmt.Sprintf(`@autumnsgrove/.*%s|from.*['"].*/%s`, pkg, pkg),
			search.WithGlob("*.{ts,js,svelte}"),
			search.WithExtraArgs("-l"),
		)
		if importerErr != nil {
			return fmt.Errorf("search failed: %w", importerErr)
		}

		if cfg.JSONMode {
			// Group importers by package.
			importerPackages := extractPackageNames(importerResult, pkg)
			output.PrintJSON(map[string]any{
				"command":           "deps",
				"package":           pkg,
				"workspace_imports": search.SplitLines(importResult),
				"imported_by":       importerPackages,
			})
			return nil
		}

		if importResult != "" {
			lines := search.SplitLines(importResult)
			limit := 30
			if len(lines) < limit {
				limit = len(lines)
			}
			output.PrintRaw(strings.Join(lines[:limit], "\n") + "\n")
		} else {
			output.Print("  (no workspace imports)")
		}

		output.PrintSection(fmt.Sprintf("Packages importing %s", pkg))
		if importerResult != "" {
			importerPackages := extractPackageNames(importerResult, pkg)
			if len(importerPackages) > 0 {
				for _, p := range importerPackages {
					output.Printf("  %s", p)
				}
			} else {
				output.Print("  (no external consumers)")
			}
		} else {
			output.Print("  (no external consumers)")
		}

		return nil
	}

	// No package specified -- build full dependency graph.
	output.PrintSection("Workspace Dependency Graph")

	// Find all files with workspace cross-references.
	allImportFiles, err := search.RunRg("@autumnsgrove/",
		search.WithGlob("*.{ts,js,svelte}"),
		search.WithExtraArgs("-l"),
	)
	if err != nil {
		return fmt.Errorf("search failed: %w", err)
	}

	if allImportFiles == "" {
		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":      "deps",
				"dependencies": map[string][]string{},
				"total":        0,
			})
			return nil
		}
		output.Print("  No workspace imports found")
		return nil
	}

	// Build dependency map by reading each file.
	depMap := make(map[string]map[string]bool)

	for _, fp := range search.SplitLines(allImportFiles) {
		if strings.Contains(fp, "_deprecated") {
			continue
		}

		// Determine source package.
		source := extractPackageFromPath(fp)

		if source == "" {
			continue
		}

		if depMap[source] == nil {
			depMap[source] = make(map[string]bool)
		}

		// Read the file to find what it imports.
		fullPath := fp
		if !filepath.IsAbs(fp) {
			fullPath = filepath.Join(cfg.GroveRoot, fp)
		}

		content, readErr := os.ReadFile(fullPath)
		if readErr != nil {
			continue
		}

		for _, line := range strings.Split(string(content), "\n") {
			if strings.Contains(line, "@autumnsgrove/") && strings.Contains(line, "import") {
				// Extract package name from @autumnsgrove/ import.
				for _, part := range strings.Split(line, "@autumnsgrove/") {
					if part == "" || strings.HasPrefix(part, "import") {
						continue
					}
					// Extract the package name (up to / or quote).
					pkgName := part
					for _, sep := range []string{"/", "'", `"`, " ", ";"} {
						if idx := strings.Index(pkgName, sep); idx >= 0 {
							pkgName = pkgName[:idx]
						}
					}
					pkgName = strings.TrimSpace(pkgName)
					if pkgName != "" && pkgName != source {
						depMap[source][pkgName] = true
					}
				}
			}
		}
	}

	if cfg.JSONMode {
		jsonDeps := make(map[string][]string)
		for src, deps := range depMap {
			var depList []string
			for d := range deps {
				depList = append(depList, d)
			}
			sort.Strings(depList)
			jsonDeps[src] = depList
		}
		output.PrintJSON(map[string]any{
			"command":      "deps",
			"dependencies": jsonDeps,
			"total":        len(depMap),
		})
		return nil
	}

	// Sort and print the dependency map.
	var sources []string
	for src := range depMap {
		sources = append(sources, src)
	}
	sort.Strings(sources)

	for _, src := range sources {
		deps := depMap[src]
		if len(deps) > 0 {
			var depList []string
			for d := range deps {
				depList = append(depList, d)
			}
			sort.Strings(depList)
			output.Printf("  %s -> %s", src, strings.Join(depList, ", "))
		}
	}

	output.Printf("\n  %d packages with workspace dependencies", len(depMap))

	return nil
}

// extractPackageNames extracts unique package names from rg -l output, excluding the given package.
func extractPackageNames(rgOutput string, excludePkg string) []string {
	packages := make(map[string]bool)
	for _, line := range search.SplitLines(rgOutput) {
		pkg := extractPackageFromPath(line)
		if pkg != "" && pkg != excludePkg {
			packages[pkg] = true
		}
	}

	var result []string
	for pkg := range packages {
		result = append(result, pkg)
	}
	sort.Strings(result)
	return result
}

// =============================================================================
// gf config-diff -- Compare configs across packages
// =============================================================================

var configDiffCmd = &cobra.Command{
	Use:   "config-diff [config_type]",
	Short: "Compare configuration files across packages (tailwind, svelte, tsconfig, vitest)",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		configType := ""
		if len(args) > 0 {
			configType = args[0]
		}
		return runConfigDiffCommand(configType)
	},
}

func runConfigDiffCommand(configType string) error {
	cfg := config.Get()

	type configSection struct {
		name  string
		files []string
		extra []string // additional info lines per file
	}

	var sections []configSection

	// --- Tailwind Configs ---
	if configType == "tailwind" || configType == "" {
		twFiles, _ := search.FindFilesByGlob([]string{"**/tailwind.config.*"})
		twFiles = filterExcluded(twFiles)
		sort.Strings(twFiles)

		var extra []string
		for _, tw := range twFiles {
			fullPath := tw
			if !filepath.IsAbs(tw) {
				fullPath = filepath.Join(cfg.GroveRoot, tw)
			}
			lines := countFileLines(fullPath)
			extra = append(extra, fmt.Sprintf("%4d lines  %s", lines, tw))
		}

		sections = append(sections, configSection{
			name:  "Tailwind Configs",
			files: twFiles,
			extra: extra,
		})
	}

	// --- Svelte Configs ---
	if configType == "svelte" || configType == "" {
		svFiles, _ := search.FindFilesByGlob([]string{"**/svelte.config.*"})
		svFiles = filterExcluded(svFiles)
		sort.Strings(svFiles)

		var extra []string
		csrfCount := 0
		for _, sv := range svFiles {
			fullPath := sv
			if !filepath.IsAbs(sv) {
				fullPath = filepath.Join(cfg.GroveRoot, sv)
			}
			content, readErr := os.ReadFile(fullPath)
			if readErr != nil {
				extra = append(extra, sv)
				continue
			}
			contentStr := string(content)
			hasCsrf := strings.Contains(strings.ToLower(contentStr), "csrf")
			if hasCsrf {
				csrfCount++
			}

			adapter := "?"
			if strings.Contains(contentStr, "cloudflare") {
				adapter = "cloudflare"
			} else if strings.Contains(contentStr, "auto") {
				adapter = "auto"
			}

			csrfLabel := ""
			if hasCsrf {
				csrfLabel = ", csrf"
			}
			extra = append(extra, fmt.Sprintf("%s  (adapter: %s%s)", sv, adapter, csrfLabel))
		}

		// Check for CSRF inconsistency.
		if csrfCount > 0 && csrfCount < len(svFiles) {
			extra = append(extra, fmt.Sprintf("\n  WARNING: CSRF config in %d/%d files (inconsistent!)", csrfCount, len(svFiles)))
		}

		sections = append(sections, configSection{
			name:  "Svelte Configs",
			files: svFiles,
			extra: extra,
		})
	}

	// --- TypeScript Configs ---
	if configType == "tsconfig" || configType == "" {
		tsFiles, _ := search.FindFilesByGlob([]string{"**/tsconfig.json"})
		tsFiles = filterExcluded(tsFiles)
		sort.Strings(tsFiles)

		sections = append(sections, configSection{
			name:  "TypeScript Configs",
			files: tsFiles,
		})
	}

	// --- Vitest Configs ---
	if configType == "vitest" || configType == "" {
		viFiles, _ := search.FindFilesByGlob([]string{"**/vitest.config.*"})
		viFiles = filterExcluded(viFiles)
		sort.Strings(viFiles)

		sections = append(sections, configSection{
			name:  "Vitest Configs",
			files: viFiles,
		})
	}

	if cfg.JSONMode {
		jsonData := map[string]any{
			"command": "config-diff",
		}
		if configType != "" {
			jsonData["type"] = configType
		}
		for _, s := range sections {
			key := strings.ToLower(strings.ReplaceAll(s.name, " ", "_"))
			jsonData[key] = map[string]any{
				"files": s.files,
				"count": len(s.files),
			}
		}
		output.PrintJSON(jsonData)
		return nil
	}

	for _, s := range sections {
		output.PrintSection(s.name)
		if len(s.files) == 0 {
			output.Print("  (none found)")
			continue
		}

		output.Printf("  %d %s files:", len(s.files), strings.ToLower(strings.TrimSuffix(s.name, " Configs")))

		if len(s.extra) > 0 {
			for _, line := range s.extra {
				output.Printf("    %s", line)
			}
		} else {
			limit := 15
			if len(s.files) < limit {
				limit = len(s.files)
			}
			for _, f := range s.files[:limit] {
				output.Printf("    %s", f)
			}
			if len(s.files) > 15 {
				output.Printf("    ... and %d more", len(s.files)-15)
			}
		}
	}

	return nil
}

// filterExcluded removes paths containing node_modules or _deprecated.
func filterExcluded(files []string) []string {
	var result []string
	for _, f := range files {
		if !strings.Contains(f, "node_modules") && !strings.Contains(f, "_deprecated") {
			result = append(result, f)
		}
	}
	return result
}
