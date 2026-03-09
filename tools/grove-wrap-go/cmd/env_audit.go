package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var envAuditCmd = &cobra.Command{
	Use:   "env-audit",
	Short: "Check required environment variables",
	Long:  "Audit required and optional environment variables for Grove Wrap and Cloudflare.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		type envVar struct {
			Key      string `json:"key"`
			Set      bool   `json:"set"`
			Required bool   `json:"required"`
			Note     string `json:"note,omitempty"`
		}

		// GitHub token is satisfied by either GH_TOKEN or GITHUB_TOKEN
		ghToken := os.Getenv("GITHUB_TOKEN") != "" || os.Getenv("GH_TOKEN") != ""
		ghKey := "GITHUB_TOKEN / GH_TOKEN"

		vars := []envVar{
			{
				Key:      "CF_API_TOKEN",
				Set:      os.Getenv("CF_API_TOKEN") != "",
				Required: true,
				Note:     "Cloudflare API token",
			},
			{
				Key:      "CF_ZONE_ID",
				Set:      os.Getenv("CF_ZONE_ID") != "",
				Required: true,
				Note:     "Cloudflare zone ID",
			},
			{
				Key:      "GW_VAULT_PASSWORD",
				Set:      os.Getenv("GW_VAULT_PASSWORD") != "",
				Required: false,
				Note:     "Vault password (optional)",
			},
			{
				Key:      "WARDEN_ADMIN_KEY",
				Set:      os.Getenv("WARDEN_ADMIN_KEY") != "",
				Required: false,
				Note:     "Warden admin key (optional)",
			},
			{
				Key:      ghKey,
				Set:      ghToken,
				Required: true,
				Note:     "GitHub token",
			},
		}

		setCount := 0
		unsetCount := 0
		for _, v := range vars {
			if v.Set {
				setCount++
			} else {
				unsetCount++
			}
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"set":   setCount,
				"unset": unsetCount,
				"vars":  vars,
			})
		}

		fmt.Println(ui.TitleStyle.Render("gw env-audit"))
		fmt.Println()

		for _, v := range vars {
			tag := ""
			if !v.Required {
				tag = " (optional)"
			}
			label := fmt.Sprintf("%-30s  %s%s", v.Key, v.Note, tag)
			ui.Step(v.Set, label)
		}

		fmt.Println()
		ui.PrintKeyValue("Set:  ", fmt.Sprintf("%d", setCount))
		ui.PrintKeyValue("Unset:", fmt.Sprintf("%d", unsetCount))
		fmt.Println()

		if unsetCount == 0 {
			ui.Success("All environment variables are set")
		} else {
			requiredUnset := 0
			for _, v := range vars {
				if v.Required && !v.Set {
					requiredUnset++
				}
			}
			if requiredUnset > 0 {
				ui.Warning(fmt.Sprintf("%d required variable(s) missing", requiredUnset))
			} else {
				ui.Muted(fmt.Sprintf("%d optional variable(s) unset", unsetCount))
			}
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(envAuditCmd)
}
