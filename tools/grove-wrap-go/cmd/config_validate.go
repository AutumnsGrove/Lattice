package cmd

import (
	"fmt"
	"os"

	"github.com/BurntSushi/toml"
	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var configValidateCmd = &cobra.Command{
	Use:   "config-validate",
	Short: "Validate ~/.grove/gw.toml structure",
	Long:  "Parse and validate the gw configuration file, reporting each check as pass or fail.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		configPath := config.ConfigPath()

		type check struct {
			Name   string `json:"name"`
			Passed bool   `json:"passed"`
			Detail string `json:"detail,omitempty"`
		}

		var checks []check
		allValid := true

		addCheck := func(name string, passed bool, detail string) {
			checks = append(checks, check{name, passed, detail})
			if !passed {
				allValid = false
			}
		}

		// Check 1: file exists
		_, statErr := os.Stat(configPath)
		fileExists := statErr == nil
		if fileExists {
			addCheck("file_exists", true, configPath)
		} else {
			addCheck("file_exists", false, "not found: "+configPath)
		}

		// Check 2: valid TOML (only if file exists)
		var raw map[string]any
		if fileExists {
			_, tomlErr := toml.DecodeFile(configPath, &raw)
			if tomlErr != nil {
				addCheck("valid_toml", false, tomlErr.Error())
			} else {
				addCheck("valid_toml", true, "")
			}
		} else {
			addCheck("valid_toml", false, "skipped — file not found")
		}

		// Check 3: has databases section
		dbCount := len(cfg.Databases)
		if dbCount > 0 {
			addCheck("has_databases", true, fmt.Sprintf("%d configured", dbCount))
		} else {
			addCheck("has_databases", false, "no [databases] entries")
		}

		// Check 4: has kv_namespaces section
		kvCount := len(cfg.KVNamespaces)
		if kvCount > 0 {
			addCheck("has_kv_namespaces", true, fmt.Sprintf("%d configured", kvCount))
		} else {
			addCheck("has_kv_namespaces", false, "no [kv_namespaces] entries")
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"valid":       allValid,
				"config_path": configPath,
				"checks":      checks,
			})
		}

		fmt.Println(ui.TitleStyle.Render("gw config-validate"))
		fmt.Println()
		fmt.Printf("  %s\n", configPath)
		fmt.Println()

		for _, c := range checks {
			label := c.Name
			if c.Detail != "" {
				label = fmt.Sprintf("%-20s  %s", c.Name, c.Detail)
			}
			ui.Step(c.Passed, label)
		}

		fmt.Println()
		if allValid {
			ui.Success("Config is valid")
		} else {
			ui.Warning("Config has issues — check the items above")
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(configValidateCmd)
}
