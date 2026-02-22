package cmd

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// maxLimit is the upper bound for any --limit/-n flag to prevent excessive output.
const maxLimit = 10000

// blameLineRe validates the -L flag format for git blame (e.g. "10,20" or "10-20" or "/regex/").
var blameLineRe = regexp.MustCompile(`^(\d+[,-]\d+|\d+|/[^/]+/)$`)

// ── git status ──────────────────────────────────────────────────────

var gitStatusShort bool
var gitStatusPorcelain bool

var gitStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show working tree status",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		gitArgs := []string{"status"}
		if gitStatusPorcelain {
			gitArgs = append(gitArgs, "--porcelain=v1", "-b")
		} else if gitStatusShort {
			gitArgs = append(gitArgs, "--short", "-b")
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"output": strings.TrimSpace(result.Stdout),
			})
		}

		if gitStatusShort || gitStatusPorcelain {
			fmt.Print(result.Stdout)
			return nil
		}

		// Rich formatted output
		branch, _ := gwexec.CurrentBranch()
		fmt.Println(ui.TitleStyle.Render("gw git status"))
		if branch != "" {
			fmt.Printf("  Branch: %s\n", ui.CommandStyle.Render(branch))
		}
		fmt.Println()
		fmt.Print(result.Stdout)
		return nil
	},
}

// ── git log ─────────────────────────────────────────────────────────

var gitLogLimit int
var gitLogOneline bool
var gitLogAuthor string
var gitLogSince string
var gitLogFile string
var gitLogGraph bool

var gitLogCmd = &cobra.Command{
	Use:   "log [ref]",
	Short: "Show commit history",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		gitArgs := []string{"log"}

		if gitLogGraph {
			gitArgs = append(gitArgs, "--graph", "--oneline", "--decorate", "--all")
		} else if gitLogOneline {
			gitArgs = append(gitArgs, "--oneline")
		} else {
			gitArgs = append(gitArgs, "--format=%H|%h|%an|%ae|%ai|%s")
		}

		limit := clampLimit(gitLogLimit, 1, maxLimit)
		gitArgs = append(gitArgs, fmt.Sprintf("-n%d", limit))

		if gitLogAuthor != "" {
			gitArgs = append(gitArgs, "--author="+gitLogAuthor)
		}
		if gitLogSince != "" {
			gitArgs = append(gitArgs, "--since="+gitLogSince)
		}

		if len(args) > 0 {
			if err := sanitizeRef(args[0]); err != nil {
				return err
			}
			gitArgs = append(gitArgs, args[0])
		}

		if gitLogFile != "" {
			gitArgs = append(gitArgs, "--", gitLogFile)
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git log: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode && !gitLogGraph {
			return printLogJSON(result.Stdout)
		}

		if gitLogOneline || gitLogGraph {
			fmt.Print(result.Stdout)
			return nil
		}

		// Table output
		fmt.Println(ui.TitleStyle.Render("gw git log"))
		fmt.Println()
		lines := strings.Split(strings.TrimSpace(result.Stdout), "\n")
		for _, line := range lines {
			if line == "" {
				continue
			}
			parts := strings.SplitN(line, "|", 6)
			if len(parts) < 6 {
				fmt.Println(line)
				continue
			}
			hash := ui.HintStyle.Render(parts[1])
			msg := parts[5]
			author := ui.DescStyle.Render(parts[2])
			date := ui.HintStyle.Render(formatDateShort(parts[4]))
			fmt.Printf("  %s  %-50s  %s  %s\n", hash, msg, author, date)
		}
		return nil
	},
}

// ── git diff ────────────────────────────────────────────────────────

var gitDiffStaged bool
var gitDiffStat bool
var gitDiffPath string

