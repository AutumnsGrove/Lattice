package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/historydb"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// Version, CommitHash, and BuildTime are set via ldflags at build time.
var Version = "dev"
var CommitHash = ""
var BuildTime = ""

// cmdStartTime records when the command began executing.
var cmdStartTime time.Time

var (
	flagWrite       bool
	flagForce       bool
	flagJSON        bool
	flagAgent       bool
	flagVerbose     bool
	flagNoCloud     bool
	flagInteractive bool
)

var rootCmd = &cobra.Command{
	Use:   "gw",
	Short: "Grove Wrap — tend the grove with safety and warmth",
	Long: `gw is the CLI that tends the grove. It wraps git, GitHub, Wrangler,
and the dev toolchain behind a safety-tiered interface.

Every tool in the grove was shaped by fire and patience.`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		cmdStartTime = time.Now()
		config.Init(flagWrite, flagForce, flagJSON, flagAgent, flagVerbose, flagNoCloud, flagInteractive)
		ui.SetVerbose(flagVerbose)
		cfg := config.Get()
		ui.SetPlain(!cfg.IsHumanMode())

		// Detect alias invocation (grove, mycel, mycelium → gw)
		if len(os.Args) > 0 {
			invoked := filepath.Base(os.Args[0])
			switch invoked {
			case "grove", "mycel", "mycelium":
				cmd.Root().Use = invoked
			}
		}
	},
	PersistentPostRun: func(cmd *cobra.Command, args []string) {
		// Record command in history (best-effort, never fail the command)
		db, err := historydb.Open()
		if err != nil {
			return
		}
		cmdName := cmd.CommandPath()
		cmdArgs := strings.Join(args, " ")
		isWrite := flagWrite
		durationMS := time.Since(cmdStartTime).Milliseconds()
		// Exit code 0 since PersistentPostRun only runs on success
		_ = db.RecordCommand(cmdName, cmdArgs, isWrite, 0, durationMS)
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
	rootCmd.PersistentFlags().BoolVar(&flagNoCloud, "no-cloud", false, "Skip cloud/wrangler calls (faster, offline-safe)")
	rootCmd.PersistentFlags().BoolVarP(&flagInteractive, "interactive", "i", true, "Interactive TUI mode (auto-disabled for --agent/--json)")

	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(doctorCmd)

	setupCozyHelp()
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version",
	Run: func(cmd *cobra.Command, args []string) {
		cfg := config.Get()
		if cfg.JSONMode {
			fmt.Printf(`{"version":"%s","commit":"%s","built":"%s","runtime":"go"}`+"\n",
				Version, CommitHash, BuildTime)
			return
		}
		pairs := [][2]string{
			{"version", Version},
			{"runtime", "go"},
		}
		if CommitHash != "" {
			pairs = append(pairs, [2]string{"commit", CommitHash})
		}
		if BuildTime != "" {
			pairs = append(pairs, [2]string{"built", BuildTime})
		}
		fmt.Print(ui.RenderInfoPanel("gw", pairs))
	},
}

// Execute runs the root command.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
