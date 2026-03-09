package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// slugify converts a title to a URL-safe branch-name component.
// Lowercase, non-alphanumeric → dash, collapsed runs, trimmed.
func slugify(s string, maxLen int) string {
	s = strings.ToLower(s)
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > maxLen {
		s = s[:maxLen]
		s = strings.TrimRight(s, "-")
	}
	return s
}

// branchNameForIssue generates a branch name from issue metadata.
// Format: {prefix}issue-{number}-{slugified-title}
func branchNameForIssue(number string, title string, labels []string) string {
	prefix := "feat/"
	for _, l := range labels {
		if strings.EqualFold(l, "bug") {
			prefix = "fix/"
			break
		}
	}
	slug := slugify(title, 50)
	name := fmt.Sprintf("%sissue-%s-%s", prefix, number, slug)
	return name
}

// repoRoot returns the top-level directory of the current git repository.
func repoRoot() (string, error) {
	output, err := gwexec.GitOutput("rev-parse", "--show-toplevel")
	if err != nil {
		return "", fmt.Errorf("not a git repository: %w", err)
	}
	return strings.TrimSpace(output), nil
}

// worktreeBasePath returns the directory where worktrees are created.
// Worktrees live inside the repo at <root>/.worktrees/ so each project
// keeps its own worktrees and they don't leak into parent directories.
// Falls back to GroveRoot when not inside a git repository.
func worktreeBasePath() (string, error) {
	root, err := repoRoot()
	if err != nil {
		// Not in a git repo — try GroveRoot from config
		cfg := config.Get()
		if _, statErr := os.Stat(filepath.Join(cfg.GroveRoot, ".git")); statErr == nil {
			return filepath.Join(cfg.GroveRoot, ".worktrees"), nil
		}
		return "", err
	}
	return filepath.Join(root, ".worktrees"), nil
}

// worktreePathForIssue returns the worktree path for an issue.
func worktreePathForIssue(number string) (string, error) {
	base, err := worktreeBasePath()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "issue-"+number), nil
}

// parseWorktreeListPorcelain parses `git worktree list --porcelain` output.
type worktreeInfo struct {
	Path   string `json:"path"`
	Head   string `json:"head"`
	Branch string `json:"branch"`
	Bare   bool   `json:"bare"`
}

func parseWorktreeListPorcelain(output string) []worktreeInfo {
	var trees []worktreeInfo
	var current *worktreeInfo

	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			if current != nil {
				trees = append(trees, *current)
				current = nil
			}
			continue
		}
		if strings.HasPrefix(line, "worktree ") {
			current = &worktreeInfo{Path: strings.TrimPrefix(line, "worktree ")}
		} else if current != nil {
			if strings.HasPrefix(line, "HEAD ") {
				current.Head = strings.TrimPrefix(line, "HEAD ")
			} else if strings.HasPrefix(line, "branch ") {
				branch := strings.TrimPrefix(line, "branch ")
				// Strip refs/heads/ prefix
				current.Branch = strings.TrimPrefix(branch, "refs/heads/")
			} else if line == "bare" {
				current.Bare = true
			}
		}
	}
	if current != nil {
		trees = append(trees, *current)
	}
	return trees
}

// ── worktree command group ──────────────────────────────────────────

var gitWorktreeCmd = &cobra.Command{
	Use:   "worktree",
	Short: "Manage multiple working trees",
	Long:  "Manage git worktrees with issue-aware branch creation.",
}

// ── worktree list ───────────────────────────────────────────────────

var gitWorktreeListCmd = &cobra.Command{
	Use:   "list",
	Short: "List worktrees",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}

		cfg := config.Get()

		output, err := gwexec.GitOutput("worktree", "list", "--porcelain")
		if err != nil {
			return fmt.Errorf("failed to list worktrees: %w", err)
		}

		trees := parseWorktreeListPorcelain(output)

		if cfg.JSONMode {
			data, _ := json.MarshalIndent(trees, "", "  ")
			fmt.Println(string(data))
			return nil
		}

		if len(trees) == 0 {
			ui.Muted("No worktrees found")
			return nil
		}

		headers := []string{"Path", "Branch", "HEAD"}
		var rows [][]string
		for _, t := range trees {
			branch := t.Branch
			if t.Bare {
				branch = "(bare)"
			}
			head := t.Head
			if len(head) > 8 {
				head = head[:8]
			}
			rows = append(rows, []string{t.Path, branch, head})
		}
		fmt.Print(ui.RenderTable("Worktrees", headers, rows))
		return nil
	},
}

