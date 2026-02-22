package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/commits"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// ── git ship ────────────────────────────────────────────────────────

var gitShipMessage string
var gitShipIssue int
var gitShipAll bool
var gitShipNoCheck bool
var gitShipNoFormat bool

var gitShipCmd = &cobra.Command{
	Use:   "ship",
	Short: "Format, check, commit, push — all at once",
	Long:  "The complete shipping workflow: stage, format, type-check, validate, commit, and push.",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("ship"); err != nil {
			return err
		}
		cfg := config.Get()

		if gitShipMessage == "" {
			return fmt.Errorf("message required: use -m \"message\"")
		}
		if len(gitShipMessage) > maxCommitMessageLen {
			return fmt.Errorf("commit message too long (%d chars, max %d)", len(gitShipMessage), maxCommitMessageLen)
		}

		branch, _ := gwexec.CurrentBranch()
		var steps []shipStep

		// Step 1: Stage (optional)
		if gitShipAll {
			result, err := gwexec.Git("add", "-A")
			if err != nil {
				return err
			}
			steps = append(steps, shipStep{"stage", result.OK(), ""})
		}

		// Step 2: Format staged files (optional)
		formatOK := true
		if !gitShipNoFormat {
			formatOK = formatStagedFiles()
			steps = append(steps, shipStep{"format", formatOK, ""})
		}

		// Step 3: Type-check affected packages (optional)
		checkOK := true
		if !gitShipNoCheck {
			checkOK = typeCheckAffected(cfg)
			steps = append(steps, shipStep{"check", checkOK, ""})
		}

		// Step 4: Auto-detect issue
		issue := gitShipIssue
		if issue == 0 && cfg.Git.AutoLinkIssues {
			issue = commits.ExtractIssueNumber(branch, cfg.Git.IssuePattern)
		}
		msg := gitShipMessage
		if issue > 0 && !strings.Contains(msg, fmt.Sprintf("#%d", issue)) {
			msg += fmt.Sprintf(" (#%d)", issue)
		}

		// Step 5: Validate commit message
		if cfg.Git.CommitFormat != "none" {
			ok, errMsg := commits.Validate(msg, cfg.Git.ConventionalTypes, cfg.Git.CommitFormat)
			if !ok {
				return fmt.Errorf("invalid commit message: %s", errMsg)
			}
		}
		steps = append(steps, shipStep{"validate", true, ""})

		// Step 6: Commit
		result, err := gwexec.Git("commit", "-m", msg)
		if err != nil {
			return err
		}
		commitOK := result.OK()
		commitErr := ""
		if !commitOK {
			commitErr = strings.TrimSpace(result.Stderr)
			if strings.Contains(commitErr, "nothing to commit") {
				return fmt.Errorf("nothing to commit — stage files first")
			}
		}
		hash := extractCommitHash(result.Stdout)
		steps = append(steps, shipStep{"commit", commitOK, commitErr})

		if !commitOK {
			return fmt.Errorf("commit failed: %s", commitErr)
		}

		// Step 7: Push
		result, err = gwexec.Git("push", "-u", "origin", branch)
		pushOK := err == nil && result.OK()
		pushErr := ""
		if !pushOK && result != nil {
			pushErr = strings.TrimSpace(result.Stderr)
		}
		steps = append(steps, shipStep{"push", pushOK, pushErr})

		if cfg.JSONMode {
			stepMaps := make([]map[string]any, len(steps))
			for i, s := range steps {
				stepMaps[i] = map[string]any{"step": s.name, "ok": s.ok, "error": s.err}
			}
			return printJSON(map[string]any{
				"shipped": commitOK && pushOK,
				"hash":    hash,
				"message": msg,
				"branch":  branch,
				"issue":   issue,
				"steps":   stepMaps,
			})
		}

		// Rich output
		var uiSteps []ui.StepItem
		for _, s := range steps {
			uiSteps = append(uiSteps, ui.StepItem{OK: s.ok, Label: s.name})
		}
		fmt.Print(ui.RenderStepList("gw git ship", uiSteps))

		if commitOK && pushOK {
			fmt.Print(ui.RenderSuccessPanel("Shipped", hash+" "+msg+"\n"+branch+" → origin/"+branch))
		} else if commitOK {
			ui.Action("Committed", hash+" "+msg)
			fmt.Print(ui.RenderWarningPanel("Push Failed", pushErr+"\nTry: gw git push --write"))
		}
		return nil
	},
}

