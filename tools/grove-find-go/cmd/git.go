package cmd

import (
	"fmt"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
)

// excludePatterns are paths filtered from git results.
var excludePatterns = []string{"node_modules", "pnpm-lock", "dist", ".svelte-kit"}

// shouldExclude returns true if the path matches any exclude pattern.
func shouldExclude(path string) bool {
	for _, exc := range excludePatterns {
		if strings.Contains(path, exc) {
			return true
		}
	}
	return false
}

// dirFromPath extracts the directory portion of a file path.
func dirFromPath(path string) string {
	d := filepath.Dir(path)
	if d == "." {
		return "."
	}
	return d
}

// countByDir counts files grouped by their directory.
func countByDir(files []string) map[string]int {
	dirs := make(map[string]int)
	for _, f := range files {
		d := dirFromPath(f)
		dirs[d]++
	}
	return dirs
}

// sortedMapByValue returns entries sorted by value descending.
type kv struct {
	Key   string
	Value int
}

func sortedMapByValue(m map[string]int, limit int) []kv {
	entries := make([]kv, 0, len(m))
	for k, v := range m {
		entries = append(entries, kv{k, v})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Value > entries[j].Value
	})
	if limit > 0 && len(entries) > limit {
		entries = entries[:limit]
	}
	return entries
}

// ---------------------------------------------------------------------------
// Top-level commands (registered on root)
// ---------------------------------------------------------------------------

// recentCmd — gf recent [days]
var recentCmd = &cobra.Command{
	Use:   "recent [days]",
	Short: "Find recently modified files",
	Long:  "Show files modified in the last N days (default 7) with a directory summary.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		days := 7
		if len(args) > 0 {
			n, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid number of days: %s", args[0])
			}
			days = n
		}

		cfg := config.Get()

		if cfg.JSONMode {
			return recentJSON(days)
		}

		output.PrintSection(fmt.Sprintf("Files modified in the last %d day(s)", days))

		raw, err := search.RunGit("log", fmt.Sprintf("--since=%d days ago", days), "--name-only", "--pretty=format:")
		if err != nil {
			return fmt.Errorf("git log failed: %w", err)
		}

		if strings.TrimSpace(raw) == "" {
			output.PrintWarning(fmt.Sprintf("No files modified in the last %d days", days))
			return nil
		}

		// Deduplicate and filter
		seen := make(map[string]bool)
		var files []string
		for _, line := range search.SplitLines(raw) {
			if shouldExclude(line) || seen[line] {
				continue
			}
			seen[line] = true
			files = append(files, line)
		}
		sort.Strings(files)

		shown, overflow := output.TruncateResults(files, 50)
		output.PrintRaw(strings.Join(shown, "\n") + "\n")
		if overflow > 0 {
			output.PrintDim(fmt.Sprintf("(%d more files not shown)", overflow))
		}

		// Summary by directory
		output.PrintSection("Summary by directory")
		dirs := countByDir(files)
		for _, entry := range sortedMapByValue(dirs, 15) {
			output.Printf("  %4d  %s/", entry.Value, entry.Key)
		}

		return nil
	},
}

func recentJSON(days int) error {
	raw, err := search.RunGit("log", fmt.Sprintf("--since=%d days ago", days), "--name-only", "--pretty=format:")
	if err != nil {
		return err
	}

	seen := make(map[string]bool)
	var files []string
	for _, line := range search.SplitLines(raw) {
		if shouldExclude(line) || seen[line] {
			continue
		}
		seen[line] = true
		files = append(files, line)
	}
	sort.Strings(files)

	dirs := countByDir(files)
	dirSummary := sortedMapByValue(dirs, 15)
	dirEntries := make([]map[string]any, 0, len(dirSummary))
	for _, e := range dirSummary {
		dirEntries = append(dirEntries, map[string]any{"directory": e.Key, "count": e.Value})
	}

	output.PrintJSON(map[string]any{
		"command":   "recent",
		"days":      days,
		"files":     files,
		"count":     len(files),
		"by_directory": dirEntries,
	})
	return nil
}

