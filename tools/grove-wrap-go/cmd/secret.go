package cmd

import (
	"bufio"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

var secretCmd = &cobra.Command{
	Use:   "secret",
	Short: "Encrypted secrets vault for Cloudflare Workers",
	Long: `Manage secrets safely with an encrypted local vault.
Values are never displayed in normal output — safe for agent use.`,
}

// --- secret init ---

var secretInitCmd = &cobra.Command{
	Use:   "init",
	Short: "Create a new secrets vault",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("secret_init"); err != nil {
			return err
		}
		cfg := config.Get()

		if vault.VaultExists() {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{"error": "vault already exists"})
				fmt.Println(string(data))
			} else {
				ui.Warning("Vault already exists at " + vault.DefaultVaultPath())
			}
			return nil
		}

		password, err := vault.GetNewVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.Create(password)
		if err != nil {
			return fmt.Errorf("failed to create vault: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"created": true,
				"path":    vault.DefaultVaultPath(),
				"secrets": v.Count(),
			})
			fmt.Println(string(data))
		} else {
			ui.Success("Vault created at " + vault.DefaultVaultPath())
		}
		return nil
	},
}

// --- secret list ---

var secretListCmd = &cobra.Command{
	Use:   "list",
	Short: "List secrets (values are never shown)",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.Unlock(password)
		if err != nil {
			return err
		}

		secrets := v.List()

		if cfg.JSONMode {
			// Build JSON-safe list
			items := make([]map[string]interface{}, 0, len(secrets))
			for name, entry := range secrets {
				item := map[string]interface{}{
					"name":       name,
					"created_at": entry.CreatedAt,
					"updated_at": entry.UpdatedAt,
				}
				if len(entry.DeployedTo) > 0 {
					item["deployed_to"] = entry.DeployedTo
				}
				items = append(items, item)
			}
			data, _ := json.Marshal(map[string]interface{}{
				"count":   len(secrets),
				"secrets": items,
			})
			fmt.Println(string(data))
			return nil
		}

		if len(secrets) == 0 {
			ui.Muted("No secrets stored")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Secrets Vault (%d entries)", len(secrets)))
		// Sort by name
		names := make([]string, 0, len(secrets))
		for name := range secrets {
			names = append(names, name)
		}
		sort.Strings(names)

		for _, name := range names {
			entry := secrets[name]
			targets := ""
			if len(entry.DeployedTo) > 0 {
				targetNames := make([]string, 0, len(entry.DeployedTo))
				for t := range entry.DeployedTo {
					targetNames = append(targetNames, t)
				}
				targets = fmt.Sprintf("  → %s", strings.Join(targetNames, ", "))
			}
			ui.PrintKeyValue(
				fmt.Sprintf("%-24s", name),
				fmt.Sprintf("updated: %s%s", entry.UpdatedAt, targets),
			)
		}
		return nil
	},
}

// --- secret set ---

var secretSetCmd = &cobra.Command{
	Use:   "set <name>",
	Short: "Set a secret value (prompted or piped from stdin)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("secret_set"); err != nil {
			return err
		}
		cfg := config.Get()
		name := args[0]

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.UnlockOrCreate(password)
		if err != nil {
			return err
		}

		// Read value from stdin (piped) or prompt
		var value string
		fi, _ := os.Stdin.Stat()
		if (fi.Mode() & os.ModeCharDevice) == 0 {
			// Piped input
			scanner := bufio.NewScanner(os.Stdin)
			if scanner.Scan() {
				value = strings.TrimSpace(scanner.Text())
			}
		} else {
			// Interactive — prompt without echo
			fmt.Fprintf(os.Stderr, "Secret value for %s: ", name)
			// Use raw read since term.ReadPassword may not work here
			// after vault password was already read
			scanner := bufio.NewScanner(os.Stdin)
			if scanner.Scan() {
				value = strings.TrimSpace(scanner.Text())
			}
		}

		if value == "" {
			return fmt.Errorf("secret value must not be empty")
		}

		if err := v.Set(name, value); err != nil {
			return err
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name": name, "set": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Secret '%s' saved", name))
		}
		return nil
	},
}

// --- secret generate ---