// ── git prep ────────────────────────────────────────────────────────

var gitPrepCmd = &cobra.Command{
	Use:   "prep",
	Short: "Pre-commit checks (lint, format, test)",
	Long:  "Dry-run of what ship would do — checks formatting and type checking without making changes.",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		// prep is READ tier — no --write needed
		cfg := config.Get()

		branch, _ := gwexec.CurrentBranch()

		// Check staging status
		statusOut, _ := gwexec.GitOutput("status", "--porcelain=v1")
		staged, unstaged, untracked := 0, 0, 0
		for _, line := range strings.Split(statusOut, "\n") {
			if len(line) < 3 {
				continue
			}
			x, y := line[0], line[1]
			if x == '?' {
				untracked++
			} else {
				if x != ' ' {
					staged++
				}
				if y != ' ' {
					unstaged++
				}
			}
		}

		// Check formatting (dry run)
		formatOK := checkFormattingDryRun()

		// Type check
		checkOK := typeCheckAffected(cfg)

		ready := staged > 0 && formatOK && checkOK
		var issues []string
		if staged == 0 {
			issues = append(issues, "no files staged for commit")
		}
		if !formatOK {
			issues = append(issues, "formatting issues detected")
		}
		if !checkOK {
			issues = append(issues, "type check failures")
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"ready":     ready,
				"branch":    branch,
				"staged":    staged,
				"unstaged":  unstaged,
				"untracked": untracked,
				"format_ok": formatOK,
				"check_ok":  checkOK,
				"issues":    issues,
			})
		}

		fmt.Print(ui.RenderInfoPanel("gw git prep", [][2]string{
			{"branch", branch},
			{"staged", fmt.Sprintf("%d", staged)},
			{"unstaged", fmt.Sprintf("%d", unstaged)},
			{"untracked", fmt.Sprintf("%d", untracked)},
		}))
		fmt.Println()

		prepSteps := []ui.StepItem{
			{OK: staged > 0, Label: "Files staged"},
			{OK: formatOK, Label: "Formatting"},
			{OK: checkOK, Label: "Type checking"},
		}
		fmt.Print(ui.RenderStepList("Checks", prepSteps))
		fmt.Println()

		if ready {
			fmt.Print(ui.RenderSuccessPanel("Ready", "Ready to ship!\nRun: gw git ship --write -m \"type: message\""))
		} else {
			issueText := ""
			for _, issue := range issues {
				issueText += "• " + issue + "\n"
			}
			fmt.Print(ui.RenderErrorPanel("Not Ready", "Checks failed", issueText))
		}
		return nil
	},
}

// ── git pr-prep ─────────────────────────────────────────────────────

var gitPRPrepBase string

