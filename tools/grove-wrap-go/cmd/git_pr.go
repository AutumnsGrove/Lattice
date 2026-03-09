package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// gitPrCmd aliases gw gh pr under the git namespace so that PR operations
// are reachable via both `gw gh pr` and `gw git pr`.
//
// Since Cobra reparents commands on AddCommand (a command can only have one
// parent), we use DisableFlagParsing to capture all args, then re-dispatch
// through the root command as `gw gh pr <args...>`. This preserves global
// flag parsing (--write, --force, etc.) and all subcommand behavior.
var gitPrCmd = &cobra.Command{
	Use:                "pr [subcommand]",
	Short:              "Pull request operations (alias for gw gh pr)",
	Long:               "Pull request operations with safety-tiered access.\nThis is an alias for `gw gh pr` — all subcommands are identical.",
	DisableFlagParsing: true,
	SilenceUsage:       true,
	SilenceErrors:      true,
	RunE: func(cmd *cobra.Command, rawArgs []string) error {
		// Check for help flag or no args — show alias help
		if len(rawArgs) == 0 {
			cmd.Help()
			return nil
		}
		for _, a := range rawArgs {
			if a == "--help" || a == "-h" {
				cmd.Help()
				return nil
			}
		}

		// Re-dispatch as `gw gh pr <rawArgs...>` through the root command.
		// This re-parses global flags (--write, --force, etc.) and routes
		// to the correct prCmd subcommand with full flag support.
		newArgs := make([]string, 0, 2+len(rawArgs))
		newArgs = append(newArgs, "gh", "pr")
		newArgs = append(newArgs, rawArgs...)
		rootCmd.SetArgs(newArgs)
		return rootCmd.Execute()
	},
}

func init() {
	gitCmd.AddCommand(gitPrCmd)

	gitPrCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp("gw git pr", "pull request operations (alias for gw gh pr)", prHelpCategories, true)
		fmt.Print(output)
	})
}
