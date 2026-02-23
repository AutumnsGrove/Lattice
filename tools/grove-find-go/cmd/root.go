package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

var (
	flagRoot          string
	flagAgent         bool
	flagJSON          bool
	flagVerbose       bool
	flagNoPager       bool
	flagPageThreshold int
)

const version = "0.1.0"

var rootCmd = &cobra.Command{
	Use:   "gf",
	Short: "Grove Find — fast codebase search for agents and humans",
	Long: `gf is a codebase search tool optimized for AI agents.
It wraps ripgrep, fd, git, and gh with context-enriched commands
that reduce agent round-trips by ~50%.`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		config.Init(flagRoot, flagAgent, flagJSON, flagVerbose, flagNoPager, flagPageThreshold)
	},
	SilenceUsage:  true,
	SilenceErrors: true,
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&flagRoot, "root", "r", "", "Project root override (env: GROVE_ROOT)")
	rootCmd.PersistentFlags().BoolVarP(&flagAgent, "agent", "a", false, "Agent mode: no colors/emoji/box-drawing (env: GF_AGENT)")
	rootCmd.PersistentFlags().BoolVarP(&flagJSON, "json", "j", false, "JSON output for scripting")
	rootCmd.PersistentFlags().BoolVarP(&flagVerbose, "verbose", "v", false, "Verbose output")
	rootCmd.PersistentFlags().BoolVar(&flagNoPager, "no-pager", false, "Disable Bubble Tea paginator (dump full output)")
	rootCmd.PersistentFlags().IntVar(&flagPageThreshold, "page-threshold", 50, "Lines before paginator activates")

	rootCmd.AddCommand(versionCmd)

	// Search commands
	rootCmd.AddCommand(searchCmd)
	rootCmd.AddCommand(classCmd)
	rootCmd.AddCommand(funcCmd)
	rootCmd.AddCommand(usageCmd)
	rootCmd.AddCommand(importsCmd)

	// File type commands
	rootCmd.AddCommand(svelteCmd)
	rootCmd.AddCommand(tsCmd)
	rootCmd.AddCommand(jsCmd)
	rootCmd.AddCommand(cssCmd)
	rootCmd.AddCommand(mdCmd)
	rootCmd.AddCommand(jsonCmd)
	rootCmd.AddCommand(tomlCmd)
	rootCmd.AddCommand(yamlCmd)
	rootCmd.AddCommand(htmlCmd)
	rootCmd.AddCommand(shellCmd)
	rootCmd.AddCommand(testCmd)
	rootCmd.AddCommand(configCmd)

	// Git top-level shortcuts
	rootCmd.AddCommand(recentCmd)
	rootCmd.AddCommand(changedCmd)

	// Git subcommand group
	rootCmd.AddCommand(gitCmd)

	// Quality commands
	rootCmd.AddCommand(todoCmd)
	rootCmd.AddCommand(logCmd)
	rootCmd.AddCommand(envCmd)
	rootCmd.AddCommand(engineCmd)

	// Project commands
	rootCmd.AddCommand(statsCmd)
	rootCmd.AddCommand(briefingCmd)
	rootCmd.AddCommand(depsCmd)
	rootCmd.AddCommand(configDiffCmd)

	// Domain commands
	rootCmd.AddCommand(routesCmd)
	rootCmd.AddCommand(dbCmd)
	rootCmd.AddCommand(glassCmd)
	rootCmd.AddCommand(storeCmd)
	rootCmd.AddCommand(typeCmd)
	rootCmd.AddCommand(exportCmd)
	rootCmd.AddCommand(authCmd)

	// Infrastructure commands
	rootCmd.AddCommand(largeCmd)
	rootCmd.AddCommand(orphanedCmd)
	rootCmd.AddCommand(migrationsCmd)
	rootCmd.AddCommand(flagsCmd)
	rootCmd.AddCommand(workersCmd)
	rootCmd.AddCommand(emailsCmd)

	// Impact analysis commands
	rootCmd.AddCommand(impactCmd)
	rootCmd.AddCommand(testForCmd)
	rootCmd.AddCommand(diffSummaryCmd)

	// GitHub subcommand group
	rootCmd.AddCommand(githubCmd)

	// Cloudflare subcommand group
	rootCmd.AddCommand(cfCmd)
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("gf version %s (go)\n", version)
	},
}

// Execute runs the root command.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
