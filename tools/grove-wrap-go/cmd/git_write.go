package cmd

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/commits"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// requireSafety checks a git operation against the safety tier system.
// Returns a user-friendly error if the operation is blocked.
func requireSafety(operation string) error {
	cfg := config.Get()
	return safety.CheckGitSafety(
		operation,
		cfg.WriteFlag,
		cfg.ForceFlag,
		cfg.AgentMode,
		cfg.IsInteractive(),
		"", // target branch (set per-operation when relevant)
		cfg.Git.ProtectedBranches,
	)
}

// requireSafetyBranch checks a git operation with a target branch.
func requireSafetyBranch(operation, branch string) error {
	cfg := config.Get()
	return safety.CheckGitSafety(
		operation,
		cfg.WriteFlag,
		cfg.ForceFlag,
		cfg.AgentMode,
		cfg.IsInteractive(),
		branch,
		cfg.Git.ProtectedBranches,
	)
}

// ── git add ─────────────────────────────────────────────────────────

var gitAddAll bool

var gitAddCmd = &cobra.Command{
	Use:   "add [files...]",
	Short: "Stage files for commit",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("add"); err != nil {
			return err
		}
		cfg := config.Get()

		gitArgs := []string{"add"}
		if gitAddAll || len(args) == 0 {
			gitArgs = append(gitArgs, "-A")
		} else {
			gitArgs = append(gitArgs, "--")
			gitArgs = append(gitArgs, args...)
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git add: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"staged": true,
				"all":    gitAddAll || len(args) == 0,
			})
		}

		if gitAddAll || len(args) == 0 {
			ui.Action("Staged", "all changes")
		} else {
			ui.Action("Staged", strings.Join(args, ", "))
		}
		return nil
	},
}

// ── git commit ──────────────────────────────────────────────────────

var gitCommitMessage string
var gitCommitIssue int
var gitCommitNoVerify bool
var gitCommitNoFormat bool

var gitCommitCmd = &cobra.Command{
	Use:   "commit",
	Short: "Record changes to the repository",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("commit"); err != nil {
			return err
		}
		cfg := config.Get()

		if gitCommitMessage == "" {
			return fmt.Errorf("commit message required: use -m \"message\"")
		}
		if len(gitCommitMessage) > maxCommitMessageLen {
			return fmt.Errorf("commit message too long (%d chars, max %d)", len(gitCommitMessage), maxCommitMessageLen)
		}

		// Auto-detect issue from branch name
		issue := gitCommitIssue
		if issue == 0 && cfg.Git.AutoLinkIssues {
			branch, _ := gwexec.CurrentBranch()
			issue = commits.ExtractIssueNumber(branch, cfg.Git.IssuePattern)
		}

		// Append issue reference if not already present
		if issue > 0 && !strings.Contains(gitCommitMessage, fmt.Sprintf("#%d", issue)) {
			gitCommitMessage += fmt.Sprintf(" (#%d)", issue)
		}

		// Validate commit message format
		if cfg.Git.CommitFormat != "none" {
			ok, errMsg := commits.Validate(gitCommitMessage, cfg.Git.ConventionalTypes, cfg.Git.CommitFormat)
			if !ok {
				return fmt.Errorf("invalid commit message: %s", errMsg)
			}
		}

		// Format staged files before committing
		if !gitCommitNoFormat {
			formatStagedFiles()
		}

		gitArgs := []string{"commit", "-m", gitCommitMessage}
		if gitCommitNoVerify {
			gitArgs = append(gitArgs, "--no-verify")
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "nothing to commit") {
				return fmt.Errorf("nothing to commit (use gw git add first)")
			}
			return fmt.Errorf("git commit: %s", stderr)
		}

		// Extract commit hash from output
		hash := extractCommitHash(result.Stdout)

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"committed": true,
				"hash":      hash,
				"message":   gitCommitMessage,
				"issue":     issue,
			})
		}

		ui.Action("Committed", hash+" "+gitCommitMessage)
		return nil
	},
}

// ── git push ────────────────────────────────────────────────────────

var gitPushSetUpstream bool
var gitPushForce bool