var gitDiffCmd = &cobra.Command{
	Use:   "diff [ref] [-- path]",
	Short: "Show changes between commits or working tree",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		gitArgs := []string{"diff"}
		if gitDiffStaged {
			gitArgs = append(gitArgs, "--staged")
		}
		if gitDiffStat {
			gitArgs = append(gitArgs, "--stat")
		}

		// Parse positional args: [ref] and [-- path]
		dashDash := false
		for _, a := range args {
			if a == "--" {
				dashDash = true
				gitArgs = append(gitArgs, a)
				continue
			}
			// Before --, validate refs don't look like flags
			if !dashDash {
				if err := sanitizeRef(a); err != nil {
					return err
				}
			}
			gitArgs = append(gitArgs, a)
		}

		if gitDiffPath != "" && !dashDash {
			gitArgs = append(gitArgs, "--", gitDiffPath)
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}

		if cfg.JSONMode && gitDiffStat {
			return printJSON(map[string]any{
				"output": strings.TrimSpace(result.Stdout),
			})
		}

		fmt.Print(result.Stdout)
		return nil
	},
}

// ── git show ────────────────────────────────────────────────────────

var gitShowStat bool

var gitShowCmd = &cobra.Command{
	Use:   "show [ref]",
	Short: "Show commit details and diff",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}

		gitArgs := []string{"show"}
		if gitShowStat {
			gitArgs = append(gitArgs, "--stat")
		}
		if len(args) > 0 {
			if err := sanitizeRef(args[0]); err != nil {
				return err
			}
			gitArgs = append(gitArgs, args[0])
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git show: %s", strings.TrimSpace(result.Stderr))
		}

		fmt.Print(result.Stdout)
		return nil
	},
}

// ── git blame ───────────────────────────────────────────────────────

var gitBlameLines string
var gitBlameRef string

var gitBlameCmd = &cobra.Command{
	Use:   "blame <file>",
	Short: "Show who changed each line of a file",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}

		gitArgs := []string{"blame"}
		if gitBlameLines != "" {
			if !blameLineRe.MatchString(gitBlameLines) {
				return fmt.Errorf("invalid line range %q: expected format like 10,20 or 10-20", gitBlameLines)
			}
			gitArgs = append(gitArgs, "-L", gitBlameLines)
		}
		if gitBlameRef != "" {
			if err := sanitizeRef(gitBlameRef); err != nil {
				return err
			}
			gitArgs = append(gitArgs, gitBlameRef)
		}
		gitArgs = append(gitArgs, "--", args[0])

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git blame: %s", strings.TrimSpace(result.Stderr))
		}

		fmt.Print(result.Stdout)
		return nil
	},
}

// ── git fetch ───────────────────────────────────────────────────────

var gitFetchPrune bool
var gitFetchAll bool
var gitFetchTags bool

var gitFetchCmd = &cobra.Command{
	Use:   "fetch [remote] [branch]",
	Short: "Download objects and refs from remote",
	Args:  cobra.MaximumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		gitArgs := []string{"fetch"}
		if gitFetchPrune {
			gitArgs = append(gitArgs, "--prune")
		}
		if gitFetchTags {
			gitArgs = append(gitArgs, "--tags")
		}
		if gitFetchAll {
			gitArgs = append(gitArgs, "--all")
		} else {
			// Default: fetch from origin (or specified remote)
			remote := "origin"
			if len(args) > 0 {
				if err := sanitizeRef(args[0]); err != nil {
					return err
				}
				remote = args[0]
			}
			gitArgs = append(gitArgs, remote)
			if len(args) > 1 {
				if err := sanitizeRef(args[1]); err != nil {
					return err
				}
				gitArgs = append(gitArgs, args[1])
			}
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git fetch: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			remote := "all"
			if !gitFetchAll && len(args) > 0 {
				remote = args[0]
			} else if !gitFetchAll {
				remote = "origin"
			}
			return printJSON(map[string]any{
				"remote": remote,
				"pruned": gitFetchPrune,
			})
		}

		if gitFetchAll {
			ui.Action("Fetched", "all remotes")
		} else {
			remote := "origin"
			if len(args) > 0 {
				remote = args[0]
			}
			ui.Action("Fetched", remote)
		}
		return nil
	},
}

// ── git reflog ──────────────────────────────────────────────────────

var gitReflogLimit int

