package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// Version is set via ldflags at build time.
var Version = "dev"

var (
	flagWrite   bool
	flagForce   bool
	flagJSON    bool
	flagAgent   bool
	flagVerbose bool
)

var rootCmd = &cobra.Command{
	Use:   "gw",
	Short: "Grove Wrap — tend the grove with safety and warmth",
	Long: `gw is the CLI that tends the grove. It wraps git, GitHub, Wrangler,
and the dev toolchain behind a safety-tiered interface.

Every tool in the grove was shaped by fire and patience.`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		config.Init(flagWrite, flagForce, flagJSON, flagAgent, flagVerbose)
		ui.SetVerbose(flagVerbose)
		cfg := config.Get()
		ui.SetPlain(!cfg.IsHumanMode())
	},
	SilenceUsage:  true,
	SilenceErrors: true,
}

func init() {
	rootCmd.PersistentFlags().BoolVar(&flagWrite, "write", false, "Allow write operations")
	rootCmd.PersistentFlags().BoolVar(&flagForce, "force", false, "Allow dangerous operations (requires --write)")
	rootCmd.PersistentFlags().BoolVarP(&flagJSON, "json", "j", false, "JSON output for scripting")
	rootCmd.PersistentFlags().BoolVar(&flagAgent, "agent", false, "Agent mode: stricter safety, no colors")
	rootCmd.PersistentFlags().BoolVarP(&flagVerbose, "verbose", "v", false, "Verbose output")

	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(doctorCmd)

	setupCozyHelp()
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("gw version %s (go)\n", Version)
	},
}

// Execute runs the root command.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
