package cmd

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/tools"
)

// ---------------------------------------------------------------------------
// todoCmd — Find TODO/FIXME/HACK comments
// ---------------------------------------------------------------------------

var todoCmd = &cobra.Command{
	Use:   "todo [type]",
	Short: "Find TODO/FIXME/HACK comments",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) == 1 {
			typeFilter := args[0]

			if cfg.JSONMode {
				out, err := search.RunRg(
					`\b`+typeFilter+`\b:?`,
					search.WithGlobs("*.{ts,js,svelte}"),
				)
				if err != nil {
					return err
				}
				lines := search.SplitLines(out)
				output.PrintJSON(map[string]any{
					"command": "todo",
					"filter":  typeFilter,
					"matches": lines,
					"count":   len(lines),
				})
				return nil
			}

			output.PrintSection(fmt.Sprintf("Finding %s comments", typeFilter))
			out, err := search.RunRg(
				`\b`+typeFilter+`\b:?`,
				search.WithGlobs("*.{ts,js,svelte}"),
			)
			if err != nil {
				return err
			}
			if out != "" {
				output.PrintRaw(strings.TrimRight(out, "\n") + "\n")
			} else {
				output.Print(fmt.Sprintf("  No %s comments found", typeFilter))
			}
			return nil
		}

		// No filter — show all three categories
		type category struct {
			name    string
			pattern string
			limit   int
		}
		categories := []category{
			{"TODOs", `\bTODO\b:?`, 20},
			{"FIXMEs", `\bFIXME\b:?`, 20},
			{"HACKs", `\bHACK\b:?`, 10},
		}

		if cfg.JSONMode {
			result := map[string]any{"command": "todo"}
			for _, cat := range categories {
				out, err := search.RunRg(
					cat.pattern,
					search.WithGlobs("*.{ts,js,svelte}"),
				)
				if err != nil {
					return err
				}
				lines := search.SplitLines(out)
				result[strings.ToLower(cat.name)] = map[string]any{
					"matches": lines,
					"count":   len(lines),
				}
			}
			output.PrintJSON(result)
			return nil
		}

		output.PrintSection("TODO/FIXME/HACK Comments")

		for _, cat := range categories {
			output.PrintSection(cat.name)
			out, err := search.RunRg(
				cat.pattern,
				search.WithGlobs("*.{ts,js,svelte}"),
			)
			if err != nil {
				return err
			}
			if out != "" {
				lines := search.SplitLines(out)
				truncated, _ := output.TruncateResults(lines, cat.limit)
				output.PrintRaw(strings.Join(truncated, "\n") + "\n")
			} else {
				output.PrintNoResults(cat.name)
			}
		}
		return nil
	},
}

// ---------------------------------------------------------------------------
// logCmd — Find console.log/warn/error + debugger
// ---------------------------------------------------------------------------

