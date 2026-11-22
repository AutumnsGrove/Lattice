package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// rootHelpCategories defines the top-level command categories for gw --help.
var rootHelpCategories = []ui.HelpCategory{
	{
		Title: "Worktree",
		Icon:  "🌿",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "git worktree create", Desc: "Create a worktree for an issue"},
			{Name: "git worktree finish", Desc: "Commit, push, merge, and remove worktree"},
		},
	},
	{
		Title: "GitHub",
		Icon:  "🐙",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "gh issue", Desc: "List, view, create, and browse issues"},
		},
	},
	{
		Title: "Infrastructure",
		Icon:  "☁️",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "secret", Desc: "Encrypted secrets vault"},
			{Name: "warden", Desc: "Grove Warden agent/credential management"},
			{Name: "publish", Desc: "npm/GitHub package publishing"},
		},
	},
	{
		Title: "Integrations",
		Icon:  "\U0001f4e3",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "social", Desc: "Broadcast via Zephyr"},
			{Name: "todo", Desc: "Todoist task management"},
		},
	},
	{
		Title: "Tenants",
		Icon:  "🌳",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "tenant list", Desc: "Tenants with plan, activity and post counts"},
			{Name: "tenant show", Desc: "Identity, content, storage and auth for one tenant"},
			{Name: "tenant suspend", Desc: "Take a tenant offline (reversible)"},
			{Name: "tenant resume", Desc: "Put a suspended tenant back online"},
		},
	},
	{
		Title: "Dev",
		Icon:  "🔧",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "dev", Desc: "Local development stack"},
			{Name: "update", Desc: "Self-update from local source"},
			{Name: "version", Desc: "Print version"},
		},
	},
}

// setupCozyHelp replaces the root command's default help function
// with the cozy categorized help renderer.
func setupCozyHelp() {
	rootCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		// Only use cozy help for the root command
		if cmd != rootCmd {
			cmd.Root().SetHelpFunc(nil)
			cmd.Help()
			return
		}

		output := ui.RenderCozyHelp(
			"gw",
			"tend the grove with safety and warmth",
			rootHelpCategories,
			true,
		)
		fmt.Print(output)
	})
}
