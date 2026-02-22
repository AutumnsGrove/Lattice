package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// logsCmd streams worker logs from Cloudflare.
var logsCmd = &cobra.Command{
	Use:   "logs",
	Short: "Stream worker logs",
	RunE: func(cmd *cobra.Command, args []string) error {
		worker, _ := cmd.Flags().GetString("worker")
		if err := validateCFName(worker, "worker"); err != nil {
			return err
		}
		format, _ := cmd.Flags().GetString("format")
		if format != "" && format != "json" && format != "pretty" {
			return fmt.Errorf("format must be 'json' or 'pretty', got: %q", format)
		}
		status, _ := cmd.Flags().GetString("status")
		if status != "" && status != "ok" && status != "error" && status != "canceled" {
			return fmt.Errorf("status must be 'ok', 'error', or 'canceled', got: %q", status)
		}
		method, _ := cmd.Flags().GetString("method")
		if method != "" {
			if err := validateCFName(method, "method"); err != nil {
				return err
			}
		}
		search, _ := cmd.Flags().GetString("search")
		if len(search) > 512 {
			return fmt.Errorf("search string too long (max 512 chars)")
		}
		samplingRate, _ := cmd.Flags().GetFloat64("sampling-rate")
		if samplingRate < 0 || samplingRate > 1.0 {
			return fmt.Errorf("sampling-rate must be between 0.0 and 1.0, got: %g", samplingRate)
		}
		ip, _ := cmd.Flags().GetString("ip")

		wranglerArgs := []string{"tail", worker}

		if format != "" {
			wranglerArgs = append(wranglerArgs, fmt.Sprintf("--format=%s", format))
		}
		if status != "" {
			wranglerArgs = append(wranglerArgs, "--status", status)
		}
		if method != "" {
			wranglerArgs = append(wranglerArgs, "--method", method)
		}
		if search != "" {
			wranglerArgs = append(wranglerArgs, "--search", search)
		}
		if samplingRate > 0 {
			wranglerArgs = append(wranglerArgs, "--sampling-rate", fmt.Sprintf("%g", samplingRate))
		}
		if ip != "" {
			wranglerArgs = append(wranglerArgs, "--ip-address", ip)
		}

		ui.Muted(fmt.Sprintf("Streaming logs for %s... (Ctrl+C to stop)", worker))

		// Use interactive mode — stream stdout/stderr directly
		result, err := exec.WranglerInteractive(wranglerArgs...)
		if err != nil {
			// Graceful exit on interrupt
			return nil
		}
		if result != nil && !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(logsCmd)

	logsCmd.Flags().StringP("worker", "w", "grove-lattice", "Worker name")
	logsCmd.Flags().StringP("format", "f", "pretty", "Output format (json, pretty)")
	logsCmd.Flags().StringP("status", "s", "", "Filter by status (ok, error, canceled)")
	logsCmd.Flags().StringP("method", "m", "", "Filter by HTTP method")
	logsCmd.Flags().String("search", "", "Filter by message content")
	logsCmd.Flags().Float64("sampling-rate", 0, "Sampling rate (0.0 to 1.0)")
	logsCmd.Flags().String("ip", "", "Filter by client IP")
}