var gitPushCmd = &cobra.Command{
	Use:   "push [remote] [branch]",
	Short: "Upload local commits to remote",
	Args:  cobra.MaximumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		// Bridge local --force flag into global config so safety checks see it.
		// Cobra resolves --force to the local flag (gitPushForce), but
		// requireSafetyBranch reads cfg.ForceFlag (the global persistent flag).
		if gitPushForce {
			cfg.ForceFlag = true
		}

		// Determine operation tier
		operation := "push"
		if gitPushForce {
			operation = "push_force"
		}

		branch, _ := gwexec.CurrentBranch()
		remote := "origin"
		pushBranch := branch
		if len(args) > 0 {
			if err := sanitizeRef(args[0]); err != nil {
				return err
			}
			remote = args[0]
		}
		if len(args) > 1 {
			if err := sanitizeRef(args[1]); err != nil {
				return err
			}
			pushBranch = args[1]
		}

		if err := requireSafetyBranch(operation, pushBranch); err != nil {
			return err
		}

		gitArgs := []string{"push"}
		if gitPushSetUpstream {
			gitArgs = append(gitArgs, "-u")
		}
		if gitPushForce {
			// Always use --force-with-lease for safety
			gitArgs = append(gitArgs, "--force-with-lease")
		}
		gitArgs = append(gitArgs, remote, pushBranch)

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "non-fast-forward") {
				return fmt.Errorf("push rejected: remote has changes. Run: gw git sync --write")
			}
			return fmt.Errorf("git push: %s", stderr)
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"pushed":  true,
				"remote":  remote,
				"branch":  pushBranch,
				"forced":  gitPushForce,
			})
		}

		ui.Action("Pushed", fmt.Sprintf("%s → %s/%s", pushBranch, remote, pushBranch))
		return nil
	},
}

// ── git force-push ──────────────────────────────────────────────────

var gitForcePushCmd = &cobra.Command{
	Use:   "force-push [remote] [branch]",
	Short: "Force push to remote (uses --force-with-lease)",
	Args:  cobra.MaximumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		gitPushForce = true
		return gitPushCmd.RunE(cmd, args)
	},
}

// ── git pull ────────────────────────────────────────────────────────

var gitPullRebase bool

var gitPullCmd = &cobra.Command{
	Use:   "pull [remote] [branch]",
	Short: "Fetch and integrate remote changes",
	Args:  cobra.MaximumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("pull"); err != nil {
			return err
		}
		cfg := config.Get()

		gitArgs := []string{"pull"}
		if gitPullRebase {
			gitArgs = append(gitArgs, "--rebase")
		}

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

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "CONFLICT") || strings.Contains(stderr, "conflict") {
				return fmt.Errorf("pull has conflicts — resolve them and commit")
			}
			return fmt.Errorf("git pull: %s", stderr)
		}

		strategy := "merge"
		if gitPullRebase {
			strategy = "rebase"
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"pulled":   true,
				"remote":   remote,
				"strategy": strategy,
			})
		}

		ui.Action("Pulled", fmt.Sprintf("from %s (%s)", remote, strategy))
		return nil
	},
}

// ── git branch ──────────────────────────────────────────────────────

var gitBranchDelete bool
var gitBranchFrom string
var gitBranchList bool

var gitBranchCmd = &cobra.Command{
	Use:   "branch [name]",
	Short: "Create, list, or delete branches",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		// List mode (read-only, no --write needed)
		if gitBranchList || len(args) == 0 {
			result, err := gwexec.Git("branch", "-a", "--format=%(refname:short) %(objectname:short) %(subject)")
			if err != nil {
				return err
			}

			if cfg.JSONMode {
				branches := parseBranchList(result.Stdout)
				return printJSON(branches)
			}

			current, _ := gwexec.CurrentBranch()
			headers := []string{"Branch", "Hash", "Subject"}
			var rows [][]string
			for _, line := range result.Lines() {
				parts := strings.SplitN(line, " ", 3)
				name := parts[0]
				marker := ""
				if name == current {
					marker = "* "
				}
				hash := ""
				subject := ""
				if len(parts) >= 2 {
					hash = parts[1]
				}
				if len(parts) >= 3 {
					subject = parts[2]
				}
				rows = append(rows, []string{marker + name, hash, subject})
			}
			fmt.Print(ui.RenderTable("gw git branch", headers, rows))
			return nil
		}

		branchName := args[0]
		if err := sanitizeRef(branchName); err != nil {
			return err
		}

		// Delete mode
		if gitBranchDelete {
			if err := requireSafety("branch_delete"); err != nil {
				return err
			}

			result, err := gwexec.Git("branch", "-d", branchName)
			if err != nil {
				return err
			}
			if !result.OK() {
				return fmt.Errorf("git branch delete: %s", strings.TrimSpace(result.Stderr))
			}

			if cfg.JSONMode {
				return printJSON(map[string]any{"deleted": branchName})
			}
			ui.Action("Deleted", "branch "+branchName)
			return nil
		}

		// Create mode
		if err := requireSafety("branch_create"); err != nil {
			return err
		}

		gitArgs := []string{"branch"}
		if gitBranchFrom != "" {
			if err := sanitizeRef(gitBranchFrom); err != nil {
				return err
			}
			gitArgs = append(gitArgs, branchName, gitBranchFrom)
		} else {
			gitArgs = append(gitArgs, branchName)
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git branch: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{"created": branchName, "from": gitBranchFrom})
		}
		ui.Action("Created", "branch "+branchName)
		ui.Hint(fmt.Sprintf("Switch to it: gw git switch --write %s", branchName))
		return nil
	},
}

