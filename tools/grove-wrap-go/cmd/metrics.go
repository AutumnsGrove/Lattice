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

		fmt.Println(ui.TitleStyle.Render("gw metrics"))
		fmt.Println()

		fmt.Println(ui.SubtitleStyle.Render("  Timing"))
		fmt.Println()
		for _, t := range timings {
			label := fmt.Sprintf("%-30s", t.Name)
			ms := fmt.Sprintf("%.2f ms", t.Ms)
			ui.Step(t.OK, fmt.Sprintf("%s  %s", label, ms))
		}

		fmt.Println()
		fmt.Println(ui.SubtitleStyle.Render("  Go Runtime"))
		fmt.Println()
		ui.PrintKeyValue("GOOS:        ", runtime.GOOS)
		ui.PrintKeyValue("GOARCH:      ", runtime.GOARCH)
		ui.PrintKeyValue("NumCPU:      ", fmt.Sprintf("%d", runtime.NumCPU()))
		ui.PrintKeyValue("NumGoroutine:", fmt.Sprintf("%d", runtime.NumGoroutine()))
		ui.PrintKeyValue("Go version:  ", runtime.Version())
		fmt.Println()

		return nil
	},
}

func init() {
	rootCmd.AddCommand(metricsCmd)
}
