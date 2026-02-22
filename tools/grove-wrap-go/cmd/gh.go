package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// ghCmd is the parent command for all GitHub operations.
var ghCmd = &cobra.Command{
	Use:   "gh",
	Short: "GitHub operations with safety guards",
	Long:  "GitHub operations wrapped with Grove's safety-tiered interface.",
}

// ghHelpCategories defines the categorized help for gw gh.
var ghHelpCategories = []ui.HelpCategory{
	{
		Title: "Core",
		Icon:  "📋",
		Style: lipglossStyle(ui.RiverCyan),
		Commands: []ui.HelpCommand{
			{Name: "pr", Desc: "Pull request operations"},
			{Name: "issue", Desc: "Issue operations"},
		},
	},
	{
		Title: "CI/CD",
		Icon:  "⚡",
		Style: lipglossStyle(ui.LeafYellow),
		Commands: []ui.HelpCommand{
			{Name: "run", Desc: "Workflow run operations"},
		},
	},
	{
		Title: "Management",
		Icon:  "🔧",
		Style: lipglossStyle(ui.BarkBrown),
		Commands: []ui.HelpCommand{
			{Name: "api", Desc: "Raw GitHub API requests"},
			{Name: "rate-limit", Desc: "Check API rate limit status"},
		},
	},
}

func init() {
	rootCmd.AddCommand(ghCmd)

	ghCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp(
			"gw gh",
			"GitHub operations with safety guards",
			ghHelpCategories,
			true,
		)
		fmt.Print(output)
	})
}
