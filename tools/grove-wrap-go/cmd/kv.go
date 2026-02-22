package cmd

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// maxKVLimit is the maximum limit for KV key listings.
const maxKVLimit = 10000

// clampKVLimit clamps a KV list limit to [1, maxKVLimit].
func clampKVLimit(limit int) int {
	if limit < 1 {
		return 1
	}
	if limit > maxKVLimit {
		return maxKVLimit
	}
	return limit
}

// resolveNamespace resolves a KV namespace alias to its ID using config.
func resolveNamespace(alias string) (string, error) {
	cfg := config.Get()
	if ns, ok := cfg.KVNamespaces[alias]; ok {
		return ns.ID, nil
	}
	// Treat as raw ID if it looks like one (hex/uuid format)
	if len(alias) >= 16 {
		return alias, nil
	}
	return "", fmt.Errorf("unknown KV namespace: %q (configure in ~/.grove/gw.toml)", alias)
}

// kvCmd is the parent command for KV namespace operations.
var kvCmd = &cobra.Command{
	Use:   "kv",
	Short: "KV storage operations with safety guards",
	Long:  "KV namespace operations wrapped with Grove's safety-tiered interface.",
}

// --- kv list ---

var kvListCmd = &cobra.Command{
	Use:   "list",
	Short: "List KV namespaces",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		output, err := exec.WranglerOutput("kv:namespace", "list", "--json")
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			var remote json.RawMessage
			if err := json.Unmarshal([]byte(output), &remote); err != nil {
				remote = json.RawMessage("[]")
			}
			configured := make(map[string]config.Namespace)
			for alias, ns := range cfg.KVNamespaces {
				configured[alias] = ns
			}
			result := map[string]interface{}{
				"configured": configured,
				"remote":     remote,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		// Show configured namespaces
		if len(cfg.KVNamespaces) > 0 {
			ui.PrintHeader("Configured Namespaces")
			for alias, ns := range cfg.KVNamespaces {
				ui.PrintKeyValue(
					fmt.Sprintf("%-12s", alias),
					fmt.Sprintf("%s  (%s)", ns.Name, ns.ID),
				)
			}
			fmt.Println()
		}

		// Show remote namespaces
		var namespaces []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &namespaces); err == nil && len(namespaces) > 0 {
			ui.PrintHeader("Remote KV Namespaces")
			for _, ns := range namespaces {
				title := fmt.Sprintf("%v", ns["title"])
				id := fmt.Sprintf("%v", ns["id"])
				ui.PrintKeyValue(fmt.Sprintf("%-30s", title), id)
			}
		}

		return nil
	},
}

// --- kv keys ---

var kvKeysCmd = &cobra.Command{
	Use:   "keys <namespace>",
	Short: "List keys in a namespace",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		nsID, err := resolveNamespace(args[0])
		if err != nil {
			return err
		}
		prefix, _ := cmd.Flags().GetString("prefix")
		limit, _ := cmd.Flags().GetInt("limit")
		limit = clampKVLimit(limit)

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
			return fmt.Errorf("failed to parse keys: %w", err)
		}

		// Apply limit
		if len(keys) > limit {
			keys = keys[:limit]
		}

		if cfg.JSONMode {
			result := map[string]interface{}{
				"namespace": args[0],
				"keys":      keys,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		if len(keys) == 0 {
			ui.Muted("No keys found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Keys in %s (%d)", args[0], len(keys)))
		for _, k := range keys {
			name := fmt.Sprintf("%v", k["name"])
			meta := ""
			if m, ok := k["metadata"]; ok && m != nil {
				ms := fmt.Sprintf("%v", m)
				if len(ms) > 30 {
					ms = ms[:27] + "..."
				}
				meta = fmt.Sprintf("  (%s)", ms)
			}
			ui.PrintKeyValue("  ", name+meta)
		}

		return nil
	},
}

// --- kv get ---

