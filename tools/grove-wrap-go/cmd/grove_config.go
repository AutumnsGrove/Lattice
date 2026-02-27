package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"

	"github.com/BurntSushi/toml"
	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

// ── gw config ───────────────────────────────────────────────────────

var groveConfigCmd = &cobra.Command{
	Use:   "config",
	Short: "Grove configuration management",
	Long:  "View and manage Grove CLI configuration (tenant, region, URLs).",
}

// ── gw config tenant ────────────────────────────────────────────────

var configTenantCmd = &cobra.Command{
	Use:   "tenant [name]",
	Short: "Get or set the active tenant",
	Long: `Without arguments, shows the current tenant.
With an argument, sets the tenant in ~/.grove/gw.toml.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		// No args = read mode
		if len(args) == 0 {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]any{
					"tenant": cfg.Grove.Tenant,
				})
				fmt.Println(string(data))
			} else if cfg.Grove.Tenant != "" {
				fmt.Println(cfg.Grove.Tenant)
			} else {
				ui.Warning("No tenant configured — run `gw config tenant <name>`")
			}
			return nil
		}

		// With args = write mode
		if err := requireCFSafety("config_tenant_set"); err != nil {
			return err
		}

		newTenant := args[0]
		if err := writeTenantToConfig(newTenant); err != nil {
			return fmt.Errorf("failed to save tenant: %w", err)
		}

		// Update in-memory config
		cfg.Grove.Tenant = newTenant

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]any{
				"tenant": newTenant,
				"saved":  true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Tenant set to %s", newTenant))
		}
		return nil
	},
}

// ── gw config show ──────────────────────────────────────────────────

var configShowCmd = &cobra.Command{
	Use:   "show",
	Short: "Show all Grove configuration",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		// Determine token source
		tokenSource := "none"
		if os.Getenv("GROVE_TOKEN") != "" {
			tokenSource = "env:GROVE_TOKEN"
		} else if v, err := vault.AutoUnlock(); err == nil {
			if v.Exists("GROVE_TOKEN") {
				tokenSource = "vault"
			}
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]any{
				"tenant":           cfg.Grove.Tenant,
				"default_region":   cfg.Grove.DefaultRegion,
				"auth_base_url":    cfg.Grove.AuthBaseURL,
				"lattice_base_url": cfg.Grove.LatticeBaseURL,
				"token_source":     tokenSource,
				"config_path":      config.ConfigPath(),
			})
			fmt.Println(string(data))
			return nil
		}

		pairs := [][2]string{
			{"tenant", valueOrDash(cfg.Grove.Tenant)},
			{"default region", valueOrDash(cfg.Grove.DefaultRegion)},
			{"auth URL", cfg.Grove.AuthBaseURL},
			{"lattice URL", cfg.Grove.LatticeBaseURL},
			{"token source", tokenSource},
			{"config path", config.ConfigPath()},
		}
		fmt.Print(ui.RenderInfoPanel("grove config", pairs))
		return nil
	},
}

// ── Helpers ─────────────────────────────────────────────────────────

// writeTenantToConfig updates the [grove].tenant field in ~/.grove/gw.toml.
// It decodes the full file, modifies the field, and re-encodes.
func writeTenantToConfig(tenant string) error {
	configPath := config.ConfigPath()
	if configPath == "" {
		return fmt.Errorf("could not determine config path")
	}

	// Decode existing config (or start fresh)
	var cfg config.Config
	if _, err := os.Stat(configPath); err == nil {
		if _, err := toml.DecodeFile(configPath, &cfg); err != nil {
			return fmt.Errorf("failed to parse %s: %w", configPath, err)
		}
	}

	cfg.Grove.Tenant = tenant

	// Ensure directory exists
	dir := configPath[:len(configPath)-len("/gw.toml")]
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Encode and write
	var buf bytes.Buffer
	enc := toml.NewEncoder(&buf)
	if err := enc.Encode(cfg); err != nil {
		return fmt.Errorf("failed to encode config: %w", err)
	}

	if err := os.WriteFile(configPath, buf.Bytes(), 0o644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}
	return nil
}

func valueOrDash(s string) string {
	if s == "" {
		return "—"
	}
	return s
}

// ── Cozy Help ───────────────────────────────────────────────────────

var groveConfigHelpCategories = []ui.HelpCategory{
	{
		Title: "Read (Always Safe)",
		Icon:  "📖",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "tenant", Desc: "Show the current tenant (no args)"},
			{Name: "show", Desc: "Show all Grove configuration"},
		},
	},
	{
		Title: "Write (--write)",
		Icon:  "✏️",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "tenant <name>", Desc: "Set the active tenant"},
		},
	},
}

// ── Registration ────────────────────────────────────────────────────

func init() {
	rootCmd.AddCommand(groveConfigCmd)

	groveConfigCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		if cmd != groveConfigCmd {
			fmt.Println(cmd.UsageString())
			return
		}
		output := ui.RenderCozyHelp(
			"gw config",
			"grove configuration management",
			groveConfigHelpCategories,
			true,
		)
		fmt.Print(output)
	})

	groveConfigCmd.AddCommand(configTenantCmd)
	groveConfigCmd.AddCommand(configShowCmd)
}
