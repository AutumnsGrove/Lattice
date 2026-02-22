package cmd

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// knownDurableObjects defines the known DO bindings for the grove ecosystem.
var knownDurableObjects = []struct {
	Binding     string
	Class       string
	Description string
}{
	{"TENANT_SESSIONS", "TenantSession", "Per-tenant session management"},
	{"RATE_LIMITER", "RateLimiter", "Distributed rate limiting"},
	{"REALTIME_ROOMS", "RealtimeRoom", "WebSocket room coordination"},
}

// doCmd is the parent command for Durable Object operations.
var doCmd = &cobra.Command{
	Use:   "do",
	Short: "Durable Object operations",
	Long:  "Durable Object operations — informational commands based on known bindings.",
}

// --- do list ---

var doListCmd = &cobra.Command{
	Use:   "list",
	Short: "List Durable Object namespaces",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		worker, _ := cmd.Flags().GetString("worker")

		if cfg.JSONMode {
			type doInfo struct {
				Name        string `json:"name"`
				Class       string `json:"class"`
				Description string `json:"description"`
			}
			var items []doInfo
			for _, d := range knownDurableObjects {
				items = append(items, doInfo{
					Name: d.Binding, Class: d.Class, Description: d.Description,
				})
			}
			result := map[string]interface{}{
				"worker":     worker,
				"namespaces": items,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Durable Objects (%s)", worker))
		for _, d := range knownDurableObjects {
			ui.PrintKeyValue(
				fmt.Sprintf("  %-20s", d.Binding),
				fmt.Sprintf("%-20s %s", d.Class, d.Description),
			)
		}
		fmt.Println()
		ui.Muted("  DO list is based on known bindings. Check wrangler.toml for definitive list.")

		return nil
	},
}

// --- do info ---

var doInfoCmd = &cobra.Command{
	Use:   "info <namespace>",
	Short: "Show Durable Object namespace info",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		namespace := args[0]
		worker, _ := cmd.Flags().GetString("worker")

		dashURL := "https://dash.cloudflare.com/?to=/:account/workers/durable-objects"

		if cfg.JSONMode {
			result := map[string]interface{}{
				"namespace":     namespace,
				"worker":        worker,
				"note":          "Durable Object details available via Cloudflare dashboard",
				"dashboard_url": dashURL,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Durable Object: %s", namespace))
		ui.PrintKeyValue("  Worker", worker)
		ui.PrintKeyValue("  Dashboard", dashURL)
		ui.Muted("  Detailed DO inspection requires the Cloudflare dashboard")

		return nil
	},
}

// --- do alarm ---

var doAlarmCmd = &cobra.Command{
	Use:   "alarm <namespace> <instance_id>",
	Short: "Inspect Durable Object alarms",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		namespace := args[0]
		instanceID := args[1]

		dashURL := "https://dash.cloudflare.com/?to=/:account/workers/durable-objects"

		if cfg.JSONMode {
			result := map[string]interface{}{
				"namespace":   namespace,
				"instance_id": instanceID,
				"error":       "Alarm inspection requires Cloudflare API",
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("DO Alarm: %s / %s", namespace, instanceID))
		ui.Warning("Alarm inspection requires Cloudflare API access")
		ui.Info(fmt.Sprintf("View in dashboard: %s", dashURL))

		return nil
	},
}

func init() {
	rootCmd.AddCommand(doCmd)

	// do list
	doListCmd.Flags().StringP("worker", "w", "grove-durable-objects", "Worker name")
	doCmd.AddCommand(doListCmd)

	// do info
	doInfoCmd.Flags().StringP("worker", "w", "grove-durable-objects", "Worker name")
	doCmd.AddCommand(doInfoCmd)

	// do alarm
	doAlarmCmd.Flags().StringP("worker", "w", "grove-engine", "Worker name")
	doCmd.AddCommand(doAlarmCmd)
}