var secretGenerateCmd = &cobra.Command{
	Use:   "generate <name>",
	Short: "Generate and store a random secret",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("secret_generate"); err != nil {
			return err
		}
		cfg := config.Get()
		name := args[0]
		length, _ := cmd.Flags().GetInt("length")
		format, _ := cmd.Flags().GetString("format")
		force, _ := cmd.Flags().GetBool("force")

		if length < 8 || length > 256 {
			return fmt.Errorf("length must be between 8 and 256, got %d", length)
		}

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.UnlockOrCreate(password)
		if err != nil {
			return err
		}

		if v.Exists(name) && !force {
			return fmt.Errorf("secret '%s' already exists (use --force to overwrite)", name)
		}

		// Generate random bytes
		raw := make([]byte, length)
		if _, err := rand.Read(raw); err != nil {
			return fmt.Errorf("failed to generate random bytes: %w", err)
		}

		var value string
		switch format {
		case "hex":
			value = hex.EncodeToString(raw)
		case "urlsafe":
			value = base64.URLEncoding.EncodeToString(raw)
		default:
			return fmt.Errorf("unsupported format: %s (use 'urlsafe' or 'hex')", format)
		}

		if err := v.Set(name, value); err != nil {
			return err
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name":      name,
				"generated": true,
				"length":    length,
				"format":    format,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Secret '%s' generated (%d bytes, %s)", name, length, format))
		}
		return nil
	},
}

// --- secret exists ---

var secretExistsCmd = &cobra.Command{
	Use:   "exists <name>",
	Short: "Check if a secret exists (exit code 0 = yes, 1 = no)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		name := args[0]

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.Unlock(password)
		if err != nil {
			return err
		}

		exists := v.Exists(name)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name": name, "exists": exists,
			})
			fmt.Println(string(data))
			if !exists {
				os.Exit(1)
			}
			return nil
		}

		if exists {
			ui.Success(fmt.Sprintf("Secret '%s' exists", name))
		} else {
			ui.Muted(fmt.Sprintf("Secret '%s' not found", name))
			os.Exit(1)
		}
		return nil
	},
}

// --- secret reveal ---

var secretRevealCmd = &cobra.Command{
	Use:   "reveal <name>",
	Short: "Show a secret's plaintext value (DANGEROUS — human only)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("secret_reveal"); err != nil {
			return err
		}
		cfg := config.Get()
		name := args[0]

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.Unlock(password)
		if err != nil {
			return err
		}

		value, ok := v.Get(name)
		if !ok {
			return fmt.Errorf("secret '%s' not found", name)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name": name, "value": value,
			})
			fmt.Println(string(data))
		} else {
			fmt.Println(value)
		}
		return nil
	},
}

// --- secret delete ---

var secretDeleteCmd = &cobra.Command{
	Use:   "delete <name>",
	Short: "Delete a secret from the vault",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("secret_delete"); err != nil {
			return err
		}
		cfg := config.Get()
		name := args[0]

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.Unlock(password)
		if err != nil {
			return err
		}

		if err := v.Delete(name); err != nil {
			return err
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name": name, "deleted": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Secret '%s' deleted", name))
		}
		return nil
	},
}

// --- secret apply ---

var secretApplyCmd = &cobra.Command{
	Use:   "apply <name> [name...]",
	Short: "Deploy secrets to a Cloudflare Worker via wrangler",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("secret_apply"); err != nil {
			return err
		}
		cfg := config.Get()
		worker, _ := cmd.Flags().GetString("worker")
		pages, _ := cmd.Flags().GetString("pages")

		if worker == "" && pages == "" {
			return fmt.Errorf("specify --worker or --pages target")
		}

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.Unlock(password)
		if err != nil {
			return err
		}

		var results []map[string]interface{}
		allOK := true

		for _, name := range args {
			value, ok := v.Get(name)
			if !ok {
				allOK = false
				results = append(results, map[string]interface{}{
					"name": name, "applied": false, "error": "not found in vault",
				})
				if !cfg.JSONMode {
					ui.Error(fmt.Sprintf("Secret '%s' not found in vault", name))
				}
				continue
			}

			// Build wrangler command
			var wranglerArgs []string
			var target string
			if worker != "" {
				wranglerArgs = []string{"secret", "put", name, "--name", worker}
				target = worker
			} else {
				wranglerArgs = []string{"pages", "secret", "put", name, "--project", pages}
				target = "Pages:" + pages
			}

			// Pipe value via stdin — never appears in process args
			result, err := exec.WranglerWithStdin(value, wranglerArgs...)
			if err != nil {
				allOK = false
				results = append(results, map[string]interface{}{
					"name": name, "applied": false, "error": err.Error(),
				})
				if !cfg.JSONMode {
					ui.Error(fmt.Sprintf("Failed to apply '%s': %v", name, err))
				}
				continue
			}

			if !result.OK() {
				// Check for "already exists" which isn't really an error
				stderr := result.Stderr
				if strings.Contains(stderr, "already exists") {
					// Still counts as success — value was updated
				} else {
					allOK = false
					results = append(results, map[string]interface{}{
						"name": name, "applied": false, "error": stderr,
					})
					if !cfg.JSONMode {
						ui.Error(fmt.Sprintf("Failed to apply '%s': %s", name, stderr))
					}
					continue
				}
			}

			// Record deployment in vault
			_ = v.RecordDeployment(name, target)

			results = append(results, map[string]interface{}{
				"name": name, "applied": true, "target": target,
			})
			if !cfg.JSONMode {
				ui.Success(fmt.Sprintf("Applied '%s' → %s", name, target))
			}
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"results": results,
				"all_ok":  allOK,
			})
			fmt.Println(string(data))
		}

		if !allOK {
			os.Exit(1)
		}
		return nil
	},
}