// ── worktree create ─────────────────────────────────────────────────

var gitWorktreeCreateCmd = &cobra.Command{
	Use:   "create <issue-number>",
	Short: "Create a worktree for an issue",
	Long:  "Fetch issue metadata, generate a branch name, and create a worktree.",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("worktree_create"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}

		// Fetch issue metadata
		ghArgs := []string{"issue", "view", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--json", "title,labels")
		issueOutput, err := gwexec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("failed to fetch issue #%s: %w", number, err)
		}

		var issueData struct {
			Title  string `json:"title"`
			Labels []struct {
				Name string `json:"name"`
			} `json:"labels"`
		}
		if err := json.Unmarshal([]byte(issueOutput), &issueData); err != nil {
			return fmt.Errorf("failed to parse issue data: %w", err)
		}

		var labelNames []string
		for _, l := range issueData.Labels {
			labelNames = append(labelNames, l.Name)
		}

		branch := branchNameForIssue(number, issueData.Title, labelNames)
		wtPath, err := worktreePathForIssue(number)
		if err != nil {
			return err
		}

		// Create parent directory if needed
		if err := os.MkdirAll(filepath.Dir(wtPath), 0o755); err != nil {
			return fmt.Errorf("failed to create worktree directory: %w", err)
		}

		// Create worktree with new branch
		result, err := gwexec.Git("worktree", "add", "-b", branch, wtPath)
		if err != nil {
			return fmt.Errorf("failed to create worktree: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("git worktree add: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]string{
				"path":   wtPath,
				"branch": branch,
				"issue":  number,
				"title":  issueData.Title,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Created worktree for issue #%s", number))
			ui.PrintKeyValue("path", wtPath)
			ui.PrintKeyValue("branch", branch)
			ui.Hint(fmt.Sprintf("cd %s to start working", wtPath))
		}
		return nil
	},
}

// ── worktree remove ─────────────────────────────────────────────────

var gitWorktreeRemoveCmd = &cobra.Command{
	Use:   "remove <path>",
	Short: "Remove a worktree",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("worktree_remove"); err != nil {
			return err
		}

		cfg := config.Get()
		wtPath := args[0]
		force, _ := cmd.Flags().GetBool("force")

		gitArgs := []string{"worktree", "remove", wtPath}
		if force {
			gitArgs = append(gitArgs, "--force")
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return fmt.Errorf("failed to remove worktree: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("git worktree remove: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]string{"removed": wtPath})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Removed worktree: %s", wtPath))
		}
		return nil
	},
}

// ── worktree finish ─────────────────────────────────────────────────

// resolveWorktreeByIssue scans git worktree list for a branch containing
// "issue-{number}" and returns the matching worktree info.
// Errors if zero or multiple worktrees match.
func resolveWorktreeByIssue(number string) (*worktreeInfo, error) {
	output, err := gwexec.GitOutput("worktree", "list", "--porcelain")
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}
	trees := parseWorktreeListPorcelain(output)

	needle := "issue-" + number + "-"
	var matches []worktreeInfo
	for _, t := range trees {
		if strings.Contains(t.Branch, needle) {
			matches = append(matches, t)
		}
	}

	switch len(matches) {
	case 0:
		return nil, fmt.Errorf("no worktree found for issue #%s", number)
	case 1:
		return &matches[0], nil
	default:
		var paths []string
		for _, m := range matches {
			paths = append(paths, m.Path)
		}
		return nil, fmt.Errorf("multiple worktrees match issue #%s: %s", number, strings.Join(paths, ", "))
	}
}