// changedCmd — gf changed [base]
var changedCmd = &cobra.Command{
	Use:   "changed [base]",
	Short: "Files changed on current branch vs base",
	Long:  "Show files changed on the current branch compared to base (default main), with type breakdown and commits.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		base := "main"
		if len(args) > 0 {
			base = args[0]
		}

		cfg := config.Get()

		// Get current branch
		current, err := search.RunGit("branch", "--show-current")
		if err != nil {
			return fmt.Errorf("failed to get current branch: %w", err)
		}
		current = strings.TrimSpace(current)

		if cfg.JSONMode {
			return changedJSON(base, current)
		}

		output.PrintSection(fmt.Sprintf("Files changed on %s vs %s", current, base))

		// Changed files
		raw, err := search.RunGit("diff", "--name-only", fmt.Sprintf("%s...HEAD", base))
		if err != nil {
			return fmt.Errorf("git diff failed: %w", err)
		}

		if strings.TrimSpace(raw) == "" {
			output.PrintWarning(fmt.Sprintf("No changes found between %s and HEAD", base))
			return nil
		}

		var files []string
		for _, f := range search.SplitLines(raw) {
			if !shouldExclude(f) {
				files = append(files, f)
			}
		}

		shown, overflow := output.TruncateResults(files, 50)
		output.PrintRaw(strings.Join(shown, "\n") + "\n")
		if overflow > 0 {
			output.PrintDim(fmt.Sprintf("(%d more files not shown)", overflow))
		}

		// Change summary
		output.PrintSection("Change Summary")
		stat, err := search.RunGit("diff", "--stat", fmt.Sprintf("%s...HEAD", base))
		if err == nil && strings.TrimSpace(stat) != "" {
			lines := search.SplitLines(stat)
			if len(lines) > 0 {
				output.Print(lines[len(lines)-1])
			}
		}

		// By file type
		output.PrintSection("By Type")
		types := make(map[string]int)
		for _, f := range files {
			ext := "other"
			if idx := strings.LastIndex(f, "."); idx >= 0 {
				ext = f[idx+1:]
			}
			types[ext]++
		}
		for _, entry := range sortedMapByValue(types, 0) {
			output.Printf("  %4d  .%s", entry.Value, entry.Key)
		}

		// Commits on branch
		output.PrintSection("Commits on this branch")
		commits, err := search.RunGit("log", "--oneline", fmt.Sprintf("%s..HEAD", base))
		if err == nil && strings.TrimSpace(commits) != "" {
			lines := search.SplitLines(commits)
			shown, _ := output.TruncateResults(lines, 15)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		}

		return nil
	},
}

func changedJSON(base, current string) error {
	raw, _ := search.RunGit("diff", "--name-only", fmt.Sprintf("%s...HEAD", base))
	var files []string
	for _, f := range search.SplitLines(raw) {
		if !shouldExclude(f) {
			files = append(files, f)
		}
	}

	types := make(map[string]int)
	for _, f := range files {
		ext := "other"
		if idx := strings.LastIndex(f, "."); idx >= 0 {
			ext = f[idx+1:]
		}
		types[ext]++
	}

	stat, _ := search.RunGit("diff", "--stat", fmt.Sprintf("%s...HEAD", base))
	statLines := search.SplitLines(stat)
	summary := ""
	if len(statLines) > 0 {
		summary = statLines[len(statLines)-1]
	}

	commits, _ := search.RunGit("log", "--oneline", fmt.Sprintf("%s..HEAD", base))
	commitLines := search.SplitLines(commits)

	output.PrintJSON(map[string]any{
		"command":       "changed",
		"branch":        current,
		"base":          base,
		"files":         files,
		"count":         len(files),
		"by_type":       types,
		"stat_summary":  summary,
		"commits":       commitLines,
		"commit_count":  len(commitLines),
	})
	return nil
}

// ---------------------------------------------------------------------------
// Git subcommand group
// ---------------------------------------------------------------------------

var gitCmd = &cobra.Command{
	Use:   "git",
	Short: "Git operations",
	Long:  "Git subcommands for blame, history, pickaxe, commits, churn, branches, PR prep, WIP, stash, reflog, and tags.",
}

func init() {
	gitCmd.AddCommand(blameSubCmd)
	gitCmd.AddCommand(historySubCmd)
	gitCmd.AddCommand(pickaxeSubCmd)
	gitCmd.AddCommand(commitsSubCmd)
	gitCmd.AddCommand(churnSubCmd)
	gitCmd.AddCommand(branchesSubCmd)
	gitCmd.AddCommand(prSubCmd)
	gitCmd.AddCommand(wipSubCmd)
	gitCmd.AddCommand(stashSubCmd)
	gitCmd.AddCommand(reflogSubCmd)
	gitCmd.AddCommand(tagSubCmd)

	// history flags
	historySubCmd.Flags().IntVarP(&historyCount, "count", "n", 20, "Number of commits to show")
}

var historyCount int

// ---------------------------------------------------------------------------
// git blame
// ---------------------------------------------------------------------------

var blameSubCmd = &cobra.Command{
	Use:   "blame <file> [line_range]",
	Short: "Enhanced git blame with age info",
	Long:  "Show git blame with relative dates. Optionally restrict to a line range (e.g. 10,50).",
	Args:  cobra.RangeArgs(1, 2),
	RunE: func(cmd *cobra.Command, args []string) error {
		file := args[0]
		var lineRange string
		if len(args) > 1 {
			lineRange = args[1]
		}

		cfg := config.Get()

		if cfg.JSONMode {
			return blameJSON(file, lineRange)
		}

		output.PrintSection(fmt.Sprintf("Blame for: %s", file))

		gitArgs := []string{"blame", "--date=relative"}
		if cfg.IsHumanMode() {
			gitArgs = append(gitArgs, "--color-by-age")
		}
		if lineRange != "" {
			gitArgs = append(gitArgs, "-L", lineRange)
		}
		gitArgs = append(gitArgs, file)

		raw, err := search.RunGit(gitArgs...)
		if err != nil {
			return fmt.Errorf("git blame failed: %w", err)
		}

		if strings.TrimSpace(raw) == "" {
			output.PrintWarning(fmt.Sprintf("Could not blame %s", file))
			return nil
		}

		lines := search.SplitLines(raw)
		shown, overflow := output.TruncateResults(lines, 100)
		output.PrintRaw(strings.Join(shown, "\n") + "\n")
		if overflow > 0 {
			output.PrintDim(fmt.Sprintf("(Showing first 100 lines. Use gf git blame %s 1,999 for full file.)", file))
		}

		return nil
	},
}