var gitReflogCmd = &cobra.Command{
	Use:   "reflog",
	Short: "Show history of HEAD changes",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		limit := clampLimit(gitReflogLimit, 1, maxLimit)
		gitArgs := []string{"reflog", "show",
			fmt.Sprintf("-n%d", limit),
			"--format=%h|%gd|%gs|%ci",
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git reflog: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printReflogJSON(result.Stdout)
		}

		// Table output
		fmt.Println(ui.TitleStyle.Render("gw git reflog"))
		fmt.Println()
		lines := strings.Split(strings.TrimSpace(result.Stdout), "\n")
		for _, line := range lines {
			if line == "" {
				continue
			}
			parts := strings.SplitN(line, "|", 4)
			if len(parts) < 4 {
				fmt.Println(line)
				continue
			}
			hash := ui.HintStyle.Render(parts[0])
			ref := ui.CommandStyle.Render(parts[1])
			action := parts[2]
			when := ui.HintStyle.Render(formatDateShort(parts[3]))
			fmt.Printf("  %s  %-18s  %-40s  %s\n", hash, ref, action, when)
		}
		return nil
	},
}

// ── git shortlog ────────────────────────────────────────────────────

var gitShortlogLimit int
var gitShortlogSince string
var gitShortlogSummary bool

var gitShortlogCmd = &cobra.Command{
	Use:   "shortlog [ref]",
	Short: "Summarize commit activity by author",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		gitArgs := []string{"shortlog", "-sne"}
		if gitShortlogSince != "" {
			gitArgs = append(gitArgs, "--since="+gitShortlogSince)
		}
		if len(args) > 0 {
			if err := sanitizeRef(args[0]); err != nil {
				return err
			}
			gitArgs = append(gitArgs, args[0])
		} else {
			gitArgs = append(gitArgs, "HEAD")
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git shortlog: %s", strings.TrimSpace(result.Stderr))
		}

		lines := result.Lines()

		// Apply limit
		if gitShortlogLimit > 0 && len(lines) > gitShortlogLimit {
			lines = lines[:gitShortlogLimit]
		}

		if cfg.JSONMode {
			return printShortlogJSON(lines)
		}

		fmt.Println(ui.TitleStyle.Render("gw git shortlog"))
		fmt.Println()
		total := 0
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			// Format: "  123\tAuthor Name <email>"
			parts := strings.SplitN(line, "\t", 2)
			if len(parts) < 2 {
				fmt.Println("  " + line)
				continue
			}
			count := strings.TrimSpace(parts[0])
			author := parts[1]
			var n int
			fmt.Sscanf(count, "%d", &n)
			total += n
			fmt.Printf("  %s  %s\n", ui.CommandStyle.Render(fmt.Sprintf("%4s", count)), author)
		}
		fmt.Printf("\n  %s\n", ui.HintStyle.Render(fmt.Sprintf("Total: %d commits from %d contributors", total, len(lines))))
		return nil
	},
}

// ── Registration ────────────────────────────────────────────────────

