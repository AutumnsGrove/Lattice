package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var healthCmd = &cobra.Command{
	Use:   "health",
	Short: "System health check",
	Long:  "Verify Grove Wrap readiness: wrangler, authentication, config, and databases.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		checks := map[string]bool{}
		var issues []string

		// Check 1: wrangler installed
		_, wranglerOK := gwexec.Which("wrangler")
		checks["wrangler_installed"] = wranglerOK
		if !wranglerOK {
			issues = append(issues, "wrangler is not installed (npm i -g wrangler)")
		}

		// Check 2: wrangler authenticated
		// TODO(follow-up): wire cfcloud.WranglerAuth() cache here so health skips the
		// 4-10s wrangler subprocess cost; for now it calls wrangler directly.
		wranglerAuth := false
		if wranglerOK {
			out, _ := gwexec.WranglerOutput("whoami")
			wranglerAuth = out != "" && extractField(out, "email") != ""
		}
		checks["wrangler_authenticated"] = wranglerAuth
		if !wranglerAuth {
			issues = append(issues, "wrangler is not authenticated (run: wrangler login)")
		}

		// Check 3: config exists
		configPath := config.ConfigPath()
		_, configErr := os.Stat(configPath)
		configExists := configErr == nil
		checks["config_exists"] = configExists
		if !configExists {
			issues = append(issues, "config file not found: "+configPath)
		}

		// Check 4: databases configured
		dbConfigured := len(cfg.Databases) > 0
		checks["databases_configured"] = dbConfigured
		if !dbConfigured {
			issues = append(issues, "no databases configured in gw.toml")
		}

		// Overall health
		healthy := wranglerOK && wranglerAuth

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"healthy": healthy,
				"checks":  checks,
				"issues":  issues,
			})
		}

		// Rich output
		steps := []ui.StepItem{
			{OK: checks["wrangler_installed"], Label: "Wrangler installed"},
			{OK: checks["wrangler_authenticated"], Label: "Wrangler authenticated"},
			{OK: checks["config_exists"], Label: "Config file present"},
			{OK: checks["databases_configured"], Label: "Databases configured"},
		}
		fmt.Print(ui.RenderStepList("gw health", steps))

		if len(issues) > 0 {
			issueText := strings.Join(issues, "\n• ")
			fmt.Print(ui.RenderWarningPanel("Issues", "• "+issueText))
		}

		fmt.Println()
		return nil
	},
}

func init() {
	rootCmd.AddCommand(healthCmd)
}