func blameJSON(file, lineRange string) error {
	gitArgs := []string{"blame", "--date=relative"}
	if lineRange != "" {
		gitArgs = append(gitArgs, "-L", lineRange)
	}
	gitArgs = append(gitArgs, file)

	raw, err := search.RunGit(gitArgs...)
	if err != nil {
		return err
	}

	lines := search.SplitLines(raw)
	output.PrintJSON(map[string]any{
		"command":    "blame",
		"file":       file,
		"line_range": lineRange,
		"lines":      lines,
		"count":      len(lines),
	})
	return nil
}

// ---------------------------------------------------------------------------
// git history
// ---------------------------------------------------------------------------

var historySubCmd = &cobra.Command{
	Use:   "history <file>",
	Short: "Commit history for a specific file",
	Long:  "Show commit history, change frequency, and contributors for a file.",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		file := args[0]
		cfg := config.Get()

		if cfg.JSONMode {
			return historyJSON(file, historyCount)
		}

		output.PrintSection(fmt.Sprintf("History for: %s", file))

		// Commits
		output.PrintSection("Commits")
		raw, err := search.RunGit("log", "--oneline", "-n", strconv.Itoa(historyCount), "--follow", "--", file)
		if err != nil {
			return fmt.Errorf("git log failed: %w", err)
		}

		if strings.TrimSpace(raw) == "" {
			output.PrintWarning(fmt.Sprintf("No history found for %s", file))
			return nil
		}
		output.PrintRaw(strings.TrimRight(raw, "\n") + "\n")

		// Total commits (change frequency)
		output.PrintSection("Change frequency")
		total, _ := search.RunGit("log", "--oneline", "--follow", "--", file)
		totalCount := 0
		if strings.TrimSpace(total) != "" {
			totalCount = len(search.SplitLines(total))
		}
		output.Printf("  Total commits touching this file: %d", totalCount)

		// Contributors
		output.PrintSection("Contributors")
		authors, _ := search.RunGit("log", "--format=%an", "--follow", "--", file)
		if strings.TrimSpace(authors) != "" {
			authorCounts := make(map[string]int)
			for _, author := range search.SplitLines(authors) {
				authorCounts[author]++
			}
			for _, entry := range sortedMapByValue(authorCounts, 10) {
				output.Printf("  %4d  %s", entry.Value, entry.Key)
			}
		}

		return nil
	},
}

func historyJSON(file string, count int) error {
	raw, _ := search.RunGit("log", "--oneline", "-n", strconv.Itoa(count), "--follow", "--", file)
	commits := search.SplitLines(raw)

	total, _ := search.RunGit("log", "--oneline", "--follow", "--", file)
	totalCount := len(search.SplitLines(total))

	authors, _ := search.RunGit("log", "--format=%an", "--follow", "--", file)
	authorCounts := make(map[string]int)
	for _, author := range search.SplitLines(authors) {
		authorCounts[author]++
	}

	output.PrintJSON(map[string]any{
		"command":       "history",
		"file":          file,
		"commits":       commits,
		"total_commits": totalCount,
		"contributors":  authorCounts,
	})
	return nil
}

// ---------------------------------------------------------------------------
// git pickaxe
// ---------------------------------------------------------------------------

var pickaxeSubCmd = &cobra.Command{
	Use:   "pickaxe <search> [path]",
	Short: "Find commits that added/removed a string",
	Long:  "Uses git log -S to find commits that introduced or removed the given string. Incredibly powerful for finding when something was introduced.",
	Args:  cobra.RangeArgs(1, 2),
	RunE: func(cmd *cobra.Command, args []string) error {
		searchTerm := args[0]
		var path string
		if len(args) > 1 {
			path = args[1]
		}

		cfg := config.Get()

		if cfg.JSONMode {
			return pickaxeJSON(searchTerm, path)
		}

		output.PrintSection(fmt.Sprintf("Finding commits that added/removed: %s", searchTerm))

		gitArgs := []string{"log", "-S", searchTerm, "--oneline", "--all"}
		if path != "" {
			gitArgs = append(gitArgs, "--", path)
		}

		raw, err := search.RunGit(gitArgs...)
		if err != nil {
			return fmt.Errorf("git log -S failed: %w", err)
		}

		if strings.TrimSpace(raw) == "" {
			output.PrintWarning(fmt.Sprintf("No commits found that added/removed '%s'", searchTerm))
			return nil
		}

		lines := search.SplitLines(raw)
		shown, _ := output.TruncateResults(lines, 30)
		output.PrintRaw(strings.Join(shown, "\n") + "\n")
		output.PrintTip("Use 'git show <hash>' to see the full commit")

		return nil
	},
}

