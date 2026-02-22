package cmd

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// resolveFlagsNamespace resolves the flags KV namespace ID from config.
func resolveFlagsNamespace() (string, error) {
	cfg := config.Get()
	if ns, ok := cfg.KVNamespaces["flags"]; ok {
		return ns.ID, nil
	}
	return "", fmt.Errorf("flags namespace not configured (add [kv_namespaces.flags] to ~/.grove/gw.toml)")
}

// parseFlagEnabled determines if a flag value is enabled.
func parseFlagEnabled(raw string) (bool, interface{}) {
	raw = strings.TrimSpace(raw)

	// Try JSON
	var parsed interface{}
	if json.Unmarshal([]byte(raw), &parsed) == nil {
		if m, ok := parsed.(map[string]interface{}); ok {
			if enabled, ok := m["enabled"].(bool); ok {
				return enabled, parsed
			}
		}
		// Coerce JSON to bool
		switch v := parsed.(type) {
		case bool:
			return v, parsed
		case float64:
			return v != 0, parsed
		case string:
			lower := strings.ToLower(v)
			return lower == "true" || lower == "1" || lower == "yes" || lower == "on", parsed
		}
	}

	// Plain string
	lower := strings.ToLower(raw)
	return lower == "true" || lower == "1" || lower == "yes" || lower == "on", raw
}

// flagCmd is the parent command for feature flag operations.
var flagCmd = &cobra.Command{
	Use:   "flag",
	Short: "Feature flag operations with safety guards",
	Long:  "Feature flag operations using KV-backed flags wrapped with Grove's safety-tiered interface.",
}

// --- flag list ---

var flagListCmd = &cobra.Command{
	Use:   "list",
	Short: "List feature flags",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		nsID, err := resolveFlagsNamespace()
		if err != nil {
			return err
		}
		prefix, _ := cmd.Flags().GetString("prefix")
		if prefix != "" && (len(prefix) > 256 || strings.ContainsAny(prefix, "\x00\n\r")) {
			return fmt.Errorf("prefix too long or contains invalid characters")
		}

		wranglerArgs := []string{"kv:key", "list", "--namespace-id", nsID}
		if prefix != "" {
			wranglerArgs = append(wranglerArgs, "--prefix", prefix)
		}

		output, err := exec.WranglerOutput(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		var keys []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &keys); err != nil {
			return fmt.Errorf("failed to parse flag keys: %w", err)
		}

		type flagInfo struct {
			Name    string      `json:"name"`
			Enabled bool        `json:"enabled"`
			Value   interface{} `json:"value"`
		}
		var flags []flagInfo

		for _, k := range keys {
			name := fmt.Sprintf("%v", k["name"])
			// Fetch each flag value
			raw, err := exec.WranglerOutput("kv:key", "get", "--namespace-id", nsID, name)
			if err != nil {
				flags = append(flags, flagInfo{Name: name, Enabled: false, Value: nil})
				continue
			}
			enabled, value := parseFlagEnabled(raw)
			flags = append(flags, flagInfo{Name: name, Enabled: enabled, Value: value})
		}

		if cfg.JSONMode {
			result := map[string]interface{}{"flags": flags}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		if len(flags) == 0 {
			ui.Muted("No flags found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Feature Flags (%d)", len(flags)))
		for _, f := range flags {
			status := "○ OFF"
			if f.Enabled {
				status = "● ON"
			}
			ui.PrintKeyValue(
				fmt.Sprintf("  %-24s", f.Name),
				status,
			)
		}

		return nil
	},
}

// --- flag get ---

var flagGetCmd = &cobra.Command{
	Use:   "get <name>",
	Short: "Get a flag's status and value",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		nsID, err := resolveFlagsNamespace()
		if err != nil {
			return err
		}
		name := args[0]
		if err := validateCFKey(name); err != nil {
			return fmt.Errorf("invalid flag name: %w", err)
		}

		raw, err := exec.WranglerOutput("kv:key", "get", "--namespace-id", nsID, name)
		if err != nil {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"name": name, "found": false, "enabled": false, "value": nil,
				})
				fmt.Println(string(data))
				return nil
			}
			ui.Warning(fmt.Sprintf("Flag not found: %s", name))
			return nil
		}

		enabled, value := parseFlagEnabled(raw)

		if cfg.JSONMode {
			result := map[string]interface{}{
				"name": name, "found": true, "enabled": enabled, "value": value,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		status := "○ OFF"
		if enabled {
			status = "● ON"
		}
		ui.PrintHeader(fmt.Sprintf("Flag: %s", name))
		ui.PrintKeyValue("  Status", status)
		if value != nil {
			valStr := fmt.Sprintf("%v", value)
			if len(valStr) > 40 {
				valStr = valStr[:37] + "..."
			}
			ui.PrintKeyValue("  Value", valStr)
		}

		return nil
	},
}