var gitWorktreeFinishCmd = &cobra.Command{
	Use:   "finish [issue-number]",
	Short: "Commit, push, merge into main, and remove worktree",
	Long: `Finish work in the current worktree:
1. Stage and commit all changes (if any)
2. Push the branch to remote
3. Merge branch into main
4. Push main
5. Remove the worktree and clean up branches

When an issue number is provided, resolves the matching worktree by branch
name (e.g. fix/issue-1349-...) and operates on it from any directory.
When omitted, operates on the current working directory (existing behavior).`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("worktree_finish"); err != nil {
			return err
		}

		cfg := config.Get()
		message, _ := cmd.Flags().GetString("message")
		deleteBranch, _ := cmd.Flags().GetBool("delete-branch")
		noMerge, _ := cmd.Flags().GetBool("no-merge")

		var cwd string
		var branch string

		if len(args) == 1 {
			// Resolve worktree by issue number
			number := args[0]
			if err := validateGHNumber(number); err != nil {
				return err
			}
			wt, err := resolveWorktreeByIssue(number)
			if err != nil {
				return err
			}
			cwd = wt.Path
			branch = wt.Branch
		} else {
			// Existing behavior: use current working directory
			var err error
			cwd, err = os.Getwd()
			if err != nil {
				return fmt.Errorf("cannot determine working directory: %w", err)
			}
			branch, err = gwexec.CurrentBranch()
			if err != nil {
				return fmt.Errorf("cannot determine current branch: %w", err)
			}
		}

		if branch == "main" || branch == "master" {
			return fmt.Errorf("cannot finish from main/master branch — must be in a worktree branch")
		}

		// Find the main worktree path early — needed for rebase and merge
		listOutput, err := gwexec.GitOutput("worktree", "list", "--porcelain")
		if err != nil {
			return fmt.Errorf("failed to list worktrees: %w", err)
		}
		trees := parseWorktreeListPorcelain(listOutput)
		mainPath := ""
		mainBranch := ""
		for _, t := range trees {
			if t.Branch == "main" || t.Branch == "master" {
				mainPath = t.Path
				mainBranch = t.Branch
				break
			}
		}
		if mainPath == "" {
			return fmt.Errorf("could not find main worktree — remove this worktree manually")
		}

		// Sync branch with main BEFORE staging to prevent ghost deletions.
		// Without this, files added to main after the branch point would be
		// absent from the worktree. `git add -A` would stage their absence
		// as deletions, and the merge would propagate those deletions to main.
		// See: https://github.com/AutumnsGrove/Lattice/issues/1435
		if !noMerge {
			gwexec.RunInDir(cwd, "git", "fetch", "origin", "--prune")
			rebaseResult, rebaseErr := gwexec.RunInDir(cwd, "git", "rebase", "origin/"+mainBranch)
			if rebaseErr != nil || !rebaseResult.OK() {
				ui.Warning("Could not rebase branch onto origin/" + mainBranch + " — proceeding with current state")
				// Abort the failed rebase to restore clean state
				gwexec.RunInDir(cwd, "git", "rebase", "--abort")
			}
		}

		// Check for uncommitted changes
		statusResult, err := gwexec.RunInDir(cwd, "git", "status", "--porcelain")
		if err != nil {
			return fmt.Errorf("git status failed: %w", err)
		}
		hasChanges := strings.TrimSpace(statusResult.Stdout) != ""

		if hasChanges {
			if message == "" {
				message = fmt.Sprintf("feat: work in progress on %s", branch)
			}

			// Stage all and commit
			result, err := gwexec.RunInDir(cwd, "git", "add", "-A")
			if err != nil || !result.OK() {
				return fmt.Errorf("git add failed: %w", err)
			}

			// Safety check: detect unexpected deletions before committing.
			// If staging produced more than 50 deletions, something is wrong —
			// abort rather than propagate mass deletions to main.
			diffResult, diffErr := gwexec.RunInDir(cwd, "git", "diff", "--cached", "--diff-filter=D", "--name-only")
			if diffErr == nil {
				deletedFiles := strings.TrimSpace(diffResult.Stdout)
				if deletedFiles != "" {
					deleteCount := len(strings.Split(deletedFiles, "\n"))
					if deleteCount > 50 {
						// Unstage everything and abort
						gwexec.RunInDir(cwd, "git", "reset", "HEAD")
						return fmt.Errorf("safety abort: staging would delete %d files — this likely indicates the branch is out of sync with %s\nRun `git rebase %s` in the worktree first, or use --no-merge to skip", deleteCount, mainBranch, mainBranch)
					}
				}
			}

			result, err = gwexec.RunInDir(cwd, "git", "commit", "-m", message)
			if err != nil || !result.OK() {
				return fmt.Errorf("git commit failed: %s", strings.TrimSpace(result.Stderr))
			}
		}

		// Push branch
		pushResult, err := gwexec.RunInDir(cwd, "git", "push", "-u", "origin", branch)
		if err != nil {
			return fmt.Errorf("git push failed: %w", err)
		}
		if !pushResult.OK() {
			// Force push may be needed after rebase rewrote history
			pushResult, err = gwexec.RunInDir(cwd, "git", "push", "--force-with-lease", "-u", "origin", branch)
			if err != nil {
				return fmt.Errorf("git push failed: %w", err)
			}
			if !pushResult.OK() {
				return fmt.Errorf("git push: %s", strings.TrimSpace(pushResult.Stderr))
			}
		}

		// Merge into main (unless --no-merge)
		merged := false
		if !noMerge {
			// Sync main with origin before merging
			gwexec.RunInDir(mainPath, "git", "fetch", "origin", "--prune")
			rebaseResult, rebaseErr := gwexec.RunInDir(mainPath, "git", "rebase", "origin/"+mainBranch)
			if rebaseErr != nil || !rebaseResult.OK() {
				ui.Warning("Could not rebase " + mainBranch + " onto origin/" + mainBranch + " — merging with current state")
				gwexec.RunInDir(mainPath, "git", "rebase", "--abort")
			}

			// Merge the branch into main
			mergeResult, mergeErr := gwexec.RunInDir(mainPath, "git", "merge", branch)
			if mergeErr != nil {
				return fmt.Errorf("merge into %s failed: %w — resolve manually in %s", mainBranch, mergeErr, mainPath)
			}
			if !mergeResult.OK() {
				return fmt.Errorf("merge into %s failed: %s\nResolve manually in %s", mainBranch, strings.TrimSpace(mergeResult.Stderr), mainPath)
			}

			// Push main
			pushMainResult, pushMainErr := gwexec.RunInDir(mainPath, "git", "push")
			if pushMainErr != nil {
				return fmt.Errorf("push %s failed: %w", mainBranch, pushMainErr)
			}
			if !pushMainResult.OK() {
				return fmt.Errorf("push %s failed: %s", mainBranch, strings.TrimSpace(pushMainResult.Stderr))
			}
			merged = true
		}

		// Remove the current worktree
		removeResult, err := gwexec.RunInDir(mainPath, "git", "worktree", "remove", cwd)
		if err != nil || !removeResult.OK() {
			// Try with force
			removeResult, err = gwexec.RunInDir(mainPath, "git", "worktree", "remove", "--force", cwd)
			if err != nil {
				return fmt.Errorf("failed to remove worktree: %w", err)
			}
			if !removeResult.OK() {
				return fmt.Errorf("git worktree remove: %s", strings.TrimSpace(removeResult.Stderr))
			}
		}

		// Delete local branch (now safe since worktree is removed)
		gwexec.RunInDir(mainPath, "git", "branch", "-d", branch)

		// Delete remote branch if requested or if merged (branch served its purpose)
		remoteBranchDeleted := false
		if deleteBranch || merged {
			remoteResult, remoteErr := gwexec.RunInDir(mainPath, "git", "push", "origin", "--delete", branch)
			remoteBranchDeleted = remoteErr == nil && remoteResult.OK()
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"branch":         branch,
				"pushed":         true,
				"merged":         merged,
				"removed":        cwd,
				"main_path":      mainPath,
				"committed":      hasChanges,
				"remote_deleted": remoteBranchDeleted,
			})
			fmt.Println(string(data))
		} else {
			if hasChanges {
				ui.Step(true, "Committed changes")
			}
			ui.Step(true, fmt.Sprintf("Pushed branch %s", branch))
			if merged {
				ui.Step(true, fmt.Sprintf("Merged into %s and pushed", mainBranch))
			}
			ui.Step(true, fmt.Sprintf("Removed worktree %s", cwd))
			if remoteBranchDeleted {
				ui.Step(true, fmt.Sprintf("Deleted remote branch %s", branch))
			}
			ui.Success("Worktree finished")
			ui.Hint(fmt.Sprintf("cd %s", mainPath))
		}
		return nil
	},
}