var logCmd = &cobra.Command{
	Use:   "log [level]",
	Short: "Find console.log/warn/error and debugger statements",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		testExcludes := []string{"--glob", "!*.test.*", "--glob", "!*.spec.*"}

		if len(args) == 1 {
			level := args[0]

			if cfg.JSONMode {
				out, err := search.RunRg(
					fmt.Sprintf(`console\.%s\(`, level),
					search.WithGlobs("*.{ts,js,svelte}"),
					search.WithExtraArgs(testExcludes...),
				)
				if err != nil {
					return err
				}
				lines := search.SplitLines(out)
				output.PrintJSON(map[string]any{
					"command": "log",
					"level":   level,
					"matches": lines,
					"count":   len(lines),
				})
				return nil
			}

			output.PrintSection(fmt.Sprintf("console.%s statements", level))
			out, err := search.RunRg(
				fmt.Sprintf(`console\.%s\(`, level),
				search.WithGlobs("*.{ts,js,svelte}"),
				search.WithExtraArgs(testExcludes...),
			)
			if err != nil {
				return err
			}
			if out != "" {
				output.PrintRaw(strings.TrimRight(out, "\n") + "\n")
			} else {
				output.Print(fmt.Sprintf("  No console.%s found", level))
			}
			return nil
		}

		// No filter — show all categories
		type logCategory struct {
			name    string
			pattern string
			limit   int
			noTest  bool
		}
		categories := []logCategory{
			{"console.log", `console\.log\(`, 20, true},
			{"console.error", `console\.error\(`, 15, true},
			{"console.warn", `console\.warn\(`, 10, true},
			{"debugger statements", `\bdebugger\b`, 0, false},
		}

		if cfg.JSONMode {
			result := map[string]any{"command": "log"}
			for _, cat := range categories {
				opts := []search.Option{search.WithGlobs("*.{ts,js,svelte}")}
				if cat.noTest {
					opts = append(opts, search.WithExtraArgs(testExcludes...))
				}
				out, err := search.RunRg(cat.pattern, opts...)
				if err != nil {
					return err
				}
				lines := search.SplitLines(out)
				key := strings.ReplaceAll(cat.name, ".", "_")
				key = strings.ReplaceAll(key, " ", "_")
				result[key] = map[string]any{
					"matches": lines,
					"count":   len(lines),
				}
			}
			output.PrintJSON(result)
			return nil
		}

		output.PrintSection("Console Statements")

		for _, cat := range categories {
			output.PrintSection(cat.name)

			opts := []search.Option{search.WithGlobs("*.{ts,js,svelte}")}
			if cat.noTest {
				opts = append(opts, search.WithExtraArgs(testExcludes...))
			}

			out, err := search.RunRg(cat.pattern, opts...)
			if err != nil {
				return err
			}
			if out != "" {
				lines := search.SplitLines(out)
				if cat.limit > 0 {
					truncated, _ := output.TruncateResults(lines, cat.limit)
					output.PrintRaw(strings.Join(truncated, "\n") + "\n")
				} else {
					output.PrintRaw(strings.TrimRight(out, "\n") + "\n")
				}
			} else {
				output.PrintNoResults(cat.name)
			}
		}
		return nil
	},
}

// ---------------------------------------------------------------------------
// envCmd — Find environment variable usage
// ---------------------------------------------------------------------------

var envCmd = &cobra.Command{
	Use:   "env [var]",
	Short: "Find environment variable usage",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) == 1 {
			varName := args[0]

			if cfg.JSONMode {
				out, err := search.RunRg(
					varName,
					search.WithGlobs("*.{ts,js,svelte}"),
				)
				if err != nil {
					return err
				}
				// Filter to env-related lines
				allLines := search.SplitLines(out)
				filtered := filterEnvLines(allLines)
				output.PrintJSON(map[string]any{
					"command": "env",
					"var":     varName,
					"matches": filtered,
					"count":   len(filtered),
				})
				return nil
			}

			output.PrintSection(fmt.Sprintf("Environment variable: %s", varName))
			out, err := search.RunRg(
				varName,
				search.WithGlobs("*.{ts,js,svelte}"),
			)
			if err != nil {
				return err
			}
			if out != "" {
				allLines := search.SplitLines(out)
				filtered := filterEnvLines(allLines)
				if len(filtered) > 0 {
					truncated, _ := output.TruncateResults(filtered, 30)
					output.PrintRaw(strings.Join(truncated, "\n") + "\n")
				} else {
					output.Print("  (no env-related matches)")
				}
			} else {
				output.Print("  (not found)")
			}
			return nil
		}

		// No filter — show all env categories
		type envSection struct {
			name    string
			run     func() (string, error)
			limit   int
			noMatch string
		}

		sections := []envSection{
			{
				name: ".env Files",
				run: func() (string, error) {
					files, err := search.FindFiles(".env", search.WithGlobs("*.env*"))
					if err != nil {
						return "", err
					}
					return strings.Join(files, "\n"), nil
				},
				limit:   0,
				noMatch: "(none found)",
			},
			{
				name: "import.meta.env usage",
				run: func() (string, error) {
					return search.RunRg(
						`import\.meta\.env\.\w+`,
						search.WithGlobs("*.{ts,js,svelte}"),
					)
				},
				limit:   20,
				noMatch: "(none found)",
			},
			{
				name: "process.env usage",
				run: func() (string, error) {
					return search.RunRg(
						`process\.env\.\w+`,
						search.WithTypes("ts", "js"),
					)
				},
				limit:   15,
				noMatch: "(none found)",
			},
			{
				name: "platform.env usage (Cloudflare)",
				run: func() (string, error) {
					return search.RunRg(
						`platform\.env\.\w+`,
						search.WithTypes("ts", "js"),
					)
				},
				limit:   15,
				noMatch: "(none found)",
			},
			{
				name: "Env vars in wrangler.toml",
				run: func() (string, error) {
					return search.RunRg(
						`\[vars\]`,
						search.WithGlobs("wrangler*.toml"),
						search.WithExtraArgs("-A", "10"),
					)
				},
				limit:   20,
				noMatch: "(none configured)",
			},
		}

		if cfg.JSONMode {
			result := map[string]any{"command": "env"}
			for _, sec := range sections {
				out, err := sec.run()
				if err != nil {
					return err
				}
				lines := search.SplitLines(out)
				key := strings.ReplaceAll(sec.name, ".", "_")
				key = strings.ReplaceAll(key, " ", "_")
				key = strings.ReplaceAll(key, "(", "")
				key = strings.ReplaceAll(key, ")", "")
				result[key] = map[string]any{
					"matches": lines,
					"count":   len(lines),
				}
			}
			output.PrintJSON(result)
			return nil
		}

		output.PrintSection("Environment Variables")

		for _, sec := range sections {
			output.PrintSection(sec.name)
			out, err := sec.run()
			if err != nil {
				return err
			}
			if out != "" {
				lines := search.SplitLines(out)
				if sec.limit > 0 {
					lines, _ = output.TruncateResults(lines, sec.limit)
				}
				output.PrintRaw(strings.Join(lines, "\n") + "\n")
			} else {
				output.Print(fmt.Sprintf("  %s", sec.noMatch))
			}
		}
		return nil
	},
}

