package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// cacheCmd is the parent command for cache management operations.
var cacheCmd = &cobra.Command{
	Use:   "cache",
	Short: "Cache management operations",
	Long:  "Manage Grove's KV-backed cache and CDN cache with safety guards.",
}

// --- cache list ---

var cacheListCmd = &cobra.Command{
	Use:   "list [TENANT]",
	Short: "List cache keys from the configured cache namespace",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("cache_list"); err != nil {
			return err
		}

		cfg := config.Get()
		nsAlias, _ := cmd.Flags().GetString("namespace")
		prefix, _ := cmd.Flags().GetString("prefix")
		showAll, _ := cmd.Flags().GetBool("all")

		nsID, err := resolveNamespace(nsAlias)
		if err != nil {
			return err
		}

		// Build prefix from tenant argument if provided
		effectivePrefix := prefix
		if len(args) == 1 {
			tenant := args[0]
			if err := validateCFName(tenant, "tenant"); err != nil {
				return err
			}
			tenantPrefix := fmt.Sprintf("cache:%s:", tenant)
			if effectivePrefix != "" {
				effectivePrefix = tenantPrefix + effectivePrefix
			} else {
				effectivePrefix = tenantPrefix
			}
		}

		wranglerArgs := []string{"kv:key", "list", "--namespace-id", nsID}
		if effectivePrefix != "" {
			wranglerArgs = append(wranglerArgs, "--prefix", effectivePrefix)
		}

		output, err := exec.WranglerOutput(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		var keys []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &keys); err != nil {
			return fmt.Errorf("failed to parse key list: %w", err)
		}

		if !showAll && len(keys) > 100 {
			keys = keys[:100]
		}

		if cfg.JSONMode {
			result := map[string]interface{}{
				"namespace": nsAlias,
				"prefix":    effectivePrefix,
				"keys":      keys,
				"count":     len(keys),
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		if len(keys) == 0 {
			ui.Muted("No cache keys found")
			return nil
		}

		header := fmt.Sprintf("Cache Keys (%d)", len(keys))
		if effectivePrefix != "" {
			header = fmt.Sprintf("Cache Keys — prefix: %s (%d)", effectivePrefix, len(keys))
		}
		ui.PrintHeader(header)
		for _, k := range keys {
			name := fmt.Sprintf("%v", k["name"])
			expiry := ""
			if exp, ok := k["expiration"].(float64); ok && exp > 0 {
				expiry = fmt.Sprintf("  (exp: %.0f)", exp)
			}
			ui.PrintKeyValue("  ", name+expiry)
		}

		return nil
	},
}

// --- cache stats ---

var cacheStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show cache statistics across all KV namespaces",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("cache_stats"); err != nil {
			return err
		}

		cfg := config.Get()

		output, err := exec.WranglerOutput("kv:namespace", "list", "--json")
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		var namespaces []map[string]interface{}
		if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &namespaces); err != nil {
			return fmt.Errorf("failed to parse namespace list: %w", err)
		}

		type nsStat struct {
			Title string `json:"title"`
			ID    string `json:"id"`
			Count int    `json:"key_count"`
		}

		var stats []nsStat

		for _, ns := range namespaces {
			title := fmt.Sprintf("%v", ns["title"])
			id := fmt.Sprintf("%v", ns["id"])

			// Count keys in this namespace
			keysOutput, err := exec.WranglerOutput("kv:key", "list", "--namespace-id", id)
			count := 0
			if err == nil {
				var keys []map[string]interface{}
				if json.Unmarshal([]byte(keysOutput), &keys) == nil {
					count = len(keys)
				}
			}
			stats = append(stats, nsStat{Title: title, ID: id, Count: count})
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"namespaces": stats,
			})
			fmt.Println(string(data))
			return nil
		}

		if len(stats) == 0 {
			ui.Muted("No KV namespaces found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("KV Namespace Stats (%d namespaces)", len(stats)))
		for _, s := range stats {
			ui.PrintKeyValue(
				fmt.Sprintf("%-32s", s.Title),
				fmt.Sprintf("%d keys", s.Count),
			)
		}

		return nil
	},
}

// --- cache purge ---

