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

		// Version info panel
		fmt.Print(ui.RenderInfoPanel("gw doctor", [][2]string{
			{"version", Version + " (go)"},
			{"go", runtime.Version()},
			{"platform", runtime.GOOS + "/" + runtime.GOARCH},
			{"grove root", cfg.GroveRoot},
			{"config", config.ConfigPath()},
			{"agent mode", fmt.Sprintf("%v", cfg.AgentMode)},
		}))
		fmt.Println()

		// Dependency checks
		allOK := true
		var steps []ui.StepItem

		// git
		if result, err := gwexec.Git("--version"); err == nil && result.OK() {
			steps = append(steps, ui.StepItem{OK: true, Label: fmt.Sprintf("git: %s", firstLine(result.Stdout))})
		} else {
			steps = append(steps, ui.StepItem{OK: false, Label: "git: not found"})
			allOK = false
		}

		// gh
		if result, err := gwexec.GH("--version"); err == nil && result.OK() {
			steps = append(steps, ui.StepItem{OK: true, Label: fmt.Sprintf("gh: %s", firstLine(result.Stdout))})
		} else {
			steps = append(steps, ui.StepItem{OK: false, Label: "gh: not found"})
			allOK = false
		}

		// wrangler
		if gwexec.IsWranglerAvailable() {
			steps = append(steps, ui.StepItem{OK: true, Label: "wrangler: available"})
		} else {
			steps = append(steps, ui.StepItem{OK: false, Label: "wrangler: not found"})
		}

		// git repo
		if gwexec.IsGitRepo() {
			branch, _ := gwexec.CurrentBranch()
			steps = append(steps, ui.StepItem{OK: true, Label: fmt.Sprintf("git repo: yes (branch: %s)", branch)})
		} else {
			steps = append(steps, ui.StepItem{OK: false, Label: "git repo: not inside a git repository"})
		}

		fmt.Print(ui.RenderStepList("Dependencies", steps))
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