// ── git switch ──────────────────────────────────────────────────────

var gitSwitchCreate bool

var gitSwitchCmd = &cobra.Command{
	Use:   "switch <branch>",
	Short: "Switch to a different branch",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := sanitizeRef(args[0]); err != nil {
			return err
		}
		cfg := config.Get()

		operation := "switch"
		if gitSwitchCreate {
			operation = "branch_create"
		}
		if err := requireSafety(operation); err != nil {
			return err
		}

		gitArgs := []string{"switch"}
		if gitSwitchCreate {
			gitArgs = append(gitArgs, "-c")
		}
		gitArgs = append(gitArgs, args[0])

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git switch: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"switched": args[0],
				"created":  gitSwitchCreate,
			})
		}

		if gitSwitchCreate {
			ui.Action("Created and switched to", args[0])
		} else {
			ui.Action("Switched to", args[0])
		}
		return nil
	},
}

// ── git checkout ────────────────────────────────────────────────────

var gitCheckoutCreate bool

var gitCheckoutCmd = &cobra.Command{
	Use:   "checkout <branch>",
	Short: "Switch branches or restore files",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := sanitizeRef(args[0]); err != nil {
			return err
		}

		operation := "checkout"
		if gitCheckoutCreate {
			operation = "branch_create"
		}
		if err := requireSafety(operation); err != nil {
			return err
		}
		cfg := config.Get()

		gitArgs := []string{"checkout"}
		if gitCheckoutCreate {
			gitArgs = append(gitArgs, "-b")
		}
		gitArgs = append(gitArgs, args[0])

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git checkout: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"checked_out": args[0],
				"created":     gitCheckoutCreate,
			})
		}

		ui.Action("Checked out", args[0])
		return nil
	},
}

// ── git stash ───────────────────────────────────────────────────────

var gitStashMessage string
var gitStashIndex int

var gitStashCmd = &cobra.Command{
	Use:   "stash [push|pop|apply|drop|list]",
	Short: "Stash working directory changes",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		action := "push"
		if len(args) > 0 {
			action = strings.ToLower(args[0])
		}

		// Validate stash index bounds
		if gitStashIndex < 0 || gitStashIndex > maxStashIndex {
			return fmt.Errorf("stash index must be between 0 and %d", maxStashIndex)
		}

		switch action {
		case "list":
			// READ tier — no --write needed
			result, err := gwexec.Git("stash", "list")
			if err != nil {
				return err
			}
			if cfg.JSONMode {
				return printJSON(map[string]any{
					"stashes": result.Lines(),
				})
			}
			if strings.TrimSpace(result.Stdout) == "" {
				fmt.Println("  No stashes.")
			} else {
				fmt.Print(result.Stdout)
			}
			return nil

		case "push":
			if err := requireSafety("stash_push"); err != nil {
				return err
			}
			// Block auto-stashing in agent mode
			if cfg.AgentMode {
				return fmt.Errorf("stash is blocked in agent mode — never auto-stash user work")
			}

			gitArgs := []string{"stash", "push"}
			if gitStashMessage != "" {
				gitArgs = append(gitArgs, "-m", gitStashMessage)
			}
			result, err := gwexec.Git(gitArgs...)
			if err != nil {
				return err
			}
			if !result.OK() {
				return fmt.Errorf("git stash: %s", strings.TrimSpace(result.Stderr))
			}
			if cfg.JSONMode {
				return printJSON(map[string]any{"stashed": true})
			}
			ui.Action("Stashed", "changes saved")
			return nil

		case "pop":
			if err := requireSafety("stash_pop"); err != nil {
				return err
			}
			result, err := gwexec.Git("stash", "pop", fmt.Sprintf("stash@{%d}", gitStashIndex))
			if err != nil {
				return err
			}
			if !result.OK() {
				return fmt.Errorf("git stash pop: %s", strings.TrimSpace(result.Stderr))
			}
			if cfg.JSONMode {
				return printJSON(map[string]any{"popped": gitStashIndex})
			}
			ui.Action("Popped", fmt.Sprintf("stash@{%d}", gitStashIndex))
			return nil

		case "apply":
			if err := requireSafety("stash_apply"); err != nil {
				return err
			}
			result, err := gwexec.Git("stash", "apply", fmt.Sprintf("stash@{%d}", gitStashIndex))
			if err != nil {
				return err
			}
			if !result.OK() {
				return fmt.Errorf("git stash apply: %s", strings.TrimSpace(result.Stderr))
			}
			if cfg.JSONMode {
				return printJSON(map[string]any{"applied": gitStashIndex})
			}
			ui.Action("Applied", fmt.Sprintf("stash@{%d}", gitStashIndex))
			return nil

		case "drop":
			if err := requireSafety("stash_drop"); err != nil {
				return err
			}
			result, err := gwexec.Git("stash", "drop", fmt.Sprintf("stash@{%d}", gitStashIndex))
			if err != nil {
				return err
			}
			if !result.OK() {
				return fmt.Errorf("git stash drop: %s", strings.TrimSpace(result.Stderr))
			}
			if cfg.JSONMode {
				return printJSON(map[string]any{"dropped": gitStashIndex})
			}
			ui.Action("Dropped", fmt.Sprintf("stash@{%d}", gitStashIndex))
			return nil

		default:
			return fmt.Errorf("unknown stash action %q: use push, pop, apply, drop, or list", action)
		}
	},
}