// filterEnvLines keeps only lines that reference env, process, or import.meta.
func filterEnvLines(lines []string) []string {
	keywords := []string{"env", "process", "import.meta"}
	var filtered []string
	for _, line := range lines {
		lower := strings.ToLower(line)
		for _, kw := range keywords {
			if strings.Contains(lower, kw) {
				filtered = append(filtered, line)
				break
			}
		}
	}
	return filtered
}

// ---------------------------------------------------------------------------
// engineCmd — Find @autumnsgrove/lattice imports
// ---------------------------------------------------------------------------

var engineCmd = &cobra.Command{
	Use:   "engine [module]",
	Short: "Find @autumnsgrove/lattice imports",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		engineExclude := "--glob=!packages/engine"

		if len(args) == 1 {
			module := args[0]

			if cfg.JSONMode {
				out, err := search.RunRg(
					"@autumnsgrove/lattice/"+module,
					search.WithGlobs("*.{ts,js,svelte}"),
					search.WithExtraArgs(engineExclude),
				)
				if err != nil {
					return err
				}
				lines := search.SplitLines(out)
				output.PrintJSON(map[string]any{
					"command": "engine",
					"module":  module,
					"matches": lines,
					"count":   len(lines),
				})
				return nil
			}

			output.PrintSection(fmt.Sprintf("Engine imports from: %s", module))
			out, err := search.RunRg(
				"@autumnsgrove/lattice/"+module,
				search.WithGlobs("*.{ts,js,svelte}"),
				search.WithExtraArgs(engineExclude),
			)
			if err != nil {
				return err
			}
			if out != "" {
				output.PrintRaw(strings.TrimRight(out, "\n") + "\n")
			} else {
				output.Print("  (no imports found)")
			}
			return nil
		}

		// No filter — show imports by module
		type engineSection struct {
			name    string
			pattern string
			limit   int
		}
		sections := []engineSection{
			{"UI Components", "@autumnsgrove/lattice/ui", 15},
			{"Utilities", "@autumnsgrove/lattice/utils", 10},
			{"Stores", "@autumnsgrove/lattice/ui/stores", 10},
			{"Auth", "@autumnsgrove/lattice/auth", 10},
		}

		if cfg.JSONMode {
			result := map[string]any{"command": "engine"}
			for _, sec := range sections {
				out, err := search.RunRg(
					sec.pattern,
					search.WithGlobs("*.{ts,js,svelte}"),
					search.WithExtraArgs(engineExclude),
				)
				if err != nil {
					return err
				}
				lines := search.SplitLines(out)
				key := strings.ToLower(strings.ReplaceAll(sec.name, " ", "_"))
				result[key] = map[string]any{
					"matches": lines,
					"count":   len(lines),
				}
			}
			// Apps using the engine
			out, err := search.RunRg(
				"@autumnsgrove/lattice",
				search.WithGlobs("*.{ts,js,svelte}"),
				search.WithExtraArgs(engineExclude),
				search.WithFilesOnly(),
			)
			if err != nil {
				return err
			}
			dirs := extractTopDirs(search.SplitLines(out))
			result["apps"] = dirs
			output.PrintJSON(result)
			return nil
		}

		output.PrintSection("Engine Imports by Module")

		for _, sec := range sections {
			output.PrintSection(sec.name)
			out, err := search.RunRg(
				sec.pattern,
				search.WithGlobs("*.{ts,js,svelte}"),
				search.WithExtraArgs(engineExclude),
			)
			if err != nil {
				return err
			}
			if out != "" {
				lines := search.SplitLines(out)
				truncated, _ := output.TruncateResults(lines, sec.limit)
				output.PrintRaw(strings.Join(truncated, "\n") + "\n")
			} else {
				output.PrintNoResults(sec.name)
			}
		}

		// Apps using the engine
		output.PrintSection("Apps using the engine")
		out, err := search.RunRg(
			"@autumnsgrove/lattice",
			search.WithGlobs("*.{ts,js,svelte}"),
			search.WithExtraArgs(engineExclude),
			search.WithFilesOnly(),
		)
		if err != nil {
			return err
		}
		if out != "" {
			dirs := extractTopDirs(search.SplitLines(out))
			if len(dirs) > 0 {
				output.PrintRaw(strings.Join(dirs, "\n") + "\n")
			} else {
				output.PrintNoResults("apps")
			}
		} else {
			output.PrintNoResults("apps")
		}

		return nil
	},
}