func pickaxeJSON(searchTerm, path string) error {
	gitArgs := []string{"log", "-S", searchTerm, "--oneline", "--all"}
	if path != "" {
		gitArgs = append(gitArgs, "--", path)
	}

	raw, _ := search.RunGit(gitArgs...)
	lines := search.SplitLines(raw)

	output.PrintJSON(map[string]any{
		"command": "pickaxe",
		"search":  searchTerm,
		"path":    path,
		"commits": lines,
		"count":   len(lines),
	})
	return nil
}

// ---------------------------------------------------------------------------
// git commits
// ---------------------------------------------------------------------------

var commitsSubCmd = &cobra.Command{
	Use:   "commits [count]",
	Short: "Recent commits with stats",
	Long:  "Show recent commits with diffstats, plus today and this-week summaries.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		count := 15
		if len(args) > 0 {
			n, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid count: %s", args[0])
			}
			count = n
		}

		cfg := config.Get()

		if cfg.JSONMode {
			return commitsJSON(count)
		}

		output.PrintSection(fmt.Sprintf("Recent %d commits", count))

		raw, err := search.RunGit("log", "--oneline", "--stat", "-n", strconv.Itoa(count))
		if err != nil {
			return fmt.Errorf("git log failed: %w", err)
		}

		if strings.TrimSpace(raw) != "" {
			// Filter out noisy files
			var filtered []string
			for _, line := range strings.Split(raw, "\n") {
				if !shouldExclude(line) {
					filtered = append(filtered, line)
				}
			}
			shown, _ := output.TruncateResults(filtered, 100)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		}

		// Today's commits
		output.PrintSection("Today's commits")
		today, _ := search.RunGit("log", "--oneline", "--since=midnight")
		if strings.TrimSpace(today) != "" {
			output.PrintRaw(strings.TrimRight(today, "\n") + "\n")
		} else {
			output.Print("  (none)")
		}

		// This week
		output.PrintSection("This week")
		week, _ := search.RunGit("log", "--oneline", "--since=1 week ago")
		weekCount := 0
		if strings.TrimSpace(week) != "" {
			weekCount = len(search.SplitLines(week))
		}
		output.Printf("  %d commits in the last 7 days", weekCount)

		return nil
	},
}

func commitsJSON(count int) error {
	raw, _ := search.RunGit("log", "--oneline", "-n", strconv.Itoa(count))
	commits := search.SplitLines(raw)

	today, _ := search.RunGit("log", "--oneline", "--since=midnight")
	todayCommits := search.SplitLines(today)

	week, _ := search.RunGit("log", "--oneline", "--since=1 week ago")
	weekCommits := search.SplitLines(week)

	output.PrintJSON(map[string]any{
		"command":       "commits",
		"count":         count,
		"commits":       commits,
		"today":         todayCommits,
		"today_count":   len(todayCommits),
		"week_count":    len(weekCommits),
	})
	return nil
}

// ---------------------------------------------------------------------------
// git churn
// ---------------------------------------------------------------------------

var churnSubCmd = &cobra.Command{
	Use:   "churn [days]",
	Short: "Find most frequently changed files (hotspots)",
	Long:  "Analyze code churn over the last N days (default 30). Shows top 20 hotspots and breakdown by directory.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		days := 30
		if len(args) > 0 {
			n, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid number of days: %s", args[0])
			}
			days = n
		}

		cfg := config.Get()

		if cfg.JSONMode {
			return churnJSON(days)
		}

		output.PrintSection(fmt.Sprintf("Code Churn: Most frequently changed files (last %d days)", days))

		raw, err := search.RunGit("log", fmt.Sprintf("--since=%d days ago", days), "--name-only", "--pretty=format:")
		if err != nil {
			return fmt.Errorf("git log failed: %w", err)
		}

		if strings.TrimSpace(raw) == "" {
			output.PrintWarning(fmt.Sprintf("No changes found in the last %d days", days))
			return nil
		}

		// Count file occurrences
		fileCounts := make(map[string]int)
		for _, line := range search.SplitLines(raw) {
			if !shouldExclude(line) {
				fileCounts[line]++
			}
		}

		// Top 20
		output.PrintSection("Top 20 Hotspots")
		for _, entry := range sortedMapByValue(fileCounts, 20) {
			output.Printf("  %4d changes: %s", entry.Value, entry.Key)
		}

		// By directory
		output.PrintSection("By Directory")
		dirCounts := make(map[string]int)
		for file, count := range fileCounts {
			d := dirFromPath(file)
			dirCounts[d] += count
		}
		for _, entry := range sortedMapByValue(dirCounts, 10) {
			output.Printf("  %4d changes: %s/", entry.Value, entry.Key)
		}

		output.PrintTip("High churn files often have bugs or need refactoring")

		return nil
	},
}