// ── git unstage ─────────────────────────────────────────────────────

var gitUnstageAll bool

var gitUnstageCmd = &cobra.Command{
	Use:   "unstage [files...]",
	Short: "Remove files from staging area",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("unstage"); err != nil {
			return err
		}
		cfg := config.Get()

		gitArgs := []string{"reset", "HEAD"}
		if !gitUnstageAll && len(args) > 0 {
			gitArgs = append(gitArgs, "--")
			gitArgs = append(gitArgs, args...)
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git unstage: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"unstaged": true,
				"all":      gitUnstageAll || len(args) == 0,
			})
		}

		if gitUnstageAll || len(args) == 0 {
			ui.Action("Unstaged", "all files")
		} else {
			ui.Action("Unstaged", strings.Join(args, ", "))
		}
		return nil
	},
}

// ── git restore ─────────────────────────────────────────────────────

var gitRestoreStaged bool
var gitRestoreSource string

var gitRestoreCmd = &cobra.Command{
	Use:   "restore <files...>",
	Short: "Restore working tree files",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("restore"); err != nil {
			return err
		}
		cfg := config.Get()

		gitArgs := []string{"restore"}
		if gitRestoreStaged {
			gitArgs = append(gitArgs, "--staged")
		}
		if gitRestoreSource != "" {
			if err := sanitizeRef(gitRestoreSource); err != nil {
				return err
			}
			gitArgs = append(gitArgs, "--source="+gitRestoreSource)
		}
		gitArgs = append(gitArgs, "--")
		gitArgs = append(gitArgs, args...)

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git restore: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"restored": args,
				"staged":   gitRestoreStaged,
				"source":   gitRestoreSource,
			})
		}

		ui.Action("Restored", strings.Join(args, ", "))
		return nil
	},
}

// ── git cherry-pick ─────────────────────────────────────────────────

var gitCherryPickCmd = &cobra.Command{
	Use:   "cherry-pick <commits...>",
	Short: "Apply commits from another branch",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("cherry_pick"); err != nil {
			return err
		}
		cfg := config.Get()

		// Validate all refs
		for _, ref := range args {
			if err := sanitizeRef(ref); err != nil {
				return err
			}
		}

		gitArgs := []string{"cherry-pick"}
		gitArgs = append(gitArgs, args...)

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "CONFLICT") || strings.Contains(stderr, "conflict") {
				return fmt.Errorf("cherry-pick has conflicts — resolve and run: git cherry-pick --continue")
			}
			return fmt.Errorf("git cherry-pick: %s", stderr)
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"cherry_picked": args,
			})
		}

		ui.Action("Cherry-picked", strings.Join(args, ", "))
		return nil
	},
}

// ── Helpers ─────────────────────────────────────────────────────────

// maxCommitMessageLen is the maximum allowed commit message length.
const maxCommitMessageLen = 10000

// maxStashIndex is the upper bound for stash index operations.
const maxStashIndex = 100