// extractTopDirs extracts unique top-level directories from file paths.
func extractTopDirs(files []string) []string {
	seen := map[string]bool{}
	for _, f := range files {
		parts := strings.SplitN(f, "/", 2)
		if len(parts) > 0 && parts[0] != "" {
			seen[parts[0]] = true
		}
	}
	dirs := make([]string, 0, len(seen))
	for d := range seen {
		dirs = append(dirs, d)
	}
	sort.Strings(dirs)
	return dirs
}

// ---------------------------------------------------------------------------
// statsCmd — Git statistics
// ---------------------------------------------------------------------------

var statsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show project git statistics",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		// Current branch
		branch, _ := search.RunGit("branch", "--show-current")
		branch = strings.TrimSpace(branch)

		// Commit counts
		totalOut, _ := search.RunGit("rev-list", "--count", "HEAD")
		totalCommits := strings.TrimSpace(totalOut)

		todayOut, _ := search.RunGit("log", "--oneline", "--since=midnight")
		todayCount := countLines(todayOut)

		weekOut, _ := search.RunGit("log", "--oneline", "--since=1 week ago")
		weekCount := countLines(weekOut)

		monthOut, _ := search.RunGit("log", "--oneline", "--since=1 month ago")
		monthCount := countLines(monthOut)

		// Branch counts
		allBranchOut, _ := search.RunGit("branch", "-a")
		allBranchCount := countLines(allBranchOut)

		localBranchOut, _ := search.RunGit("branch")
		localBranchCount := countLines(localBranchOut)

		// Contributors
		shortlogOut, _ := search.RunGit("shortlog", "-sn", "--no-merges")

		// Tags
		tagsOut, _ := search.RunGit("tag")
		tagCount := countLines(tagsOut)

		latestTag, _ := search.RunGit("describe", "--tags", "--abbrev=0")
		latestTag = strings.TrimSpace(latestTag)
		if latestTag == "" {
			latestTag = "none"
		}

		// GitHub stats (if gh available)
		t := tools.Discover()
		var openPRCount, openIssueCount int
		hasGH := t.HasGh()
		if hasGH {
			prOut, _ := search.RunGh("pr", "list", "--state", "open")
			openPRCount = countLines(prOut)
			issueOut, _ := search.RunGh("issue", "list", "--state", "open")
			openIssueCount = countLines(issueOut)
		}

		// Working directory
		statusOut, _ := search.RunGit("status", "--short")
		statusCount := countLines(statusOut)

		stashOut, _ := search.RunGit("stash", "list")
		stashCount := countLines(stashOut)

		if cfg.JSONMode {
			result := map[string]any{
				"command": "stats",
				"branch":  branch,
				"commits": map[string]any{
					"total": totalCommits,
					"today": todayCount,
					"week":  weekCount,
					"month": monthCount,
				},
				"branches": map[string]any{
					"total": allBranchCount,
					"local": localBranchCount,
				},
				"tags": map[string]any{
					"count":  tagCount,
					"latest": latestTag,
				},
				"working_directory": map[string]any{
					"uncommitted": statusCount,
					"stashes":     stashCount,
				},
			}
			if hasGH {
				result["github"] = map[string]any{
					"open_prs":    openPRCount,
					"open_issues": openIssueCount,
				}
			}
			output.PrintJSON(result)
			return nil
		}

		output.PrintMajorHeader("Project Git Stats Snapshot")

		output.Print(fmt.Sprintf("Current Branch: %s", branch))

		output.PrintSection("Commit Stats")
		output.Print(fmt.Sprintf("  Total commits: %s", totalCommits))
		output.Print(fmt.Sprintf("  Today: %d", todayCount))
		output.Print(fmt.Sprintf("  This week: %d", weekCount))
		output.Print(fmt.Sprintf("  This month: %d", monthCount))

		output.PrintSection("Branch Stats")
		output.Print(fmt.Sprintf("  Total branches: %d", allBranchCount))
		output.Print(fmt.Sprintf("  Local branches: %d", localBranchCount))

		output.PrintSection("Contributors")
		if shortlogOut != "" {
			lines := search.SplitLines(shortlogOut)
			truncated, _ := output.TruncateResults(lines, 5)
			output.PrintRaw(strings.Join(truncated, "\n") + "\n")
		}

		output.PrintSection("Tag Stats")
		output.Print(fmt.Sprintf("  Total tags: %d", tagCount))
		output.Print(fmt.Sprintf("  Latest tag: %s", latestTag))

		if hasGH {
			output.PrintSection("GitHub Stats (via gh)")
			output.Print(fmt.Sprintf("  Open PRs: %d", openPRCount))
			output.Print(fmt.Sprintf("  Open issues: %d", openIssueCount))
		} else {
			output.Print("\nInstall GitHub CLI (gh) for PR/issue stats")
		}

		output.PrintSection("Working Directory")
		if statusCount == 0 {
			output.Print("  Status: Clean")
		} else {
			output.Print(fmt.Sprintf("  Status: %d uncommitted changes", statusCount))
		}
		output.Print(fmt.Sprintf("  Stashes: %d", stashCount))

		return nil
	},
}

