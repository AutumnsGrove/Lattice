package cmd

import (
	"fmt"
	"os"

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
		fmt.Println(ui.TitleStyle.Render("gw health"))
		fmt.Println()

		if healthy {
			ui.Step(true, "System healthy")
		} else {
			ui.Step(false, "System has issues")
		}
		fmt.Println()

		ui.Step(checks["wrangler_installed"], "Wrangler installed")
		ui.Step(checks["wrangler_authenticated"], "Wrangler authenticated")
		ui.Step(checks["config_exists"], "Config file present")
		ui.Step(checks["databases_configured"], "Databases configured")

		if len(issues) > 0 {
			fmt.Println()
			fmt.Println(ui.SubtitleStyle.Render("  Issues"))
			for _, issue := range issues {
				fmt.Printf("    • %s\n", issue)
			}
		}

		fmt.Println()
		return nil
	},
}

func init() {
	rootCmd.AddCommand(healthCmd)
}