// extractCommitHash extracts the short hash from git commit output.
// Falls back to git rev-parse if parsing fails.
func extractCommitHash(output string) string {
	// git commit output: "[branch hash] message"
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "[") {
			if idx := strings.Index(line, " "); idx > 0 {
				hash := strings.TrimRight(line[1:idx], "]")
				// Find the actual hash after branch name
				rest := line[idx+1:]
				if spaceIdx := strings.Index(rest, "]"); spaceIdx >= 0 {
					hash = strings.TrimSpace(rest[:spaceIdx])
				}
				return hash
			}
		}
	}
	// Fallback: ask git for HEAD
	out, err := gwexec.GitOutput("rev-parse", "--short", "HEAD")
	if err == nil {
		return strings.TrimSpace(out)
	}
	return ""
}

// parseBranchList parses git branch output into structured data.
func parseBranchList(output string) []map[string]string {
	var branches []map[string]string
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, " ", 3)
		entry := map[string]string{"name": parts[0]}
		if len(parts) >= 2 {
			entry["hash"] = parts[1]
		}
		if len(parts) >= 3 {
			entry["subject"] = parts[2]
		}
		branches = append(branches, entry)
	}
	return branches
}

// wipTimestamp returns a formatted WIP timestamp.
func wipTimestamp() string {
	return time.Now().Format("2006-01-02 15:04")
}

// ── Registration ────────────────────────────────────────────────────

func init() {
	// git add
	gitAddCmd.Flags().BoolVarP(&gitAddAll, "all", "A", false, "Stage all changes including untracked")
	gitCmd.AddCommand(gitAddCmd)

	// git commit
	gitCommitCmd.Flags().StringVarP(&gitCommitMessage, "message", "m", "", "Commit message (required)")
	gitCommitCmd.Flags().IntVar(&gitCommitIssue, "issue", 0, "Link to GitHub issue number")
	gitCommitCmd.Flags().BoolVar(&gitCommitNoVerify, "no-verify", false, "Skip pre-commit hooks")
	gitCommitCmd.Flags().BoolVar(&gitCommitNoFormat, "no-format", false, "Skip prettier formatting")
	gitCmd.AddCommand(gitCommitCmd)

	// git push
	gitPushCmd.Flags().BoolVarP(&gitPushSetUpstream, "set-upstream", "u", false, "Set upstream tracking")
	gitPushCmd.Flags().BoolVarP(&gitPushForce, "force", "f", false, "Force push (uses --force-with-lease)")
	gitCmd.AddCommand(gitPushCmd)

	// git force-push (convenience alias)
	gitCmd.AddCommand(gitForcePushCmd)

	// git pull
	gitPullCmd.Flags().BoolVar(&gitPullRebase, "rebase", false, "Use rebase instead of merge")
	gitCmd.AddCommand(gitPullCmd)

	// git branch
	gitBranchCmd.Flags().BoolVarP(&gitBranchDelete, "delete", "d", false, "Delete branch")
	gitBranchCmd.Flags().StringVar(&gitBranchFrom, "from", "", "Create from specific ref")
	gitBranchCmd.Flags().BoolVarP(&gitBranchList, "list", "l", false, "List all branches")
	gitCmd.AddCommand(gitBranchCmd)

	// git switch
	gitSwitchCmd.Flags().BoolVarP(&gitSwitchCreate, "create", "c", false, "Create branch if not exists")
	gitCmd.AddCommand(gitSwitchCmd)

	// git checkout
	gitCheckoutCmd.Flags().BoolVarP(&gitCheckoutCreate, "create", "b", false, "Create branch if not exists")
	gitCmd.AddCommand(gitCheckoutCmd)

	// git stash
	gitStashCmd.Flags().StringVarP(&gitStashMessage, "message", "m", "", "Stash message")
	gitStashCmd.Flags().IntVar(&gitStashIndex, "index", 0, "Stash index for pop/apply/drop")
	gitCmd.AddCommand(gitStashCmd)

	// git unstage
	gitUnstageCmd.Flags().BoolVarP(&gitUnstageAll, "all", "A", false, "Unstage all files")
	gitCmd.AddCommand(gitUnstageCmd)

	// git restore
	gitRestoreCmd.Flags().BoolVarP(&gitRestoreStaged, "staged", "S", false, "Restore staged files")
	gitRestoreCmd.Flags().StringVar(&gitRestoreSource, "source", "", "Restore from specific commit")
	gitCmd.AddCommand(gitRestoreCmd)

	// git cherry-pick
	gitCmd.AddCommand(gitCherryPickCmd)
}