func churnJSON(days int) error {
	raw, _ := search.RunGit("log", fmt.Sprintf("--since=%d days ago", days), "--name-only", "--pretty=format:")

	fileCounts := make(map[string]int)
	for _, line := range search.SplitLines(raw) {
		if !shouldExclude(line) {
			fileCounts[line]++
		}
	}

	hotspots := sortedMapByValue(fileCounts, 20)
	hotspotEntries := make([]map[string]any, 0, len(hotspots))
	for _, e := range hotspots {
		hotspotEntries = append(hotspotEntries, map[string]any{"file": e.Key, "changes": e.Value})
	}

	dirCounts := make(map[string]int)
	for file, count := range fileCounts {
		dirCounts[dirFromPath(file)] += count
	}
	dirEntries := sortedMapByValue(dirCounts, 10)
	dirJSON := make([]map[string]any, 0, len(dirEntries))
	for _, e := range dirEntries {
		dirJSON = append(dirJSON, map[string]any{"directory": e.Key, "changes": e.Value})
	}

	output.PrintJSON(map[string]any{
		"command":      "churn",
		"days":         days,
		"hotspots":     hotspotEntries,
		"by_directory": dirJSON,
		"total_files":  len(fileCounts),
	})
	return nil
}

// ---------------------------------------------------------------------------
// git branches
// ---------------------------------------------------------------------------

var branchesSubCmd = &cobra.Command{
	Use:   "branches",
	Short: "List branches with useful info",
	Long:  "Show local branches sorted by last commit date, remote branches, and branches merged to main.",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if cfg.JSONMode {
			return branchesJSON()
		}

		output.PrintSection("Git Branches")

		current, _ := search.RunGit("branch", "--show-current")
		current = strings.TrimSpace(current)
		output.Printf("Current: %s", current)

		// Local branches by last commit
		output.PrintSection("Local Branches (by last commit)")
		raw, _ := search.RunGit(
			"for-each-ref",
			"--sort=-committerdate",
			"refs/heads/",
			"--format=%(refname:short)|%(committerdate:relative)|%(subject)",
		)
		if strings.TrimSpace(raw) != "" {
			lines := search.SplitLines(raw)
			shown, _ := output.TruncateResults(lines, 15)
			for _, line := range shown {
				parts := strings.SplitN(line, "|", 3)
				if len(parts) >= 3 {
					branch, date, subject := parts[0], parts[1], parts[2]
					if len(subject) > 60 {
						subject = subject[:60]
					}
					if branch == current {
						output.Printf("  * %s (%s)", branch, date)
					} else {
						output.Printf("    %s (%s)", branch, date)
					}
					output.Printf("      %s", subject)
				}
			}
		}

		// Remote branches
		output.PrintSection("Remote Branches")
		remotes, _ := search.RunGit("branch", "-r")
		if strings.TrimSpace(remotes) != "" {
			lines := search.SplitLines(remotes)
			shown, _ := output.TruncateResults(lines, 10)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		}

		// Merged to main
		output.PrintSection("Merged to main (safe to delete)")
		merged, _ := search.RunGit("branch", "--merged", "main")
		if strings.TrimSpace(merged) != "" {
			var branches []string
			for _, b := range search.SplitLines(merged) {
				b = strings.TrimSpace(b)
				if !strings.Contains(b, "main") && !strings.Contains(b, "master") && !strings.HasPrefix(b, "*") {
					branches = append(branches, b)
				}
			}
			if len(branches) > 0 {
				shown, _ := output.TruncateResults(branches, 10)
				output.PrintRaw(strings.Join(shown, "\n") + "\n")
			} else {
				output.Print("  (none)")
			}
		} else {
			output.Print("  (none)")
		}

		return nil
	},
}

func branchesJSON() error {
	current, _ := search.RunGit("branch", "--show-current")
	current = strings.TrimSpace(current)

	raw, _ := search.RunGit(
		"for-each-ref",
		"--sort=-committerdate",
		"refs/heads/",
		"--format=%(refname:short)|%(committerdate:relative)|%(subject)",
	)
	var localBranches []map[string]any
	for _, line := range search.SplitLines(raw) {
		parts := strings.SplitN(line, "|", 3)
		if len(parts) >= 3 {
			localBranches = append(localBranches, map[string]any{
				"name":      parts[0],
				"last_commit": parts[1],
				"subject":   parts[2],
				"current":   parts[0] == current,
			})
		}
	}

	remotes, _ := search.RunGit("branch", "-r")
	remoteBranches := search.SplitLines(remotes)

	merged, _ := search.RunGit("branch", "--merged", "main")
	var mergedBranches []string
	for _, b := range search.SplitLines(merged) {
		b = strings.TrimSpace(b)
		if !strings.Contains(b, "main") && !strings.Contains(b, "master") && !strings.HasPrefix(b, "*") {
			mergedBranches = append(mergedBranches, b)
		}
	}

	output.PrintJSON(map[string]any{
		"command":         "branches",
		"current":         current,
		"local_branches":  localBranches,
		"remote_branches": remoteBranches,
		"merged_to_main":  mergedBranches,
	})
	return nil
}

// ---------------------------------------------------------------------------
// git pr
// ---------------------------------------------------------------------------