// ---------------------------------------------------------------------------
// briefingCmd — Daily briefing
// ---------------------------------------------------------------------------

var briefingCmd = &cobra.Command{
	Use:   "briefing",
	Short: "Daily briefing with issues, TODOs, and activity",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		now := time.Now()
		dateStr := now.Format("Monday, January 02, 2006")

		// Current status
		branch, _ := search.RunGit("branch", "--show-current")
		branch = strings.TrimSpace(branch)

		uncommittedOut, _ := search.RunGit("status", "--short")
		uncommittedCount := countLines(uncommittedOut)

		// GitHub issues (if gh available)
		t := tools.Discover()
		hasGH := t.HasGh()

		var criticalIssues, highIssues, openIssueJSON string
		if hasGH {
			criticalIssues, _ = search.RunGh(
				"issue", "list", "--state", "open",
				"--label", "priority-critical", "--limit", "5",
			)
			highIssues, _ = search.RunGh(
				"issue", "list", "--state", "open",
				"--label", "priority-high", "--limit", "5",
			)
			openIssueJSON, _ = search.RunGh(
				"issue", "list", "--state", "open", "--json", "number",
			)
		}

		// TODOs in code
		todoOut, _ := search.RunRg(
			`\bTODO\b`,
			search.WithGlobs("*.{ts,js,svelte}"),
			search.WithExtraArgs("--glob", "!*.md"),
		)

		// Yesterday's commits
		yesterdayOut, _ := search.RunGit(
			"log", "--oneline", "--since=yesterday", "--until=midnight",
		)

		// Project structure counts
		pageRoutes, _ := search.FindFilesByGlob([]string{"**/+page.svelte"})
		apiRoutes, _ := search.FindFilesByGlob([]string{"**/+server.ts"})
		svelteFiles, _ := search.FindFiles("", search.WithGlobs("*.svelte"))

		// Hot files this week
		weekFilesOut, _ := search.RunGit(
			"log", "--since=1 week ago", "--name-only", "--pretty=format:",
		)

		if cfg.JSONMode {
			result := map[string]any{
				"command": "briefing",
				"date":    dateStr,
				"status": map[string]any{
					"branch":      branch,
					"uncommitted": uncommittedCount,
				},
			}

			todoLines := search.SplitLines(todoOut)
			result["todos"] = map[string]any{
				"count":  len(todoLines),
				"sample": truncateSlice(todoLines, 10),
			}

			yesterdayLines := search.SplitLines(yesterdayOut)
			result["yesterday_commits"] = map[string]any{
				"count":   len(yesterdayLines),
				"commits": truncateSlice(yesterdayLines, 5),
			}

			result["structure"] = map[string]any{
				"page_routes":       len(pageRoutes),
				"api_routes":        len(apiRoutes),
				"svelte_components": len(svelteFiles),
			}

			if hasGH {
				ghData := map[string]any{}
				if strings.TrimSpace(criticalIssues) != "" {
					ghData["critical"] = search.SplitLines(criticalIssues)
				}
				if strings.TrimSpace(highIssues) != "" {
					ghData["high"] = search.SplitLines(highIssues)
				}
				if openIssueJSON != "" {
					var issues []any
					if err := json.Unmarshal([]byte(openIssueJSON), &issues); err == nil {
						ghData["total_open"] = len(issues)
					}
				}
				result["github_issues"] = ghData
			}

			hotFiles := buildHotFiles(weekFilesOut)
			if len(hotFiles) > 0 {
				result["hot_files"] = hotFiles
			}

			output.PrintJSON(result)
			return nil
		}

		output.PrintMajorHeader("Daily Briefing")
		output.Print(fmt.Sprintf("Date: %s\n", dateStr))

		// Current Status
		output.PrintSection("Current Status")
		output.Print(fmt.Sprintf("  Branch: %s", branch))
		if uncommittedCount > 0 {
			output.Print(fmt.Sprintf("  %d uncommitted changes", uncommittedCount))
		} else {
			output.Print("  Working directory clean")
		}

		// GitHub Issues
		if hasGH {
			output.PrintSection("Priority Issues")

			if strings.TrimSpace(criticalIssues) != "" {
				output.Print("  CRITICAL:")
				for _, line := range search.SplitLines(criticalIssues) {
					output.Print(fmt.Sprintf("    %s", line))
				}
				output.Print("")
			}

			if strings.TrimSpace(highIssues) != "" {
				output.Print("  HIGH:")
				for _, line := range search.SplitLines(highIssues) {
					output.Print(fmt.Sprintf("    %s", line))
				}
				output.Print("")
			}

			if openIssueJSON != "" {
				var issues []any
				if err := json.Unmarshal([]byte(openIssueJSON), &issues); err == nil {
					output.Print(fmt.Sprintf("  Total open issues: %d", len(issues)))
				}
			}
			output.Print("  View all: gh issue list --state open")
		} else {
			output.Print("\nGitHub CLI (gh) not available - install for issue tracking")
		}

		// TODOs in code
		output.PrintSection("Oldest TODO Comments in Code")
		output.Print("  (These have been waiting the longest!)\n")
		if todoOut != "" {
			todoLines := search.SplitLines(todoOut)
			truncated := truncateSlice(todoLines, 10)
			for _, line := range truncated {
				if len(line) > 100 {
					line = line[:100]
				}
				output.Print(fmt.Sprintf("  %s", line))
			}
		} else {
			output.Print("  No TODOs found!")
		}

		// Yesterday's commits
		output.PrintSection("Yesterday's Commits")
		if strings.TrimSpace(yesterdayOut) != "" {
			lines := search.SplitLines(yesterdayOut)
			truncated := truncateSlice(lines, 5)
			output.PrintRaw(strings.Join(truncated, "\n") + "\n")
		} else {
			output.Print("  No commits yesterday")
		}

		// Project structure
		output.PrintSection("Project Structure")
		output.Print(fmt.Sprintf("  Page routes: %d", len(pageRoutes)))
		output.Print(fmt.Sprintf("  API routes: %d", len(apiRoutes)))
		output.Print(fmt.Sprintf("  Svelte components: %d", len(svelteFiles)))

		// Find largest component (>200 lines)
		if len(svelteFiles) > 0 {
			largest, largestLines := findLargestFile(svelteFiles, cfg.GroveRoot)
			if largest != "" {
				output.Print(fmt.Sprintf("  Largest component: %s (%d lines)", largest, largestLines))
			}
		}

		// Hot files
		output.PrintSection("Hot Files (Changed This Week)")
		hotFiles := buildHotFiles(weekFilesOut)
		if len(hotFiles) > 0 {
			for _, hf := range hotFiles {
				output.Print(fmt.Sprintf("  %d changes: %s", hf.count, hf.file))
			}
		} else {
			output.Print("  No changes this week")
		}

		output.Print("\nReady to build something great!")
		return nil
	},
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// countLines counts non-empty lines in text.
func countLines(text string) int {
	text = strings.TrimSpace(text)
	if text == "" {
		return 0
	}
	return len(search.SplitLines(text))
}

