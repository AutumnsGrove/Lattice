package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// rootHelpCategories defines the top-level command categories for gw --help.
var rootHelpCategories = []ui.HelpCategory{
	{
		Title: "Git",
		Icon:  "📖",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "git", Desc: "Git operations with safety tiers"},
		},
	},
	{
		Title: "GitHub",
		Icon:  "🐙",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "gh", Desc: "GitHub CLI operations (PRs, issues, runs)"},
		},
	},
	{
		Title: "Dev Tools",
		Icon:  "🔧",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "dev", Desc: "Development server, testing, building"},
		},
	},
	{
		Title: "Infrastructure",
		Icon:  "☁️",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "d1", Desc: "D1 database operations"},
			{Name: "kv", Desc: "KV storage operations"},
			{Name: "r2", Desc: "R2 object storage"},
			{Name: "deploy", Desc: "Cloudflare deployment"},
			{Name: "logs", Desc: "Worker log streaming"},
			{Name: "flag", Desc: "Feature flag management"},
			{Name: "backup", Desc: "D1 database backups"},
			{Name: "do", Desc: "Durable Object operations"},
			{Name: "email", Desc: "Email routing operations"},
		},
	},
	{
		Title: "Status & Info",
		Icon:  "ℹ️",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "status", Desc: "Config and account status"},
			{Name: "health", Desc: "Health checks"},
			{Name: "doctor", Desc: "Check dependencies and environment"},
			{Name: "whoami", Desc: "Current context display"},
			{Name: "context", Desc: "Session context"},
			{Name: "packages", Desc: "Monorepo package detection"},
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