var prSubCmd = &cobra.Command{
	Use:   "pr [base]",
	Short: "PR preparation summary",
	Long:  "Generate a PR prep report: commits, files changed, stats, and a suggested PR description.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		base := "main"
		if len(args) > 0 {
			base = args[0]
		}

		cfg := config.Get()

		current, _ := search.RunGit("branch", "--show-current")
		current = strings.TrimSpace(current)

		if cfg.JSONMode {
			return prJSON(base, current)
		}

		output.PrintMajorHeader("PR Summary")
		output.Printf("Branch: %s -> %s", current, base)

		// Commits
		output.PrintSection("Commits to be merged")
		commits, _ := search.RunGit("log", "--oneline", fmt.Sprintf("%s..HEAD", base))
		if strings.TrimSpace(commits) == "" {
			output.Print("  (no commits)")
			return nil
		}
		output.PrintRaw(strings.TrimRight(commits, "\n") + "\n")
		commitLines := search.SplitLines(commits)
		output.Printf("\nTotal: %d commits", len(commitLines))

		// Files changed
		output.PrintSection("Files Changed")
		files, _ := search.RunGit("diff", "--name-status", fmt.Sprintf("%s...HEAD", base))
		if strings.TrimSpace(files) != "" {
			var filtered []string
			for _, l := range search.SplitLines(files) {
				if !shouldExclude(l) {
					filtered = append(filtered, l)
				}
			}
			shown, _ := output.TruncateResults(filtered, 30)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		}

		// Stats
		output.PrintSection("Change Stats")
		stats, _ := search.RunGit("diff", "--stat", fmt.Sprintf("%s...HEAD", base))
		if strings.TrimSpace(stats) != "" {
			statLines := search.SplitLines(stats)
			if len(statLines) > 0 {
				output.Print(statLines[len(statLines)-1])
			}
		}

		// Suggested description
		output.PrintSection("Suggested PR Description")
		output.Print("(Copy this as a starting point)\n")
		output.Print("## Summary")
		subjects, _ := search.RunGit("log", "--format=- %s", fmt.Sprintf("%s..HEAD", base))
		if strings.TrimSpace(subjects) != "" {
			subjectLines := search.SplitLines(subjects)
			shown, _ := output.TruncateResults(subjectLines, 10)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		}

		output.Print("\n## Files Changed")
		changed, _ := search.RunGit("diff", "--name-only", fmt.Sprintf("%s...HEAD", base))
		if strings.TrimSpace(changed) != "" {
			for _, f := range search.SplitLines(changed) {
				if !shouldExclude(f) {
					output.Printf("- %s", f)
				}
			}
		}

		output.Print("\n## Test Plan")
		output.Print("- [ ] Tested locally")
		output.Print("- [ ] No console errors")

		return nil
	},
}

func prJSON(base, current string) error {
	commits, _ := search.RunGit("log", "--oneline", fmt.Sprintf("%s..HEAD", base))
	commitLines := search.SplitLines(commits)

	files, _ := search.RunGit("diff", "--name-status", fmt.Sprintf("%s...HEAD", base))
	var filteredFiles []string
	for _, l := range search.SplitLines(files) {
		if !shouldExclude(l) {
			filteredFiles = append(filteredFiles, l)
		}
	}

	stats, _ := search.RunGit("diff", "--stat", fmt.Sprintf("%s...HEAD", base))
	statLines := search.SplitLines(stats)
	statSummary := ""
	if len(statLines) > 0 {
		statSummary = statLines[len(statLines)-1]
	}

	subjects, _ := search.RunGit("log", "--format=%s", fmt.Sprintf("%s..HEAD", base))
	subjectLines := search.SplitLines(subjects)

	output.PrintJSON(map[string]any{
		"command":        "pr",
		"branch":         current,
		"base":           base,
		"commits":        commitLines,
		"commit_count":   len(commitLines),
		"files_changed":  filteredFiles,
		"stat_summary":   statSummary,
		"commit_subjects": subjectLines,
	})
	return nil
}

// ---------------------------------------------------------------------------
// git wip
// ---------------------------------------------------------------------------

var wipSubCmd = &cobra.Command{
	Use:   "wip",
	Short: "Work in progress status",
	Long:  "Show staged, unstaged, and untracked files for the current branch.",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if cfg.JSONMode {
			return wipJSON()
		}

		output.PrintSection("Work in Progress")

		branch, _ := search.RunGit("branch", "--show-current")
		branch = strings.TrimSpace(branch)
		output.Printf("Branch: %s", branch)

		// Staged
		output.PrintSection("Staged Changes")
		staged, _ := search.RunGit("diff", "--cached", "--name-status")
		if strings.TrimSpace(staged) != "" {
			lines := search.SplitLines(staged)
			shown, _ := output.TruncateResults(lines, 30)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		} else {
			output.Print("  (nothing staged)")
		}

		// Unstaged
		output.PrintSection("Unstaged Changes")
		unstaged, _ := search.RunGit("diff", "--name-status")
		if strings.TrimSpace(unstaged) != "" {
			lines := search.SplitLines(unstaged)
			shown, _ := output.TruncateResults(lines, 30)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		} else {
			output.Print("  (no unstaged changes)")
		}

		// Untracked
		output.PrintSection("Untracked Files")
		untracked, _ := search.RunGit("ls-files", "--others", "--exclude-standard")
		var untrackedFiles []string
		if strings.TrimSpace(untracked) != "" {
			for _, f := range search.SplitLines(untracked) {
				if !shouldExclude(f) {
					untrackedFiles = append(untrackedFiles, f)
				}
			}
		}
		if len(untrackedFiles) > 0 {
			shown, _ := output.TruncateResults(untrackedFiles, 15)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		} else {
			output.Print("  (no untracked files)")
		}

		// Summary
		output.PrintSection("Summary")
		stagedCount := 0
		if strings.TrimSpace(staged) != "" {
			stagedCount = len(search.SplitLines(staged))
		}
		unstagedCount := 0
		if strings.TrimSpace(unstaged) != "" {
			unstagedCount = len(search.SplitLines(unstaged))
		}
		output.Printf("  Staged:    %d", stagedCount)
		output.Printf("  Unstaged:  %d", unstagedCount)
		output.Printf("  Untracked: %d", len(untrackedFiles))

		if stagedCount > 0 {
			output.Print("\nReady to commit!")
		}

		return nil
	},
}

