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

// ── git save ────────────────────────────────────────────────────────

var gitSaveMessage string

var gitSaveCmd = &cobra.Command{
	Use:   "save",
	Short: "Stage all, commit, push in one step",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("save"); err != nil {
			return err
		}
		cfg := config.Get()

		// Step 1: Stage all changes
		result, err := gwexec.Git("add", "-A")
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git add: %s", strings.TrimSpace(result.Stderr))
		}

		// Step 2: Determine message
		msg := gitSaveMessage
		if msg == "" {
			msg = fmt.Sprintf("wip: work in progress (%s)", wipTimestamp())
		}

		// Step 3: Commit
		result, err = gwexec.Git("commit", "-m", msg)
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "nothing to commit") {
				return fmt.Errorf("nothing to commit")
			}
			return fmt.Errorf("git commit: %s", stderr)
		}
		hash := extractCommitHash(result.Stdout)

		// Step 3: Push
		branch, _ := gwexec.CurrentBranch()
		result, err = gwexec.Git("push", "-u", "origin", branch)
		if err != nil {
			return err
		}
		pushOK := result.OK()

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"saved":     true,
				"hash":      hash,
				"message":   msg,
				"pushed":    pushOK,
				"branch":    branch,
			})
		}

		ui.Action("Staged", "all changes")
		ui.Action("Committed", hash+" "+msg)
		if pushOK {
			ui.Action("Pushed", branch+" → origin/"+branch)
		} else {
			ui.Warning("Push failed — commit saved locally")
		}
		return nil
	},
}

// ── git wip ─────────────────────────────────────────────────────────

var gitWIPCmd = &cobra.Command{
	Use:   "wip",
	Short: "Quick work-in-progress commit",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("wip"); err != nil {
			return err
		}
		cfg := config.Get()

		// Stage all changes
		result, err := gwexec.Git("add", "-A")
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git add: %s", strings.TrimSpace(result.Stderr))
		}

		// Commit with WIP message, skip hooks, add [skip ci]
		msg := fmt.Sprintf("wip: %s [skip ci]", wipTimestamp())
		result, err = gwexec.Git("commit", "-m", msg, "--no-verify")
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "nothing to commit") {
				return fmt.Errorf("nothing to commit")
			}
			return fmt.Errorf("git commit: %s", stderr)
		}
		hash := extractCommitHash(result.Stdout)

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"wip":     true,
				"hash":    hash,
				"message": msg,
			})
		}

		ui.Action("WIP", hash+" "+msg)
		return nil
	},
}

// ── git undo ────────────────────────────────────────────────────────

var gitUndoCmd = &cobra.Command{
	Use:   "undo",
	Short: "Undo last commit (keeps changes staged)",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("undo"); err != nil {
			return err
		}
		cfg := config.Get()

		// Get info about the commit we're about to undo
		logResult, _ := gwexec.Git("log", "--oneline", "-n1")
		undoneCommit := strings.TrimSpace(logResult.Stdout)

		// Soft reset — keeps changes staged
		result, err := gwexec.Git("reset", "HEAD~1", "--soft")
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git undo: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"undone":  true,
				"commit":  undoneCommit,
			})
		}

		ui.Action("Undone", undoneCommit)
		ui.Hint("Changes are still staged — ready to recommit")
		return nil
	},
}

// ── git amend ───────────────────────────────────────────────────────

var gitAmendMessage string

var gitAmendCmd = &cobra.Command{
	Use:   "amend",
	Short: "Amend the last commit",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("amend"); err != nil {
			return err
		}
		cfg := config.Get()

		gitArgs := []string{"commit", "--amend"}
		if gitAmendMessage != "" {
			gitArgs = append(gitArgs, "-m", gitAmendMessage)
		} else {
			// Use existing message
			gitArgs = append(gitArgs, "--no-edit")
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git amend: %s", strings.TrimSpace(result.Stderr))
		}

		hash := extractCommitHash(result.Stdout)

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"amended":  true,
				"hash":     hash,
				"message":  gitAmendMessage,
			})
		}

		ui.Action("Amended", hash)
		return nil
	},
}

// ── git fast ────────────────────────────────────────────────────────

var gitFastMessage string