// ── worktree clean ──────────────────────────────────────────────────

var gitWorktreeCleanCmd = &cobra.Command{
	Use:   "clean",
	Short: "Remove worktrees whose branches have been merged",
	Long: `Find worktrees whose branches have been merged into main and remove them.

In interactive mode, confirms each removal. In agent/JSON mode, removes all
merged worktrees automatically (requires --write).

Also cleans up local branches that have been merged and optionally deletes
remote tracking branches.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("worktree_clean"); err != nil {
			return err
		}

		cfg := config.Get()
		deleteBranch, _ := cmd.Flags().GetBool("delete-branch")

		// List all worktrees
		output, err := gwexec.GitOutput("worktree", "list", "--porcelain")
		if err != nil {
			return fmt.Errorf("failed to list worktrees: %w", err)
		}
		trees := parseWorktreeListPorcelain(output)

		// Find the main branch name
		mainBranch := ""
		for _, t := range trees {
			if t.Branch == "main" || t.Branch == "master" {
				mainBranch = t.Branch
				break
			}
		}
		if mainBranch == "" {
			mainBranch = "main" // default assumption
		}

		// Get list of branches merged into main
		mergedOutput, err := gwexec.GitOutput("branch", "--merged", mainBranch, "--format=%(refname:short)")
		if err != nil {
			return fmt.Errorf("failed to check merged branches: %w", err)
		}
		mergedBranches := make(map[string]bool)
		for _, line := range strings.Split(strings.TrimSpace(mergedOutput), "\n") {
			line = strings.TrimSpace(line)
			if line != "" {
				mergedBranches[line] = true
			}
		}

		// Find worktrees with merged branches (skip main/bare)
		type cleanCandidate struct {
			tree   worktreeInfo
			reason string
		}
		var candidates []cleanCandidate
		for _, t := range trees {
			if t.Branch == mainBranch || t.Branch == "" || t.Bare {
				continue
			}
			if mergedBranches[t.Branch] {
				candidates = append(candidates, cleanCandidate{
					tree:   t,
					reason: fmt.Sprintf("branch %s merged into %s", t.Branch, mainBranch),
				})
			}
		}

		if len(candidates) == 0 {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"cleaned": 0,
					"message": "no merged worktrees found",
				})
				fmt.Println(string(data))
			} else {
				ui.Muted("No merged worktrees to clean")
			}
			return nil
		}

		interactive := cfg.IsInteractive() && !cfg.JSONMode

		var cleaned []map[string]string
		for _, c := range candidates {
			if interactive {
				ui.Info(fmt.Sprintf("%s (%s)", c.tree.Path, c.reason))
				if !ui.Confirm("  Remove this worktree?") {
					ui.Muted("  Skipped")
					continue
				}
			}

			// Remove the worktree
			result, gitErr := gwexec.Git("worktree", "remove", c.tree.Path)
			if gitErr != nil || !result.OK() {
				// Try with force (may have untracked files from build artifacts)
				result, gitErr = gwexec.Git("worktree", "remove", "--force", c.tree.Path)
				if gitErr != nil {
					if interactive {
						ui.Step(false, fmt.Sprintf("Failed to remove %s: %v", c.tree.Path, gitErr))
					}
					continue
				}
				if !result.OK() {
					if interactive {
						ui.Step(false, fmt.Sprintf("Failed to remove %s: %s", c.tree.Path, strings.TrimSpace(result.Stderr)))
					}
					continue
				}
			}

			entry := map[string]string{
				"path":   c.tree.Path,
				"branch": c.tree.Branch,
			}

			// Delete the local branch
			delResult, delErr := gwexec.Git("branch", "-d", c.tree.Branch)
			if delErr == nil && delResult.OK() {
				entry["branch_deleted"] = "true"
			}

			// Delete remote branch if requested
			if deleteBranch {
				remoteResult, remoteErr := gwexec.Git("push", "origin", "--delete", c.tree.Branch)
				if remoteErr == nil && remoteResult.OK() {
					entry["remote_deleted"] = "true"
				}
			}

			cleaned = append(cleaned, entry)

			if interactive {
				branchMsg := ""
				if entry["branch_deleted"] == "true" {
					branchMsg = " + deleted branch"
				}
				if entry["remote_deleted"] == "true" {
					branchMsg += " + remote"
				}
				ui.Step(true, fmt.Sprintf("Removed %s%s", c.tree.Path, branchMsg))
			}
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"cleaned":   len(cleaned),
				"worktrees": cleaned,
			})
			fmt.Println(string(data))
		} else if !interactive {
			ui.Success(fmt.Sprintf("Cleaned %d merged worktree(s)", len(cleaned)))
		} else if len(cleaned) > 0 {
			ui.Success(fmt.Sprintf("Cleaned %d worktree(s)", len(cleaned)))
		}

		return nil
	},
}

// ── worktree prune ──────────────────────────────────────────────────

var gitWorktreePruneCmd = &cobra.Command{
	Use:   "prune",
	Short: "Clean up stale worktree metadata",
	Long: `Remove worktree administrative files for worktrees whose directories
have been manually deleted. This is safe to run — it only cleans up
metadata in .git/worktrees/, never deletes actual directories.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("worktree_prune"); err != nil {
			return err
		}

		cfg := config.Get()
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		gitArgs := []string{"worktree", "prune"}
		if dryRun {
			gitArgs = append(gitArgs, "--dry-run")
		}
		if cfg.Verbose {
			gitArgs = append(gitArgs, "--verbose")
		}

		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return fmt.Errorf("failed to prune worktrees: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("git worktree prune: %s", strings.TrimSpace(result.Stderr))
		}

		output := strings.TrimSpace(result.Stdout + result.Stderr)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"pruned":  !dryRun,
				"dry_run": dryRun,
				"output":  output,
			})
			fmt.Println(string(data))
		} else {
			if output != "" {
				fmt.Println(output)
			}
			if dryRun {
				ui.Muted("Dry run — no changes made")
			} else {
				ui.Success("Pruned stale worktree metadata")
			}
		}
		return nil
	},
}