func wipJSON() error {
	branch, _ := search.RunGit("branch", "--show-current")
	branch = strings.TrimSpace(branch)

	staged, _ := search.RunGit("diff", "--cached", "--name-status")
	stagedLines := search.SplitLines(staged)

	unstaged, _ := search.RunGit("diff", "--name-status")
	unstagedLines := search.SplitLines(unstaged)

	untracked, _ := search.RunGit("ls-files", "--others", "--exclude-standard")
	var untrackedFiles []string
	for _, f := range search.SplitLines(untracked) {
		if !shouldExclude(f) {
			untrackedFiles = append(untrackedFiles, f)
		}
	}

	output.PrintJSON(map[string]any{
		"command":         "wip",
		"branch":          branch,
		"staged":          stagedLines,
		"staged_count":    len(stagedLines),
		"unstaged":        unstagedLines,
		"unstaged_count":  len(unstagedLines),
		"untracked":       untrackedFiles,
		"untracked_count": len(untrackedFiles),
	})
	return nil
}

// ---------------------------------------------------------------------------
// git stash
// ---------------------------------------------------------------------------

var stashSubCmd = &cobra.Command{
	Use:   "stash [index]",
	Short: "List stashes or show specific stash diff",
	Long:  "Without arguments, list all stashes with a content preview. With an index, show the full diff for that stash.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if cfg.JSONMode {
			if len(args) > 0 {
				idx, err := strconv.Atoi(args[0])
				if err != nil {
					return fmt.Errorf("invalid stash index: %s", args[0])
				}
				return stashJSON(&idx)
			}
			return stashJSON(nil)
		}

		output.PrintSection("Git Stashes")

		stashList, _ := search.RunGit("stash", "list")
		if strings.TrimSpace(stashList) == "" {
			output.Print("No stashes found")
			return nil
		}

		if len(args) > 0 {
			idx, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid stash index: %s", args[0])
			}

			// Show specific stash
			output.PrintSection(fmt.Sprintf("Stash %d details", idx))
			diff, _ := search.RunGit("stash", "show", "-p", fmt.Sprintf("stash@{%d}", idx))
			if strings.TrimSpace(diff) != "" {
				lines := search.SplitLines(diff)
				shown, _ := output.TruncateResults(lines, 50)
				output.PrintRaw(strings.Join(shown, "\n") + "\n")
			}
		} else {
			// List all stashes
			output.PrintSection("Stash List")
			output.PrintRaw(strings.TrimRight(stashList, "\n") + "\n")

			// Preview contents
			output.PrintSection("Stash Contents Preview")
			stashes := search.SplitLines(stashList)
			limit := 5
			if len(stashes) < limit {
				limit = len(stashes)
			}
			for i := 0; i < limit; i++ {
				output.Printf("\nstash@{%d}:", i)
				show, _ := search.RunGit("stash", "show", fmt.Sprintf("stash@{%d}", i))
				if strings.TrimSpace(show) != "" {
					lines := search.SplitLines(show)
					shown, _ := output.TruncateResults(lines, 5)
					for _, line := range shown {
						output.Printf("  %s", line)
					}
				}
			}

			output.Print("\nUse 'gf git stash <n>' to see full diff of stash n")
			output.Print("Use 'git stash pop' to apply and remove latest stash")
		}

		return nil
	},
}

func stashJSON(index *int) error {
	stashList, _ := search.RunGit("stash", "list")
	stashes := search.SplitLines(stashList)

	if index != nil {
		diff, _ := search.RunGit("stash", "show", "-p", fmt.Sprintf("stash@{%d}", *index))
		diffLines := search.SplitLines(diff)
		output.PrintJSON(map[string]any{
			"command": "stash",
			"index":   *index,
			"diff":    diffLines,
		})
		return nil
	}

	output.PrintJSON(map[string]any{
		"command":  "stash",
		"stashes":  stashes,
		"count":    len(stashes),
	})
	return nil
}

// ---------------------------------------------------------------------------
// git reflog
// ---------------------------------------------------------------------------