var gitFastCmd = &cobra.Command{
	Use:   "fast",
	Short: "Fast commit & push (skips hooks)",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("save"); err != nil {
			return err
		}
		cfg := config.Get()

		if gitFastMessage == "" {
			return fmt.Errorf("message required: use -m \"message\"")
		}
		if len(gitFastMessage) > maxCommitMessageLen {
			return fmt.Errorf("commit message too long (%d chars, max %d)", len(gitFastMessage), maxCommitMessageLen)
		}

		// Validate conventional commit format
		if cfg.Git.CommitFormat != "none" {
			ok, errMsg := commits.Validate(gitFastMessage, cfg.Git.ConventionalTypes, cfg.Git.CommitFormat)
			if !ok {
				return fmt.Errorf("invalid commit message: %s", errMsg)
			}
		}

		// Auto-detect issue from branch name
		branch, _ := gwexec.CurrentBranch()
		if cfg.Git.AutoLinkIssues {
			issue := commits.ExtractIssueNumber(branch, cfg.Git.IssuePattern)
			if issue > 0 && !strings.Contains(gitFastMessage, fmt.Sprintf("#%d", issue)) {
				gitFastMessage += fmt.Sprintf(" (#%d)", issue)
			}
		}

		// Stage all
		result, err := gwexec.Git("add", "-A")
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("git add: %s", strings.TrimSpace(result.Stderr))
		}

		// Commit with --no-verify
		result, err = gwexec.Git("commit", "-m", gitFastMessage, "--no-verify")
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "nothing to commit") {
				return fmt.Errorf("nothing to commit")
			}
			return fmt.Errorf("git commit: %s", stderr)
		}
		hash := extractCommitHash(result.Stdout)

		// Push with --no-verify
		result, err = gwexec.Git("push", "-u", "--no-verify", "origin", branch)
		if err != nil {
			return err
		}
		pushOK := result.OK()

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"fast":    true,
				"hash":    hash,
				"message": gitFastMessage,
				"pushed":  pushOK,
				"branch":  branch,
			})
		}

		ui.Action("Staged", "all changes")
		ui.Action("Committed", hash+" "+gitFastMessage+" (hooks skipped)")
		if pushOK {
			ui.Action("Pushed", branch+" → origin/"+branch)
		} else {
			ui.Warning("Push failed — commit saved locally")
		}
		return nil
	},
}

// ── git sync ────────────────────────────────────────────────────────

var gitSyncCmd = &cobra.Command{
	Use:   "sync [remote] [base-branch]",
	Short: "Fetch, rebase, and push to sync with remote",
	Args:  cobra.MaximumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("sync"); err != nil {
			return err
		}
		cfg := config.Get()

		remote := "origin"
		baseBranch := "main"
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
			baseBranch = args[1]
		}

		// Check for dirty working tree
		statusResult, _ := gwexec.Git("status", "--porcelain=v1")
		if strings.TrimSpace(statusResult.Stdout) != "" {
			return fmt.Errorf("working tree is dirty — commit or stash changes first\n" +
				"  Suggestions:\n" +
				"  • gw git wip --write     (quick WIP commit)\n" +
				"  • gw git stash --write   (stash changes)\n" +
				"  • gw git save --write    (save and push)")
		}

		currentBranch, _ := gwexec.CurrentBranch()

		// Step 1: Fetch
		result, err := gwexec.Git("fetch", remote, "--prune")
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("fetch failed: %s", strings.TrimSpace(result.Stderr))
		}

		// Step 2: Rebase onto remote base
		rebaseRef := remote + "/" + baseBranch
		result, err = gwexec.Git("rebase", rebaseRef)
		if err != nil {
			return err
		}
		if !result.OK() {
			stderr := strings.TrimSpace(result.Stderr)
			if strings.Contains(stderr, "CONFLICT") || strings.Contains(stderr, "conflict") {
				return fmt.Errorf("rebase has conflicts — resolve and run: git rebase --continue")
			}
			return fmt.Errorf("rebase failed: %s", stderr)
		}

		// Step 3: Push (try regular first, then force-with-lease if rebased)
		result, err = gwexec.Git("push", "origin", currentBranch)
		pushed := err == nil && result.OK()

		if !pushed {
			// Rebase rewrites history — need force-with-lease
			result, err = gwexec.Git("push", "--force-with-lease", "origin", currentBranch)
			if err != nil {
				return err
			}
			pushed = result.OK()
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"synced":      true,
				"remote":      remote,
				"base":        baseBranch,
				"branch":      currentBranch,
				"pushed":      pushed,
				"force_lease": true,
			})
		}

		ui.Action("Fetched", remote+" (pruned)")
		ui.Action("Rebased", currentBranch+" onto "+rebaseRef)
		if pushed {
			ui.Action("Pushed", currentBranch+" → origin/"+currentBranch)
		} else {
			ui.Warning("Push failed — run: gw git push --write")
		}
		return nil
	},
}

// ── Registration ────────────────────────────────────────────────────

func init() {
	// git save
	gitSaveCmd.Flags().StringVarP(&gitSaveMessage, "message", "m", "", "Commit message (default: WIP timestamp)")
	gitCmd.AddCommand(gitSaveCmd)

	// git wip
	gitCmd.AddCommand(gitWIPCmd)

	// git undo
	gitCmd.AddCommand(gitUndoCmd)

	// git amend
	gitAmendCmd.Flags().StringVarP(&gitAmendMessage, "message", "m", "", "New commit message (optional)")
	gitCmd.AddCommand(gitAmendCmd)

	// git fast
	gitFastCmd.Flags().StringVarP(&gitFastMessage, "message", "m", "", "Commit message (required)")
	gitCmd.AddCommand(gitFastCmd)

	// git sync
	gitCmd.AddCommand(gitSyncCmd)
}