func init() {
	// git status
	gitStatusCmd.Flags().BoolVarP(&gitStatusShort, "short", "s", false, "Short format output")
	gitStatusCmd.Flags().BoolVar(&gitStatusPorcelain, "porcelain", false, "Machine-readable output")
	gitCmd.AddCommand(gitStatusCmd)

	// git log
	gitLogCmd.Flags().IntVarP(&gitLogLimit, "limit", "n", 10, "Number of commits to show")
	gitLogCmd.Flags().BoolVar(&gitLogOneline, "oneline", false, "One line per commit")
	gitLogCmd.Flags().StringVar(&gitLogAuthor, "author", "", "Filter by author")
	gitLogCmd.Flags().StringVar(&gitLogSince, "since", "", "Show commits since date")
	gitLogCmd.Flags().StringVar(&gitLogFile, "file", "", "Show commits affecting file")
	gitLogCmd.Flags().BoolVar(&gitLogGraph, "graph", false, "Show branch graph")
	gitCmd.AddCommand(gitLogCmd)

	// git diff
	gitDiffCmd.Flags().BoolVar(&gitDiffStaged, "staged", false, "Show staged changes")
	gitDiffCmd.Flags().BoolVar(&gitDiffStat, "stat", false, "Show statistics only")
	gitDiffCmd.Flags().StringVarP(&gitDiffPath, "path", "p", "", "Filter by file path")
	gitCmd.AddCommand(gitDiffCmd)

	// git show
	gitShowCmd.Flags().BoolVar(&gitShowStat, "stat", false, "Show file changes only")
	gitCmd.AddCommand(gitShowCmd)

	// git blame
	gitBlameCmd.Flags().StringVarP(&gitBlameLines, "line", "L", "", "Line range (e.g. 50-75)")
	gitBlameCmd.Flags().StringVarP(&gitBlameRef, "ref", "r", "", "Commit or branch to blame")
	gitCmd.AddCommand(gitBlameCmd)

	// git fetch
	gitFetchCmd.Flags().BoolVarP(&gitFetchPrune, "prune", "p", false, "Remove deleted remote branches")
	gitFetchCmd.Flags().BoolVar(&gitFetchAll, "all", false, "Fetch from all remotes")
	gitFetchCmd.Flags().BoolVar(&gitFetchTags, "tags", false, "Fetch tags")
	gitCmd.AddCommand(gitFetchCmd)

	// git reflog
	gitReflogCmd.Flags().IntVarP(&gitReflogLimit, "limit", "n", 20, "Number of entries to show")
	gitCmd.AddCommand(gitReflogCmd)

	// git shortlog
	gitShortlogCmd.Flags().IntVarP(&gitShortlogLimit, "limit", "n", 0, "Limit authors shown")
	gitShortlogCmd.Flags().StringVar(&gitShortlogSince, "since", "", "Show activity since date")
	gitShortlogCmd.Flags().BoolVarP(&gitShortlogSummary, "summary", "s", false, "Commit counts only")
	gitCmd.AddCommand(gitShortlogCmd)
}

// ── Helpers ─────────────────────────────────────────────────────────

// notARepo returns a standard "not a git repo" error.
func notARepo() error {
	return fmt.Errorf("not a git repository")
}

// printJSON marshals data as indented JSON and prints it.
func printJSON(data any) error {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(b))
	return nil
}

// printLogJSON parses formatted git log output and prints as JSON.
func printLogJSON(output string) error {
	lines := strings.Split(strings.TrimSpace(output), "\n")
	commits := make([]map[string]string, 0, len(lines))
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 6)
		if len(parts) < 6 {
			continue
		}
		commits = append(commits, map[string]string{
			"hash":       parts[0],
			"short_hash": parts[1],
			"author":     parts[2],
			"email":      parts[3],
			"date":       parts[4],
			"subject":    parts[5],
		})
	}
	return printJSON(commits)
}

// printReflogJSON parses formatted reflog output and prints as JSON.
func printReflogJSON(output string) error {
	lines := strings.Split(strings.TrimSpace(output), "\n")
	entries := make([]map[string]string, 0, len(lines))
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 4)
		if len(parts) < 4 {
			continue
		}
		entries = append(entries, map[string]string{
			"hash":   parts[0],
			"ref":    parts[1],
			"action": parts[2],
			"date":   parts[3],
		})
	}
	return printJSON(entries)
}

// printShortlogJSON parses shortlog output and prints as JSON.
func printShortlogJSON(lines []string) error {
	authors := make([]map[string]any, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\t", 2)
		if len(parts) < 2 {
			continue
		}
		var count int
		fmt.Sscanf(strings.TrimSpace(parts[0]), "%d", &count)
		authors = append(authors, map[string]any{
			"count":  count,
			"author": parts[1],
		})
	}
	return printJSON(authors)
}

// formatDateShort extracts just the date portion from a git date string.
func formatDateShort(date string) string {
	date = strings.TrimSpace(date)
	// Git date format: "2026-02-22 04:12:00 +0000" — take just the date
	if len(date) >= 10 {
		return date[:10]
	}
	return date
}

// sanitizeRef validates that a git ref argument doesn't start with a dash,
// which would be interpreted as a flag by git.
func sanitizeRef(ref string) error {
	if strings.HasPrefix(ref, "-") {
		return fmt.Errorf("invalid ref %q: must not start with '-'", ref)
	}
	return nil
}

// clampLimit ensures a limit value is within reasonable bounds.
func clampLimit(n, min, max int) int {
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}