// truncateSlice returns at most max items from a slice.
func truncateSlice(items []string, max int) []string {
	if len(items) <= max {
		return items
	}
	return items[:max]
}

type hotFile struct {
	file  string
	count int
}

// buildHotFiles parses git log --name-only output and returns most changed files.
func buildHotFiles(gitOutput string) []hotFile {
	if strings.TrimSpace(gitOutput) == "" {
		return nil
	}

	fileCounts := map[string]int{}
	for _, line := range strings.Split(gitOutput, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		skip := false
		for _, exc := range []string{"node_modules", "pnpm-lock", "dist"} {
			if strings.Contains(line, exc) {
				skip = true
				break
			}
		}
		if !skip {
			fileCounts[line]++
		}
	}

	files := make([]hotFile, 0, len(fileCounts))
	for f, c := range fileCounts {
		files = append(files, hotFile{file: f, count: c})
	}
	sort.Slice(files, func(i, j int) bool {
		return files[i].count > files[j].count
	})

	if len(files) > 10 {
		files = files[:10]
	}
	return files
}

// findLargestFile finds the svelte file with the most lines (>200).
func findLargestFile(files []string, root string) (string, int) {
	var largest string
	var maxLines int

	for _, f := range files {
		if strings.Contains(f, "node_modules") || strings.Contains(f, "_deprecated") {
			continue
		}

		// Use wc -l equivalent: count lines via RunRg on the file isn't ideal;
		// instead we use search.RunRg with a match-all to count. But simpler
		// to just use the file path directly. Since we don't have direct file
		// read in search package, we estimate by searching for any line.
		fullPath := f
		if !filepath.IsAbs(f) {
			fullPath = filepath.Join(root, f)
		}

		// Count lines with rg (match everything in the single file)
		out, err := search.RunRgRaw(
			[]string{"--count-matches", ".", fullPath},
			search.WithExcludes(nil),
		)
		if err != nil || strings.TrimSpace(out) == "" {
			continue
		}

		// Output format: "filepath:count" or just "count"
		countStr := strings.TrimSpace(out)
		if idx := strings.LastIndex(countStr, ":"); idx >= 0 {
			countStr = countStr[idx+1:]
		}
		var lineCount int
		fmt.Sscanf(countStr, "%d", &lineCount)

		if lineCount > 200 && lineCount > maxLines {
			maxLines = lineCount
			rel, err := filepath.Rel(root, fullPath)
			if err != nil {
				rel = f
			}
			largest = rel
		}
	}

	return largest, maxLines
}