var cachePurgeCmd = &cobra.Command{
	Use:   "purge [KEY]",
	Short: "Purge cache keys or CDN cache",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("cache_purge"); err != nil {
			return err
		}

		cfg := config.Get()
		tenant, _ := cmd.Flags().GetString("tenant")
		prefix, _ := cmd.Flags().GetString("prefix")
		purgeAll, _ := cmd.Flags().GetBool("all")
		cdnFlag, _ := cmd.Flags().GetBool("cdn")
		cdnURL, _ := cmd.Flags().GetString("cdn-url")
		nsAlias, _ := cmd.Flags().GetString("namespace")

		// CDN purge path
		if cdnFlag {
			return cachePurgeCDN(cfg, cdnURL)
		}

		// KV purge path
		nsID, err := resolveNamespace(nsAlias)
		if err != nil {
			return err
		}

		// Single key deletion
		if len(args) == 1 {
			key := args[0]
			if err := validateCFKey(key); err != nil {
				return err
			}
			result, err := exec.Wrangler("kv:key", "delete", "--namespace-id", nsID, key)
			if err != nil {
				return fmt.Errorf("wrangler error: %w", err)
			}
			if !result.OK() {
				return fmt.Errorf("wrangler error: %s", result.Stderr)
			}
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{"key": key, "purged": true})
				fmt.Println(string(data))
			} else {
				ui.Success(fmt.Sprintf("Purged cache key: %s", key))
			}
			return nil
		}

		// Bulk deletion by prefix or tenant
		effectivePrefix := prefix
		if tenant != "" {
			if err := validateCFName(tenant, "tenant"); err != nil {
				return err
			}
			tenantPrefix := fmt.Sprintf("cache:%s:", tenant)
			if effectivePrefix != "" {
				effectivePrefix = tenantPrefix + effectivePrefix
			} else {
				effectivePrefix = tenantPrefix
			}
		}

		if effectivePrefix == "" && !purgeAll {
			return fmt.Errorf("specify a KEY, --tenant, --prefix, or --all to purge")
		}

		// List keys matching the prefix
		wranglerArgs := []string{"kv:key", "list", "--namespace-id", nsID}
		if effectivePrefix != "" {
			wranglerArgs = append(wranglerArgs, "--prefix", effectivePrefix)
		}

		keysOutput, err := exec.WranglerOutput(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error listing keys: %w", err)
		}

		var keys []map[string]interface{}
		if err := json.Unmarshal([]byte(keysOutput), &keys); err != nil {
			return fmt.Errorf("failed to parse key list: %w", err)
		}

		if len(keys) == 0 {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{"purged": 0})
				fmt.Println(string(data))
			} else {
				ui.Muted("No cache keys matched — nothing to purge")
			}
			return nil
		}

		// Delete each key
		purged := 0
		var failed []string
		for _, k := range keys {
			name := fmt.Sprintf("%v", k["name"])
			if err := validateCFKey(name); err != nil {
				failed = append(failed, name)
				continue
			}
			result, err := exec.Wrangler("kv:key", "delete", "--namespace-id", nsID, name)
			if err != nil || !result.OK() {
				failed = append(failed, name)
				continue
			}
			purged++
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"purged": purged,
				"failed": failed,
				"prefix": effectivePrefix,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Purged %d cache keys", purged))
			if len(failed) > 0 {
				ui.Warning(fmt.Sprintf("Failed to purge %d keys", len(failed)))
			}
		}

		return nil
	},
}

// cachePurgeCDN purges the Cloudflare CDN cache via the API.
func cachePurgeCDN(cfg *config.Config, url string) error {
	apiToken := os.Getenv("CF_API_TOKEN")
	zoneID := os.Getenv("CF_ZONE_ID")

	if apiToken == "" {
		return fmt.Errorf("CF_API_TOKEN environment variable is required for CDN purge")
	}
	if zoneID == "" {
		return fmt.Errorf("CF_ZONE_ID environment variable is required for CDN purge")
	}

	apiURL := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/purge_cache", zoneID)

	var body map[string]interface{}
	if url != "" {
		body = map[string]interface{}{"files": []string{url}}
	} else {
		body = map[string]interface{}{"purge_everything": true}
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("CDN purge request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("CDN purge failed (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	if cfg.JSONMode {
		var result json.RawMessage
		if json.Unmarshal(respBody, &result) != nil {
			result = json.RawMessage(`{}`)
		}
		data, _ := json.Marshal(map[string]interface{}{
			"cdn_purge": true,
			"url":       url,
			"response":  result,
		})
		fmt.Println(string(data))
	} else {
		if url != "" {
			ui.Success(fmt.Sprintf("CDN cache purged for: %s", url))
		} else {
			ui.Success("CDN cache purged (everything)")
		}
	}

	return nil
}

func init() {
	rootCmd.AddCommand(cacheCmd)

	// cache list
	cacheListCmd.Flags().Bool("all", false, "Show all keys (no 100-key cap)")
	cacheListCmd.Flags().StringP("prefix", "p", "", "Filter keys by prefix")
	cacheListCmd.Flags().StringP("namespace", "n", "cache", "KV namespace alias")
	cacheCmd.AddCommand(cacheListCmd)

	// cache stats
	cacheCmd.AddCommand(cacheStatsCmd)

	// cache purge
	cachePurgeCmd.Flags().String("tenant", "", "Purge all keys for a tenant")
	cachePurgeCmd.Flags().StringP("prefix", "p", "", "Purge keys matching prefix")
	cachePurgeCmd.Flags().Bool("all", false, "Purge all keys in the namespace")
	cachePurgeCmd.Flags().Bool("cdn", false, "Purge Cloudflare CDN cache instead of KV")
	cachePurgeCmd.Flags().String("cdn-url", "", "Specific URL to purge from CDN (requires --cdn)")
	cachePurgeCmd.Flags().StringP("namespace", "n", "cache", "KV namespace alias")
	cacheCmd.AddCommand(cachePurgeCmd)
}