var gitPRPrepCmd = &cobra.Command{
	Use:   "pr-prep",
	Short: "PR readiness report",
	Long:  "Analyze changes since branching and generate a PR readiness report.",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		// pr-prep is READ tier — no --write needed
		cfg := config.Get()

		branch, _ := gwexec.CurrentBranch()

		// Get merge base
		mergeBase, _ := gwexec.GitOutput("merge-base", branch, gitPRPrepBase)
		mergeBase = strings.TrimSpace(mergeBase)

		// Commit count since merge base
		commitCountOut, _ := gwexec.GitOutput("rev-list", "--count", mergeBase+"..HEAD")
		commitCount := strings.TrimSpace(commitCountOut)

		// Changed files since merge base
		diffStatOut, _ := gwexec.GitOutput("diff", "--stat", mergeBase+"..HEAD")
		diffNameOut, _ := gwexec.GitOutput("diff", "--name-only", mergeBase+"..HEAD")

		// Affected packages
		var changedFiles []string
		for _, f := range strings.Split(strings.TrimSpace(diffNameOut), "\n") {
			if f != "" {
				changedFiles = append(changedFiles, f)
			}
		}
		packages := detectAffectedPackages(changedFiles)

		// Extract referenced issues from branch name + commit messages
		issues := extractReferencedIssues(branch, mergeBase)

		// Check push status
		statusOut, _ := gwexec.GitOutput("status", "--porcelain=v1")
		uncommitted := strings.TrimSpace(statusOut) != ""

		// Check if all commits are pushed
		unpushedOut, _ := gwexec.GitOutput("log", "--oneline", "origin/"+branch+"..HEAD")
		unpushed := strings.TrimSpace(unpushedOut) != ""

		// Suggest PR title
		suggestedTitle := suggestPRTitle(branch, mergeBase)

		ready := !uncommitted && !unpushed

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"ready":           ready,
				"branch":          branch,
				"base":            gitPRPrepBase,
				"commit_count":    commitCount,
				"changed_files":   len(changedFiles),
				"packages":        packages,
				"issues":          issues,
				"uncommitted":     uncommitted,
				"unpushed":        unpushed,
				"suggested_title": suggestedTitle,
			})
		}

		pairs := [][2]string{
			{"branch", branch + " → " + gitPRPrepBase},
			{"commits", commitCount},
			{"files", fmt.Sprintf("%d changed", len(changedFiles))},
		}
		if len(packages) > 0 {
			pairs = append(pairs, [2]string{"packages", strings.Join(packages, ", ")})
		}
		if len(issues) > 0 {
			pairs = append(pairs, [2]string{"issues", strings.Join(issues, ", ")})
		}
		if diffStatOut != "" {
			statLines := strings.Split(strings.TrimSpace(diffStatOut), "\n")
			if len(statLines) > 0 {
				pairs = append(pairs, [2]string{"diff", strings.TrimSpace(statLines[len(statLines)-1])})
			}
		}
		fmt.Print(ui.RenderInfoPanel("gw git pr-prep", pairs))
		fmt.Println()

		readinessSteps := []ui.StepItem{
			{OK: !uncommitted, Label: "All changes committed"},
			{OK: !unpushed, Label: "All commits pushed"},
		}
		fmt.Print(ui.RenderStepList("Readiness", readinessSteps))
		fmt.Println()

		if ready {
			fmt.Print(ui.RenderSuccessPanel("Ready", "Ready for PR!"))
		} else {
			suggestion := ""
			if uncommitted {
				suggestion += "Commit changes: gw git ship --write -m \"type: message\"\n"
			}
			if unpushed {
				suggestion += "Push commits: gw git push --write"
			}
			fmt.Print(ui.RenderWarningPanel("Not Ready", suggestion))
		}

		if suggestedTitle != "" {
			fmt.Printf("\n  Suggested title: %s\n", ui.CommandStyle.Render(suggestedTitle))
		}

		fmt.Println()
		return nil
	},
}

// ── Helpers ─────────────────────────────────────────────────────────

type shipStep struct {
	name string
	ok   bool
	err  string
}

// formatStagedFiles runs prettier on staged files.
// Returns true if formatting succeeded or no formattable files found.
func formatStagedFiles() bool {
	// Get staged files
	out, err := gwexec.GitOutput("diff", "--cached", "--name-only", "--diff-filter=ACMR")
	if err != nil || strings.TrimSpace(out) == "" {
		return true // No staged files
	}

	// Filter to formattable extensions
	var formattable []string
	formatExts := map[string]bool{
		".ts": true, ".tsx": true, ".js": true, ".jsx": true,
		".mjs": true, ".cjs": true, ".svelte": true,
		".css": true, ".scss": true, ".postcss": true,
		".json": true, ".html": true, ".md": true, ".mdx": true,
		".yaml": true, ".yml": true,
	}

	for _, f := range strings.Split(strings.TrimSpace(out), "\n") {
		for ext := range formatExts {
			if strings.HasSuffix(f, ext) {
				formattable = append(formattable, f)
				break
			}
		}
	}

	if len(formattable) == 0 {
		return true
	}

	// Run prettier
	args := []string{"x", "prettier", "--write"}
	args = append(args, formattable...)
	result, err := gwexec.Run("bun", args...)
	if err != nil {
		// bun not available — try npx
		npxArgs := []string{"prettier", "--write"}
		npxArgs = append(npxArgs, formattable...)
		result, err = gwexec.Run("npx", npxArgs...)
		if err != nil {
			return true // Prettier not available — skip
		}
	}

	if result.OK() {
		// Re-stage formatted files
		addArgs := []string{"add"}
		addArgs = append(addArgs, formattable...)
		gwexec.Git(addArgs...)
	}

	return result.OK()
}