// --- secret sync ---

var secretSyncCmd = &cobra.Command{
	Use:   "sync",
	Short: "Deploy all secrets to a Cloudflare Worker",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("secret_sync"); err != nil {
			return err
		}
		cfg := config.Get()
		worker, _ := cmd.Flags().GetString("worker")
		pages, _ := cmd.Flags().GetString("pages")

		if worker == "" && pages == "" {
			return fmt.Errorf("specify --worker or --pages target")
		}

		password, err := vault.GetVaultPassword()
		if err != nil {
			return err
		}

		v, err := vault.Unlock(password)
		if err != nil {
			return err
		}

		names := v.Names()
		sort.Strings(names)

		if len(names) == 0 {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"synced": 0, "message": "no secrets in vault",
				})
				fmt.Println(string(data))
			} else {
				ui.Muted("No secrets to sync")
			}
			return nil
		}

		if !cfg.JSONMode {
			ui.Info(fmt.Sprintf("Syncing %d secrets...", len(names)))
		}

		// Reuse apply logic by building the same args
		var results []map[string]interface{}
		allOK := true
		for _, name := range names {
			value, _ := v.Get(name)

			var wranglerArgs []string
			var target string
			if worker != "" {
				wranglerArgs = []string{"secret", "put", name, "--name", worker}
				target = worker
			} else {
				wranglerArgs = []string{"pages", "secret", "put", name, "--project", pages}
				target = "Pages:" + pages
			}

			result, err := exec.WranglerWithStdin(value, wranglerArgs...)
			if err != nil {
				allOK = false
				results = append(results, map[string]interface{}{
					"name": name, "applied": false, "error": err.Error(),
				})
				if !cfg.JSONMode {
					ui.Error(fmt.Sprintf("  ✗ %s: %v", name, err))
				}
				continue
			}

			if !result.OK() && !strings.Contains(result.Stderr, "already exists") {
				allOK = false
				results = append(results, map[string]interface{}{
					"name": name, "applied": false, "error": result.Stderr,
				})
				if !cfg.JSONMode {
					ui.Error(fmt.Sprintf("  ✗ %s: %s", name, result.Stderr))
				}
				continue
			}

			_ = v.RecordDeployment(name, target)
			results = append(results, map[string]interface{}{
				"name": name, "applied": true, "target": target,
			})
			if !cfg.JSONMode {
				ui.Step(true, name)
			}
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"results": results,
				"all_ok":  allOK,
				"synced":  len(results),
			})
			fmt.Println(string(data))
		} else if allOK {
			ui.Success(fmt.Sprintf("All %d secrets synced", len(names)))
		}

		if !allOK {
			os.Exit(1)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(secretCmd)

	secretCmd.AddCommand(secretInitCmd)
	secretCmd.AddCommand(secretListCmd)
	secretCmd.AddCommand(secretSetCmd)
	secretCmd.AddCommand(secretExistsCmd)
	secretCmd.AddCommand(secretRevealCmd)
	secretCmd.AddCommand(secretDeleteCmd)

	// generate
	secretGenerateCmd.Flags().IntP("length", "l", 32, "Length of generated secret in bytes")
	secretGenerateCmd.Flags().StringP("format", "f", "urlsafe", "Output format: urlsafe or hex")
	secretGenerateCmd.Flags().Bool("force", false, "Overwrite existing secret")
	secretCmd.AddCommand(secretGenerateCmd)

	// apply
	secretApplyCmd.Flags().StringP("worker", "w", "", "Cloudflare Worker name")
	secretApplyCmd.Flags().StringP("pages", "p", "", "Cloudflare Pages project name")
	secretCmd.AddCommand(secretApplyCmd)

	// sync
	secretSyncCmd.Flags().StringP("worker", "w", "", "Cloudflare Worker name")
	secretSyncCmd.Flags().StringP("pages", "p", "", "Cloudflare Pages project name")
	secretCmd.AddCommand(secretSyncCmd)
}