var kvGetCmd = &cobra.Command{
	Use:   "get <namespace> <key>",
	Short: "Get a value from KV",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		nsID, err := resolveNamespace(args[0])
		if err != nil {
			return err
		}
		key := args[1]

		output, err := exec.WranglerOutput("kv:key", "get", "--namespace-id", nsID, key)
		if err != nil {
			errStr := err.Error()
			if strings.Contains(errStr, "key not found") || strings.Contains(errStr, "could not find") {
				if cfg.JSONMode {
					data, _ := json.Marshal(map[string]interface{}{
						"key": key, "value": nil, "found": false,
					})
					fmt.Println(string(data))
					return nil
				}
				ui.Warning(fmt.Sprintf("Key not found: %s", key))
				return nil
			}
			return fmt.Errorf("wrangler error: %w", err)
		}

		output = strings.TrimSpace(output)

		if cfg.JSONMode {
			// Try to parse as JSON value
			var parsed interface{}
			if json.Unmarshal([]byte(output), &parsed) == nil {
				result := map[string]interface{}{
					"key": key, "value": parsed, "found": true,
				}
				data, _ := json.Marshal(result)
				fmt.Println(string(data))
			} else {
				result := map[string]interface{}{
					"key": key, "value": output, "found": true,
				}
				data, _ := json.Marshal(result)
				fmt.Println(string(data))
			}
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("KV: %s", key))
		// Pretty-print JSON if possible
		var jsonVal interface{}
		if json.Unmarshal([]byte(output), &jsonVal) == nil {
			pretty, _ := json.MarshalIndent(jsonVal, "  ", "  ")
			fmt.Printf("  %s\n", string(pretty))
		} else {
			fmt.Printf("  %s\n", output)
		}

		return nil
	},
}

// --- kv put ---

var kvPutCmd = &cobra.Command{
	Use:   "put <namespace> <key> <value>",
	Short: "Write a value to KV",
	Args:  cobra.ExactArgs(3),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("kv_put"); err != nil {
			return err
		}

		cfg := config.Get()
		nsID, err := resolveNamespace(args[0])
		if err != nil {
			return err
		}
		key := args[1]
		value := args[2]

		ttl, _ := cmd.Flags().GetInt("ttl")
		expiration, _ := cmd.Flags().GetInt("expiration")
		metadata, _ := cmd.Flags().GetString("metadata")

		wranglerArgs := []string{"kv:key", "put", "--namespace-id", nsID, key, value}
		if ttl > 0 {
			wranglerArgs = append(wranglerArgs, "--ttl", fmt.Sprintf("%d", ttl))
		}
		if expiration > 0 {
			wranglerArgs = append(wranglerArgs, "--expiration", fmt.Sprintf("%d", expiration))
		}
		if metadata != "" {
			// Validate JSON
			if !json.Valid([]byte(metadata)) {
				return fmt.Errorf("invalid JSON metadata: %s", metadata)
			}
			wranglerArgs = append(wranglerArgs, "--metadata", metadata)
		}

		result, err := exec.Wrangler(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"key": key, "namespace": args[0], "written": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Written: %s → %s", key, args[0]))
		}
		return nil
	},
}

// --- kv delete ---

var kvDeleteCmd = &cobra.Command{
	Use:   "delete <namespace> <key>",
	Short: "Delete a key from KV",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("kv_delete"); err != nil {
			return err
		}

		cfg := config.Get()
		nsID, err := resolveNamespace(args[0])
		if err != nil {
			return err
		}
		key := args[1]

		result, err := exec.Wrangler("kv:key", "delete", "--namespace-id", nsID, key)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"key": key, "namespace": args[0], "deleted": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Deleted: %s from %s", key, args[0]))
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(kvCmd)

	// kv list
	kvCmd.AddCommand(kvListCmd)

	// kv keys
	kvKeysCmd.Flags().StringP("prefix", "p", "", "Filter by key prefix")
	kvKeysCmd.Flags().IntP("limit", "n", 100, "Maximum keys to return")
	kvCmd.AddCommand(kvKeysCmd)

	// kv get
	kvCmd.AddCommand(kvGetCmd)

	// kv put
	kvPutCmd.Flags().Int("ttl", 0, "TTL in seconds")
	kvPutCmd.Flags().Int("expiration", 0, "Expiration timestamp (Unix)")
	kvPutCmd.Flags().StringP("metadata", "m", "", "JSON metadata")
	kvCmd.AddCommand(kvPutCmd)

	// kv delete
	kvCmd.AddCommand(kvDeleteCmd)
}