// checkFormattingDryRun checks formatting without modifying files.
func checkFormattingDryRun() bool {
	out, err := gwexec.GitOutput("diff", "--cached", "--name-only", "--diff-filter=ACMR")
	if err != nil || strings.TrimSpace(out) == "" {
		return true
	}

	var formattable []string
	formatExts := map[string]bool{
		".ts": true, ".tsx": true, ".js": true, ".jsx": true,
		".svelte": true, ".css": true, ".json": true, ".md": true,
	}
	for _, f := range strings.Split(strings.TrimSpace(out), "\n") {
		for ext := range formatExts {
			if strings.HasSuffix(f, ext) {
				formattable = append(formattable, f)
				break
			}
		}
	}

	if len(formattable) == 0 {
		return true
	}

	// Dry-run check
	args := []string{"x", "prettier", "--check"}
	args = append(args, formattable...)
	result, _ := gwexec.Run("bun", args...)
	if result == nil {
		return true // Prettier not available — skip
	}
	return result.OK()
}

// typeCheckAffected runs type checking on affected packages.
func typeCheckAffected(cfg *config.Config) bool {
	// Get changed files
	out, _ := gwexec.GitOutput("diff", "--cached", "--name-only")
	if strings.TrimSpace(out) == "" {
		// Also check unstaged
		out, _ = gwexec.GitOutput("diff", "--name-only")
	}
	if strings.TrimSpace(out) == "" {
		return true
	}

	packages := detectAffectedPackages(strings.Split(strings.TrimSpace(out), "\n"))
	if len(packages) == 0 {
		return true
	}

	allOK := true
	for _, pkg := range packages {
		pkgDir := cfg.GroveRoot + "/" + pkg
		// Skip non-JS packages
		if !fileExists(pkgDir + "/package.json") {
			continue
		}
		// Check if "check" script exists
		scripts := readPackageScripts(pkgDir)
		if scripts == nil || scripts["check"] == "" {
			continue
		}
		result, err := gwexec.Run("pnpm", "run", "check", "--filter", pkg)
		if err != nil || (result != nil && !result.OK()) {
			allOK = false
		}
	}
	return allOK
}

// extractReferencedIssues finds issue references from branch name and commits.
func extractReferencedIssues(branch, mergeBase string) []string {
	seen := map[string]bool{}

	// From branch name
	issue := commits.ExtractIssueNumber(branch, "")
	if issue > 0 {
		ref := fmt.Sprintf("#%d", issue)
		seen[ref] = true
	}

	// From commit messages
	logOut, _ := gwexec.GitOutput("log", "--format=%s", mergeBase+"..HEAD")
	for _, line := range strings.Split(logOut, "\n") {
		// Find #NNN patterns
		for i := 0; i < len(line); i++ {
			if line[i] == '#' && i+1 < len(line) && line[i+1] >= '0' && line[i+1] <= '9' {
				j := i + 1
				for j < len(line) && line[j] >= '0' && line[j] <= '9' {
					j++
				}
				ref := line[i:j]
				seen[ref] = true
			}
		}
	}

	result := make([]string, 0, len(seen))
	for ref := range seen {
		result = append(result, ref)
	}
	return result
}

// suggestPRTitle generates a suggested PR title from branch name or first commit.
func suggestPRTitle(branch, mergeBase string) string {
	// Try first commit message
	logOut, _ := gwexec.GitOutput("log", "--format=%s", "--reverse", mergeBase+"..HEAD")
	lines := strings.Split(strings.TrimSpace(logOut), "\n")
	if len(lines) > 0 && lines[0] != "" {
		return lines[0]
	}

	// Fall back to branch name
	// Strip prefix like feat/, fix/, etc.
	parts := strings.SplitN(branch, "/", 2)
	if len(parts) == 2 {
		return parts[1]
	}
	return branch
}

// ── Registration ────────────────────────────────────────────────────

func init() {
	// git ship
	gitShipCmd.Flags().StringVarP(&gitShipMessage, "message", "m", "", "Commit message (required)")
	gitShipCmd.Flags().IntVar(&gitShipIssue, "issue", 0, "Link to GitHub issue number")
	gitShipCmd.Flags().BoolVarP(&gitShipAll, "all", "a", false, "Stage all changes before commit")
	gitShipCmd.Flags().BoolVar(&gitShipNoCheck, "no-check", false, "Skip type checking")
	gitShipCmd.Flags().BoolVar(&gitShipNoFormat, "no-format", false, "Skip prettier formatting")
	gitCmd.AddCommand(gitShipCmd)

	// git prep
	gitCmd.AddCommand(gitPrepCmd)

	// git pr-prep
	gitPRPrepCmd.Flags().StringVar(&gitPRPrepBase, "base", "main", "Base branch to compare against")
	gitCmd.AddCommand(gitPRPrepCmd)
}
