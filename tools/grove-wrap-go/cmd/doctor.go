package cmd

import (
	"fmt"
	"runtime"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Check gw dependencies and environment",
	Long:  "Run diagnostics to verify that gw's dependencies and configuration are healthy.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		fmt.Println(ui.TitleStyle.Render("gw doctor"))
		fmt.Println()

		// Version info
		fmt.Printf("  gw version:  %s (go)\n", Version)
		fmt.Printf("  go version:  %s\n", runtime.Version())
		fmt.Printf("  platform:    %s/%s\n", runtime.GOOS, runtime.GOARCH)
		fmt.Printf("  grove root:  %s\n", cfg.GroveRoot)
		fmt.Printf("  config file: %s\n", config.ConfigPath())
		fmt.Printf("  agent mode:  %v\n", cfg.AgentMode)
		fmt.Println()

		// Check dependencies
		fmt.Println(ui.TitleStyle.Render("Dependencies"))
		fmt.Println()

		allOK := true

		// git
		if result, err := gwexec.Git("--version"); err == nil && result.OK() {
			ui.Step(true, fmt.Sprintf("git: %s", firstLine(result.Stdout)))
		} else {
			ui.Step(false, "git: not found")
			allOK = false
		}

		// gh
		if result, err := gwexec.GH("--version"); err == nil && result.OK() {
			ui.Step(true, fmt.Sprintf("gh: %s", firstLine(result.Stdout)))
		} else {
			ui.Step(false, "gh: not found")
			allOK = false
		}

		// wrangler
		if gwexec.IsWranglerAvailable() {
			ui.Step(true, "wrangler: available")
		} else {
			ui.Step(false, "wrangler: not found")
		}

		// git repo
		if gwexec.IsGitRepo() {
			branch, _ := gwexec.CurrentBranch()
			ui.Step(true, fmt.Sprintf("git repo: yes (branch: %s)", branch))
		} else {
			ui.Step(false, "git repo: not inside a git repository")
		}

		fmt.Println()

		if allOK {
			ui.Success("All checks passed")
		} else {
			ui.Warning("Some checks failed — gw may not work fully")
		}

		return nil
	},
}

func firstLine(s string) string {
	for i, c := range s {
		if c == '\n' {
			return s[:i]
		}
	}
	return s
}