func init() {
	gitCmd.AddCommand(gitWorktreeCmd)

	// worktree list
	gitWorktreeCmd.AddCommand(gitWorktreeListCmd)

	// worktree create
	gitWorktreeCmd.AddCommand(gitWorktreeCreateCmd)

	// worktree remove
	gitWorktreeRemoveCmd.Flags().Bool("force", false, "Force remove even with uncommitted changes")
	gitWorktreeCmd.AddCommand(gitWorktreeRemoveCmd)

	// worktree finish
	gitWorktreeFinishCmd.Flags().StringP("message", "m", "", "Commit message (default: auto-generated)")
	gitWorktreeFinishCmd.Flags().Bool("delete-branch", false, "Delete remote branch after push")
	gitWorktreeFinishCmd.Flags().Bool("no-merge", false, "Skip merging into main (just commit, push, and remove)")
	gitWorktreeCmd.AddCommand(gitWorktreeFinishCmd)

	// worktree clean
	gitWorktreeCleanCmd.Flags().Bool("delete-branch", false, "Also delete remote branches")
	gitWorktreeCmd.AddCommand(gitWorktreeCleanCmd)

	// worktree prune
	gitWorktreePruneCmd.Flags().Bool("dry-run", false, "Show what would be pruned without doing it")
	gitWorktreeCmd.AddCommand(gitWorktreePruneCmd)
}
