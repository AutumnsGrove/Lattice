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

// worktreeBasePath returns the directory where worktrees are created.
func worktreeBasePath() (string, error) {
	output, err := gwexec.GitOutput("rev-parse", "--show-toplevel")
	if err != nil {
		return "", fmt.Errorf("not a git repository: %w", err)
	}
	repoRoot := strings.TrimSpace(output)
	return filepath.Join(filepath.Dir(repoRoot), ".worktrees"), nil
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

var gitWorktreeFinishCmd = &cobra.Command{
	Use:   "finish",
	Short: "Commit, push, switch to main, and remove worktree",
	Long: `Finish work in the current worktree:
1. Stage and commit all changes (if any)
2. Push the branch to remote
3. Switch to main worktree
4. Remove the current worktree`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("worktree_finish"); err != nil {
			return err
		}

		cfg := config.Get()
		message, _ := cmd.Flags().GetString("message")

		// Get current working directory and branch
		cwd, err := os.Getwd()
		if err != nil {
			return fmt.Errorf("cannot determine working directory: %w", err)
		}
		branch, err := gwexec.CurrentBranch()
		if err != nil {
			return fmt.Errorf("cannot determine current branch: %w", err)
		}

		if branch == "main" || branch == "master" {
			return fmt.Errorf("cannot finish from main/master branch — must be in a worktree branch")
		}

		// Check for uncommitted changes
		statusResult, err := gwexec.Git("status", "--porcelain")
		if err != nil {
			return fmt.Errorf("git status failed: %w", err)
		}
		hasChanges := strings.TrimSpace(statusResult.Stdout) != ""

		if hasChanges {
			if message == "" {
				message = fmt.Sprintf("feat: work in progress on %s", branch)
			}

			// Stage all and commit
			result, err := gwexec.Git("add", "-A")
			if err != nil || !result.OK() {
				return fmt.Errorf("git add failed: %w", err)
			}
			result, err = gwexec.Git("commit", "-m", message)
			if err != nil || !result.OK() {
				return fmt.Errorf("git commit failed: %s", strings.TrimSpace(result.Stderr))
			}
		}

		// Push branch
		pushResult, err := gwexec.Git("push", "-u", "origin", branch)
		if err != nil {
			return fmt.Errorf("git push failed: %w", err)
		}
		if !pushResult.OK() {
			return fmt.Errorf("git push: %s", strings.TrimSpace(pushResult.Stderr))
		}

		// Find the main worktree path
		listOutput, err := gwexec.GitOutput("worktree", "list", "--porcelain")
		if err != nil {
			return fmt.Errorf("failed to list worktrees: %w", err)
		}
		trees := parseWorktreeListPorcelain(listOutput)
		mainPath := ""
		for _, t := range trees {
			if t.Branch == "main" || t.Branch == "master" {
				mainPath = t.Path
				break
			}
		}
		if mainPath == "" {
			return fmt.Errorf("could not find main worktree — remove this worktree manually")
		}

		// Switch to main worktree directory (informational — user needs to cd)
		// Remove the current worktree
		removeResult, err := gwexec.Git("worktree", "remove", cwd)
		if err != nil || !removeResult.OK() {
			// Try with force
			removeResult, err = gwexec.Git("worktree", "remove", "--force", cwd)
			if err != nil {
				return fmt.Errorf("failed to remove worktree: %w", err)
			}
			if !removeResult.OK() {
				return fmt.Errorf("git worktree remove: %s", strings.TrimSpace(removeResult.Stderr))
			}
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"branch":     branch,
				"pushed":     true,
				"removed":    cwd,
				"main_path":  mainPath,
				"committed":  hasChanges,
			})
			fmt.Println(string(data))
		} else {
			if hasChanges {
				ui.Step(true, "Committed changes")
			}
			ui.Step(true, fmt.Sprintf("Pushed branch %s", branch))
			ui.Step(true, fmt.Sprintf("Removed worktree %s", cwd))
			ui.Success("Worktree finished")
			ui.Hint(fmt.Sprintf("cd %s", mainPath))
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
	gitWorktreeCmd.AddCommand(gitWorktreeFinishCmd)
}
