package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// glimpseCmd wraps the Glimpse visual verification tool.
// Delegates to `uv run --project tools/glimpse glimpse` with automatic
// agent/json flag forwarding and sensible defaults (--auto, --logs).
var glimpseCmd = &cobra.Command{
	Use:   "glimpse [subcommand] [args...]",
	Short: "Visual verification — see what you built",
	Long: `Glimpse captures screenshots of Grove pages for visual verification.

This is a thin wrapper around the Glimpse Python tool. It automatically
sets --agent mode when gw is in agent mode, enables --auto server start
and --logs console capture by default, and removes the need to remember
the uv run prefix.

Examples:
  gw glimpse capture http://localhost:5173/?subdomain=midnight-bloom
  gw glimpse --app plant capture http://localhost:5173/
  gw glimpse watch http://localhost:5173/?subdomain=midnight-bloom
  gw glimpse seed --profile blog --yes
  gw glimpse status
  gw glimpse matrix http://localhost:5173/?subdomain=midnight-bloom`,
	DisableFlagParsing: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		// Find grove root for --project path
		groveRoot, err := findGroveRootForGlimpse()
		if err != nil {
			return fmt.Errorf("cannot find grove root: %w", err)
		}
		projectPath := groveRoot + "/tools/glimpse"

		// Build the uv command
		uvArgs := []string{"run", "--project", projectPath, "glimpse"}

		// Auto-inject agent/json mode
		if cfg.AgentMode {
			uvArgs = append(uvArgs, "--agent")
		} else if cfg.JSONMode {
			uvArgs = append(uvArgs, "--json")
		}

		// Auto-inject --auto and --logs for capture/watch/browse/matrix
		// (only if there are subcommand args to inspect)
		if len(args) > 0 {
			subcmd := args[0]
			if subcmd == "capture" || subcmd == "watch" || subcmd == "browse" || subcmd == "matrix" {
				uvArgs = append(uvArgs, "--auto", "--logs")
			}
		}

		// Pass through all remaining args
		uvArgs = append(uvArgs, args...)

		// Run with streaming (passthrough stdout/stderr)
		exitCode, err := exec.RunStreaming("uv", uvArgs...)
		if err != nil {
			return err
		}
		if exitCode != 0 {
			os.Exit(exitCode)
		}
		return nil
	},
}

var glimpseHelpCategories = []ui.HelpCategory{
	{
		Title: "Capture (Always Safe)",
		Icon:  "📸",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "capture", Desc: "Single screenshot with theme control"},
			{Name: "matrix", Desc: "All season × theme combinations"},
			{Name: "browse", Desc: "Interactive steps with screenshots"},
			{Name: "batch", Desc: "Multiple captures from YAML config"},
			{Name: "watch", Desc: "Keep browser warm for rapid re-captures"},
		},
	},
	{
		Title: "Analysis (Always Safe)",
		Icon:  "🔍",
		Style: lipglossStyle(ui.SunsetAmber),
		Commands: []ui.HelpCommand{
			{Name: "diff", Desc: "Visual regression between two screenshots"},
			{Name: "detect", Desc: "AI-powered element detection"},
			{Name: "status", Desc: "Check readiness (browser, server, DB)"},
		},
	},
	{
		Title: "Setup (Always Safe)",
		Icon:  "🌱",
		Style: lipglossStyle(ui.ForestGreen),
		Commands: []ui.HelpCommand{
			{Name: "seed", Desc: "Bootstrap local D1 with test data"},
			{Name: "install", Desc: "Install Playwright's Chromium"},
			{Name: "stop", Desc: "Stop auto-started dev server"},
		},
	},
}

func init() {
	rootCmd.AddCommand(glimpseCmd)

	glimpseCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp(
			"gw glimpse",
			"Visual verification — see what you built",
			glimpseHelpCategories,
			true,
		)
		fmt.Print(output)
	})
}

// findGroveRootForGlimpse walks up from CWD looking for pnpm-workspace.yaml.
func findGroveRootForGlimpse() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "pnpm-workspace.yaml")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("pnpm-workspace.yaml not found in any parent directory")
		}
		dir = parent
	}
}
