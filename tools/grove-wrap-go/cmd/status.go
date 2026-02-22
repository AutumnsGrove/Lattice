package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Configuration and infrastructure status",
	Long:  "Show current gw configuration, Cloudflare account, databases, KV namespaces, and R2 buckets.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		// Gather Cloudflare info
		cfOut, _ := gwexec.WranglerOutput("whoami")
		cfEmail := extractCFField(cfOut, "email")
		cfAccount := extractCFField(cfOut, "account")

		// Project info
		cwd, _ := os.Getwd()
		configPath := config.ConfigPath()
		_, configErr := os.Stat(configPath)
		configExists := configErr == nil

		if cfg.JSONMode {
			// Build database list
			dbs := make([]map[string]string, 0, len(cfg.Databases))
			for alias, db := range cfg.Databases {
				dbs = append(dbs, map[string]string{
					"alias": alias,
					"name":  db.Name,
					"id":    db.ID,
				})
			}

			// Build KV list
			kvs := make([]map[string]string, 0, len(cfg.KVNamespaces))
			for alias, ns := range cfg.KVNamespaces {
				kvs = append(kvs, map[string]string{
					"alias": alias,
					"name":  ns.Name,
					"id":    ns.ID,
				})
			}

			// Build R2 list
			buckets := make([]string, 0, len(cfg.R2Buckets))
			for _, b := range cfg.R2Buckets {
				buckets = append(buckets, b.Name)
			}

			return printJSON(map[string]any{
				"cloudflare": map[string]any{
					"email":         cfEmail,
					"account":       cfAccount,
					"authenticated": cfEmail != "" || cfAccount != "",
				},
				"project_directory": cwd,
				"config_file":      configPath,
				"config_exists":    configExists,
				"databases":        dbs,
				"kv_namespaces":    kvs,
				"r2_buckets":       buckets,
			})
		}

		// Rich output
		fmt.Println(ui.TitleStyle.Render("gw status"))
		fmt.Println()

		// Cloudflare
		fmt.Println(ui.SubtitleStyle.Render("  Cloudflare"))
		if cfEmail != "" || cfAccount != "" {
			if cfEmail != "" {
				fmt.Printf("    Email:   %s\n", cfEmail)
			}
			if cfAccount != "" {
				fmt.Printf("    Account: %s\n", cfAccount)
			}
			ui.Step(true, "Authenticated")
		} else {
			ui.Step(false, "Not authenticated (run: wrangler login)")
		}

		// Config
		fmt.Println()
		fmt.Println(ui.SubtitleStyle.Render("  Configuration"))
		fmt.Printf("    File: %s\n", configPath)
		if configExists {
			ui.Step(true, "Config loaded")
		} else {
			ui.Step(false, "Config not found (using defaults)")
		}

		// Databases
		if len(cfg.Databases) > 0 {
			fmt.Println()
			headers := []string{"Alias", "Name", "ID"}
			var rows [][]string
			for alias, db := range cfg.Databases {
				id := db.ID
				if len(id) > 8 {
					id = id[:8] + "…"
				}
				rows = append(rows, []string{alias, db.Name, id})
			}
			fmt.Print(ui.RenderTable("Databases", headers, rows))
		}

		// KV Namespaces
		if len(cfg.KVNamespaces) > 0 {
			fmt.Println()
			headers := []string{"Alias", "Name", "ID"}
			var rows [][]string
			for alias, ns := range cfg.KVNamespaces {
				id := ns.ID
				if len(id) > 8 {
					id = id[:8] + "…"
				}
				rows = append(rows, []string{alias, ns.Name, id})
			}
			fmt.Print(ui.RenderTable("KV Namespaces", headers, rows))
		}

		// R2 Buckets
		if len(cfg.R2Buckets) > 0 {
			fmt.Println()
			fmt.Println(ui.SubtitleStyle.Render("  R2 Buckets"))
			for _, b := range cfg.R2Buckets {
				fmt.Printf("    %s\n", b.Name)
			}
		}

		// Project
		fmt.Println()
		fmt.Printf("  Directory: %s\n", cwd)
		fmt.Println()

		return nil
	},
}

// extractCFField delegates to extractField for Cloudflare whoami output.
func extractCFField(text, key string) string {
	return extractField(text, key)
}

func init() {
	rootCmd.AddCommand(statusCmd)
}
