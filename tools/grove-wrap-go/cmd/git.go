package cmd

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// lipglossStyle creates a lipgloss style with the given foreground color.
func lipglossStyle(color lipgloss.Color) lipgloss.Style {
	return lipgloss.NewStyle().Foreground(color)
}

// gitCmd is the parent command for all git operations.
var gitCmd = &cobra.Command{
	Use:   "git",
	Short: "Git operations with safety tiers",
	Long:  "Git operations wrapped with Grove's 4-tier safety system.",
}

// gitHelpCategories defines the categorized help for gw git.
var gitHelpCategories = []ui.HelpCategory{
	{
		Title: "Read (Always Safe)",
		Icon:  "📖",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "status", Desc: "Show working tree status"},
			{Name: "log", Desc: "Show commit history"},
			{Name: "diff", Desc: "Show changes between commits or working tree"},
			{Name: "show", Desc: "Show commit details and diff"},
			{Name: "blame", Desc: "Show who changed each line of a file"},
			{Name: "fetch", Desc: "Download objects and refs from remote"},
			{Name: "reflog", Desc: "Show history of HEAD changes"},
			{Name: "shortlog", Desc: "Summarize commit activity by author"},
		},
	},
	{
		Title: "Write (Require --write)",
		Icon:  "✏️",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "add", Desc: "Stage files for commit"},
			{Name: "commit", Desc: "Record changes to the repository"},
			{Name: "push", Desc: "Upload local commits to remote"},
			{Name: "pull", Desc: "Fetch and integrate remote changes"},
			{Name: "branch", Desc: "Create or delete branches"},
			{Name: "switch", Desc: "Switch to a different branch"},
			{Name: "checkout", Desc: "Switch branches or restore files"},
			{Name: "stash", Desc: "Stash working directory changes"},
			{Name: "unstage", Desc: "Remove files from staging area"},
			{Name: "restore", Desc: "Restore working tree files"},
			{Name: "cherry-pick", Desc: "Apply a commit from another branch"},
		},
	},
	{
		Title: "Dangerous (--write --force)",
		Icon:  "🔥",
		Style: ui.DangerStyle,
		Commands: []ui.HelpCommand{
			{Name: "merge", Desc: "Merge branches together"},
			{Name: "force-push", Desc: "Force push to remote (overwrites history)"},
			{Name: "reset", Desc: "Reset current HEAD to a state"},
			{Name: "rebase", Desc: "Reapply commits on top of another base"},
			{Name: "clean", Desc: "Remove untracked files"},
		},
	},
	{
		Title: "Shortcuts",
		Icon:  "⚡",
		Style: ui.ShortcutStyle,
		Commands: []ui.HelpCommand{
			{Name: "save", Desc: "Stage all, commit, push in one step"},
			{Name: "wip", Desc: "Quick work-in-progress commit"},
			{Name: "fast", Desc: "Fast-forward merge from remote"},
			{Name: "sync", Desc: "Pull and push to sync with remote"},
			{Name: "undo", Desc: "Undo last commit (keeps changes)"},
			{Name: "amend", Desc: "Amend the last commit"},
		},
	},
	{
		Title: "Workflows",
		Icon:  "🚀",
		Style: lipglossStyle(ui.BlossomPink),
		Commands: []ui.HelpCommand{
			{Name: "ship", Desc: "Format, check, commit, push — all at once"},
			{Name: "prep", Desc: "Pre-commit checks (lint, format, test)"},
			{Name: "pr-prep", Desc: "PR readiness report"},
		},
	},
	{
		Title: "Management",
		Icon:  "🔧",
		Style: lipglossStyle(ui.BarkBrown),
		Commands: []ui.HelpCommand{
			{Name: "worktree", Desc: "Manage multiple working trees"},
			{Name: "remote", Desc: "Manage remote repositories"},
			{Name: "tag", Desc: "Create and manage tags"},
			{Name: "config", Desc: "Get or set git configuration"},
		},
	},
}

func init() {
	// Register git subcommand on root
	rootCmd.AddCommand(gitCmd)

	// Set cozy help for the git group
	gitCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp(
			"gw git",
			"Git operations with safety tiers",
			gitHelpCategories,
			true,
		)
		fmt.Print(output)
	})
}