var reflogSubCmd = &cobra.Command{
	Use:   "reflog [count]",
	Short: "Recent reflog entries (recovery helper)",
	Long:  "Show recent reflog entries with recovery tips. Useful for finding lost commits or undoing mistakes.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		count := 20
		if len(args) > 0 {
			n, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid count: %s", args[0])
			}
			count = n
		}

		cfg := config.Get()

		if cfg.JSONMode {
			return reflogJSON(count)
		}

		output.PrintSection(fmt.Sprintf("Git Reflog (last %d entries)", count))
		output.Print("Use this to recover lost commits or undo mistakes\n")

		raw, err := search.RunGit("reflog", "-n", strconv.Itoa(count), "--format=%h %gd %cr %gs")
		if err != nil {
			return fmt.Errorf("git reflog failed: %w", err)
		}

		if strings.TrimSpace(raw) != "" {
			output.PrintRaw(strings.TrimRight(raw, "\n") + "\n")
		}

		output.PrintSection("Recovery Tips")
		output.Print("  - git checkout <hash>        # View a past state")
		output.Print("  - git branch recover <hash>  # Create branch from past state")
		output.Print("  - git reset --hard <hash>    # Restore to past state (DESTRUCTIVE)")

		return nil
	},
}

func reflogJSON(count int) error {
	raw, _ := search.RunGit("reflog", "-n", strconv.Itoa(count), "--format=%h %gd %cr %gs")
	entries := search.SplitLines(raw)

	output.PrintJSON(map[string]any{
		"command": "reflog",
		"count":   count,
		"entries": entries,
	})
	return nil
}

// ---------------------------------------------------------------------------
// git tag
// ---------------------------------------------------------------------------

var tagSubCmd = &cobra.Command{
	Use:   "tag [from_tag] [to_tag]",
	Short: "Changes between tags or list tags",
	Long:  "Without arguments, list available tags. With one or two tag arguments, show changes between them.",
	Args:  cobra.MaximumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) == 0 {
			// List tags
			if cfg.JSONMode {
				return tagListJSON()
			}

			output.PrintSection("Available tags")
			raw, _ := search.RunGit("tag", "--sort=-version:refname")
			if strings.TrimSpace(raw) != "" {
				lines := search.SplitLines(raw)
				shown, _ := output.TruncateResults(lines, 20)
				output.PrintRaw(strings.Join(shown, "\n") + "\n")
			}
			output.Print("\nUsage: gf git tag <from-tag> [to-tag]")
			output.Print("Example: gf git tag v1.0.0 v1.1.0")
			return nil
		}

		fromTag := args[0]
		toTag := "HEAD"
		if len(args) > 1 {
			toTag = args[1]
		}

		if cfg.JSONMode {
			return tagDiffJSON(fromTag, toTag)
		}

		output.PrintSection(fmt.Sprintf("Changes from %s to %s", fromTag, toTag))

		// Changed files
		output.PrintSection("Changed Files")
		files, _ := search.RunGit("diff", "--name-only", fmt.Sprintf("%s..%s", fromTag, toTag))
		if strings.TrimSpace(files) != "" {
			var filtered []string
			for _, f := range search.SplitLines(files) {
				if !shouldExclude(f) {
					filtered = append(filtered, f)
				}
			}
			shown, _ := output.TruncateResults(filtered, 50)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		}

		// Stats
		output.PrintSection("Change Summary")
		stats, _ := search.RunGit("diff", "--stat", fmt.Sprintf("%s..%s", fromTag, toTag))
		if strings.TrimSpace(stats) != "" {
			lines := search.SplitLines(stats)
			// Show last 3 lines (summary)
			start := 0
			if len(lines) > 3 {
				start = len(lines) - 3
			}
			output.PrintRaw(strings.Join(lines[start:], "\n") + "\n")
		}

		// Commits
		output.PrintSection("Commits between tags")
		commits, _ := search.RunGit("log", "--oneline", fmt.Sprintf("%s..%s", fromTag, toTag))
		if strings.TrimSpace(commits) != "" {
			lines := search.SplitLines(commits)
			shown, _ := output.TruncateResults(lines, 20)
			output.PrintRaw(strings.Join(shown, "\n") + "\n")
		}

		return nil
	},
}

func tagListJSON() error {
	raw, _ := search.RunGit("tag", "--sort=-version:refname")
	tags := search.SplitLines(raw)

	output.PrintJSON(map[string]any{
		"command": "tag",
		"tags":    tags,
		"count":   len(tags),
	})
	return nil
}

func tagDiffJSON(fromTag, toTag string) error {
	files, _ := search.RunGit("diff", "--name-only", fmt.Sprintf("%s..%s", fromTag, toTag))
	var filtered []string
	for _, f := range search.SplitLines(files) {
		if !shouldExclude(f) {
			filtered = append(filtered, f)
		}
	}

	stats, _ := search.RunGit("diff", "--stat", fmt.Sprintf("%s..%s", fromTag, toTag))
	statLines := search.SplitLines(stats)
	statSummary := ""
	if len(statLines) > 0 {
		statSummary = statLines[len(statLines)-1]
	}

	commits, _ := search.RunGit("log", "--oneline", fmt.Sprintf("%s..%s", fromTag, toTag))
	commitLines := search.SplitLines(commits)

	output.PrintJSON(map[string]any{
		"command":       "tag",
		"from":          fromTag,
		"to":            toTag,
		"files_changed": filtered,
		"stat_summary":  statSummary,
		"commits":       commitLines,
		"commit_count":  len(commitLines),
	})
	return nil
}
