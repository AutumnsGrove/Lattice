package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// devCmd is the parent command for all dev operations.
var devCmd = &cobra.Command{
	Use:   "dev",
	Short: "Development tools with monorepo awareness",
	Long:  "Development tools for testing, building, linting, and running dev servers.",
}

// devHelpCategories defines the categorized help for gw dev.
var devHelpCategories = []ui.HelpCategory{
	{
		Title: "Quality (Always Safe)",
		Icon:  "📖",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "test", Desc: "Run tests for a package"},
			{Name: "check", Desc: "Type-check a package"},
			{Name: "lint", Desc: "Lint a package"},
			{Name: "fmt", Desc: "Format code"},
			{Name: "ci", Desc: "Run full CI pipeline"},
		},
	},
	{
		Title: "Build (Always Safe)",
		Icon:  "🔨",
		Style: lipglossStyle(ui.SunsetAmber),
		Commands: []ui.HelpCommand{
			{Name: "build", Desc: "Build a package"},
		},
	},
	{
		Title: "Server (Require --write)",
		Icon:  "✏️",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "start", Desc: "Start a dev server"},
			{Name: "stop", Desc: "Stop a dev server"},
			{Name: "restart", Desc: "Restart a dev server"},
			{Name: "logs", Desc: "View dev server logs"},
		},
	},
}

func init() {
	rootCmd.AddCommand(devCmd)

	devCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp(
			"gw dev",
			"Development tools with monorepo awareness",
			devHelpCategories,
			true,
		)
		fmt.Print(output)
	})
}
