package cmd

import (
	"fmt"
	"runtime"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var metricsCmd = &cobra.Command{
	Use:   "metrics",
	Short: "Display performance metrics and runtime info",
	Long:  "Measure startup timing for common operations and show Go runtime information.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		type timing struct {
			Name     string  `json:"name"`
			Ms       float64 `json:"ms"`
			OK       bool    `json:"ok"`
		}

		var timings []timing

		// gw --version startup time
		t0 := time.Now()
		result, err := gwexec.Run("git", "--version")
		gwVersionMs := float64(time.Since(t0).Microseconds()) / 1000.0
		gwVersionOK := err == nil && result.OK()
		timings = append(timings, timing{"gw --version (via git)", gwVersionMs, gwVersionOK})

		// wrangler availability check
		t1 := time.Now()
		wranglerOK := gwexec.IsWranglerAvailable()
		wranglerMs := float64(time.Since(t1).Microseconds()) / 1000.0
		timings = append(timings, timing{"wrangler check", wranglerMs, wranglerOK})

		// git status timing
		t2 := time.Now()
		gitResult, gitErr := gwexec.Git("status", "--porcelain")
		gitStatusMs := float64(time.Since(t2).Microseconds()) / 1000.0
		gitStatusOK := gitErr == nil && gitResult.OK()
		timings = append(timings, timing{"git status", gitStatusMs, gitStatusOK})

		runtimeInfo := map[string]any{
			"goos":          runtime.GOOS,
			"goarch":        runtime.GOARCH,
			"num_cpu":       runtime.NumCPU(),
			"num_goroutine": runtime.NumGoroutine(),
			"go_version":    runtime.Version(),
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"timings": timings,
				"runtime": runtimeInfo,
			})
		}

		var steps []ui.StepItem
		for _, t := range timings {
			steps = append(steps, ui.StepItem{
				Label:  fmt.Sprintf("%-30s  %.2f ms", t.Name, t.Ms),
				OK: t.OK,
			})
		}
		fmt.Print(ui.RenderStepList("Timing", steps))

		runtimePairs := [][2]string{
			{"GOOS", runtime.GOOS},
			{"GOARCH", runtime.GOARCH},
			{"NumCPU", fmt.Sprintf("%d", runtime.NumCPU())},
			{"NumGoroutine", fmt.Sprintf("%d", runtime.NumGoroutine())},
			{"Go version", runtime.Version()},
		}
		fmt.Print(ui.RenderInfoPanel("Go Runtime", runtimePairs))

		return nil
	},
}

func init() {
	rootCmd.AddCommand(metricsCmd)
}