// --- flag enable ---

var flagEnableCmd = &cobra.Command{
	Use:   "enable <name>",
	Short: "Enable a feature flag",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("flag_enable"); err != nil {
			return err
		}

		cfg := config.Get()
		nsID, err := resolveFlagsNamespace()
		if err != nil {
			return err
		}
		name := args[0]
		if err := validateCFKey(name); err != nil {
			return fmt.Errorf("invalid flag name: %w", err)
		}
		metadata, _ := cmd.Flags().GetString("metadata")

		// Build flag value
		flagValue := map[string]interface{}{
			"enabled":    true,
			"updated_at": time.Now().UTC().Format(time.RFC3339),
		}

		// Merge extra metadata if provided (set reserved fields last to prevent override)
		if metadata != "" {
			if len(metadata) > maxCFMetadataLen {
				return fmt.Errorf("metadata too large (max %d bytes)", maxCFMetadataLen)
			}
			var extra map[string]interface{}
			if err := json.Unmarshal([]byte(metadata), &extra); err != nil {
				return fmt.Errorf("invalid JSON metadata: %s", metadata)
			}
			for k, v := range extra {
				flagValue[k] = v
			}
			// Re-assert reserved fields so metadata cannot override them
			flagValue["enabled"] = true
			flagValue["updated_at"] = time.Now().UTC().Format(time.RFC3339)
		}

		valueJSON, _ := json.Marshal(flagValue)

		result, err := exec.Wrangler("kv:key", "put", "--namespace-id", nsID, name, string(valueJSON))
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name": name, "enabled": true, "value": flagValue,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Enabled flag: %s", name))
		}
		return nil
	},
}

// --- flag disable ---

var flagDisableCmd = &cobra.Command{
	Use:   "disable <name>",
	Short: "Disable a feature flag",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("flag_disable"); err != nil {
			return err
		}

		cfg := config.Get()
		nsID, err := resolveFlagsNamespace()
		if err != nil {
			return err
		}
		name := args[0]
		if err := validateCFKey(name); err != nil {
			return fmt.Errorf("invalid flag name: %w", err)
		}

		flagValue := map[string]interface{}{
			"enabled":    false,
			"updated_at": time.Now().UTC().Format(time.RFC3339),
		}
		valueJSON, _ := json.Marshal(flagValue)

		result, err := exec.Wrangler("kv:key", "put", "--namespace-id", nsID, name, string(valueJSON))
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name": name, "enabled": false,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Disabled flag: %s", name))
		}
		return nil
	},
}

// --- flag delete ---

var flagDeleteCmd = &cobra.Command{
	Use:   "delete <name>",
	Short: "Delete a feature flag",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("flag_delete"); err != nil {
			return err
		}

		cfg := config.Get()
		nsID, err := resolveFlagsNamespace()
		if err != nil {
			return err
		}
		name := args[0]
		if err := validateCFKey(name); err != nil {
			return fmt.Errorf("invalid flag name: %w", err)
		}

		result, err := exec.Wrangler("kv:key", "delete", "--namespace-id", nsID, name)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"name": name, "deleted": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Deleted flag: %s", name))
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(flagCmd)

	// flag list
	flagListCmd.Flags().StringP("prefix", "p", "", "Filter flags by prefix")
	flagCmd.AddCommand(flagListCmd)

	// flag get
	flagCmd.AddCommand(flagGetCmd)

	// flag enable
	flagEnableCmd.Flags().StringP("metadata", "m", "", "Additional JSON metadata")
	flagCmd.AddCommand(flagEnableCmd)

	// flag disable
	flagCmd.AddCommand(flagDisableCmd)

	// flag delete
	flagCmd.AddCommand(flagDeleteCmd)
}
