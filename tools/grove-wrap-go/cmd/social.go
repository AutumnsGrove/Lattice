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
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

// zephyrBaseURL is the base URL for the Grove Zephyr broadcasting service.
const zephyrBaseURL = "https://grove-zephyr.m7jv4v7npb.workers.dev"

// zephyrUserAgent is the User-Agent sent with all Zephyr requests.
const zephyrUserAgent = "gw-cli/1.0 (Grove Wrap)"

// --- Zephyr HTTP helpers ---

// resolveZephyrAPIKey resolves the Zephyr API key with a 3-tier fallback:
// 1. ZEPHYR_API_KEY env var
// 2. Encrypted vault
// 3. Error with setup instructions
func resolveZephyrAPIKey() (string, error) {
	// Tier 1: environment variable
	if key := os.Getenv("ZEPHYR_API_KEY"); key != "" {
		return key, nil
	}

	// Tier 2: encrypted vault
	if vault.VaultExists() {
		password, err := vault.GetVaultPassword()
		if err == nil {
			v, err := vault.Unlock(password)
			if err == nil {
				if key, ok := v.Get("ZEPHYR_API_KEY"); ok && key != "" {
					return key, nil
				}
			}
		}
	}

	// Tier 3: not found
	return "", fmt.Errorf("ZEPHYR_API_KEY not found — set env var or store in vault (gw secret set ZEPHYR_API_KEY)")
}

// zephyrRequest builds an HTTP request against the Zephyr API.
func zephyrRequest(method, path string) (*http.Request, error) {
	url := zephyrBaseURL + path
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", zephyrUserAgent)

	apiKey, err := resolveZephyrAPIKey()
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-API-Key", apiKey)
	return req, nil
}

// zephyrRequestWithBody builds an HTTP request with a JSON body.
func zephyrRequestWithBody(method, path string, body interface{}) (*http.Request, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request body: %w", err)
	}
	url := zephyrBaseURL + path
	req, err := http.NewRequest(method, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", zephyrUserAgent)
	req.Header.Set("Content-Type", "application/json")

	apiKey, err := resolveZephyrAPIKey()
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-API-Key", apiKey)
	return req, nil
}

// zephyrDoRequest executes an HTTP request and reads the response body.
func zephyrDoRequest(req *http.Request) (int, []byte, error) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

// --- social command group ---

var socialCmd = &cobra.Command{
	Use:   "social",
	Short: "Social broadcasting via Zephyr",
	Long:  "Cross-post to Bluesky and other social platforms via the Zephyr worker.",
}

// --- social post ---

var socialPostCmd = &cobra.Command{
	Use:   "post <content>",
	Short: "Post content to social platforms",
	Long:  "Broadcast content to configured social platforms. Requires --write flag.",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("social_post"); err != nil {
			return err
		}

		cfg := config.Get()
		content := args[0]
		platforms, _ := cmd.Flags().GetStringSlice("platform")

		if cfg.JSONMode {
			ui.Muted(fmt.Sprintf("Posting to %s...", strings.Join(platforms, ", ")))
		} else {
			ui.Muted(fmt.Sprintf("Posting to %s...", strings.Join(platforms, ", ")))
		}

		req, err := zephyrRequestWithBody(http.MethodPost, "/broadcast", map[string]interface{}{
			"channel":  "social",
			"content":  content,
			"platforms": platforms,
			"metadata": map[string]string{
				"source": "gw-cli",
				"tenant": "grove",
			},
		})
		if err != nil {
			return err
		}

		statusCode, body, err := zephyrDoRequest(req)
		if err != nil {
			return fmt.Errorf("Zephyr request failed: %w", err)
		}

		// Parse response
		var result map[string]interface{}
		if jsonErr := json.Unmarshal(body, &result); jsonErr != nil {
			return fmt.Errorf("failed to parse Zephyr response (HTTP %d)", statusCode)
		}

		if cfg.JSONMode {
			return printJSON(result)
		}

		// Pretty-print delivery results
		deliveries, _ := result["deliveries"].([]interface{})

		if success, _ := result["success"].(bool); success {
			ui.Success("Posted successfully!")
			printDeliveries(deliveries)
			printBroadcastMeta(result)
		} else if partial, _ := result["partial"].(bool); partial {
			ui.Warning("Partially delivered")
			printDeliveries(deliveries)
		} else {
			ui.Step(false, "Delivery failed")
			if errMsg, ok := result["errorMessage"].(string); ok && errMsg != "" {
				ui.Muted(fmt.Sprintf("  %s", errMsg))
			}
			printDeliveries(deliveries)
		}

		return nil
	},
}

// printDeliveries formats delivery results from the broadcast response.
func printDeliveries(deliveries []interface{}) {
	for _, d := range deliveries {
		delivery, ok := d.(map[string]interface{})
		if !ok {
			continue
		}
		platform := fmt.Sprintf("%v", delivery["platform"])
		if ok, _ := delivery["success"].(bool); ok {
			url, _ := delivery["postUrl"].(string)
			ui.Step(true, fmt.Sprintf("%s: %s", platform, url))
		} else {
			errObj, _ := delivery["error"].(map[string]interface{})
			errMsg := "Unknown error"
			if errObj != nil {
				if msg, ok := errObj["message"].(string); ok {
					errMsg = msg
				}
			}
			ui.Step(false, fmt.Sprintf("%s: %s", platform, errMsg))
		}
	}
}

// printBroadcastMeta prints broadcast ID and latency from metadata.
func printBroadcastMeta(result map[string]interface{}) {
	meta, _ := result["metadata"].(map[string]interface{})
	if meta == nil {
		return
	}
	broadcastID, _ := meta["broadcastId"].(string)
	latency, _ := meta["latencyMs"].(float64)
	if broadcastID != "" {
		ui.Muted(fmt.Sprintf("Broadcast: %s (%dms)", broadcastID, int(latency)))
	}
}

// --- social status ---

var socialStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show platform status and health",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		req, err := zephyrRequest(http.MethodGet, "/broadcast/platforms")
		if err != nil {
			return err
		}

		statusCode, body, err := zephyrDoRequest(req)
		if err != nil {
			return fmt.Errorf("Zephyr request failed: %w", err)
		}

		var result map[string]interface{}
		if jsonErr := json.Unmarshal(body, &result); jsonErr != nil {
			return fmt.Errorf("failed to parse Zephyr response (HTTP %d)", statusCode)
		}

		if cfg.JSONMode {
			return printJSON(result)
		}

		ui.PrintHeader("Social Platforms")
		fmt.Println()

		platforms, _ := result["platforms"].([]interface{})
		for _, p := range platforms {
			platform, ok := p.(map[string]interface{})
			if !ok {
				continue
			}

			name := fmt.Sprintf("%v", platform["name"])
			if name == "<nil>" {
				name = fmt.Sprintf("%v", platform["id"])
			}

			configured, _ := platform["configured"].(bool)
			healthy, _ := platform["healthy"].(bool)
			comingSoon, _ := platform["comingSoon"].(bool)

			configStr := "✗ No"
			healthStr := "✗ Down"

			if configured {
				configStr = "✓ Yes"
			}
			if healthy {
				healthStr = "✓ OK"
			}

			if comingSoon {
				configStr = "—"
				healthStr = "—"
				ui.PrintKeyValue(name, fmt.Sprintf("configured: %s  health: %s  (coming soon)", configStr, healthStr))
			} else {
				// Check circuit breaker
				if cb, ok := platform["circuitBreaker"].(map[string]interface{}); ok {
					if open, _ := cb["open"].(bool); open {
						healthStr = "✗ Circuit open"
					}
				}
				ui.PrintKeyValue(name, fmt.Sprintf("configured: %s  health: %s", configStr, healthStr))
			}
		}

		return nil
	},
}

// --- social history ---

var socialHistoryCmd = &cobra.Command{
	Use:   "history",
	Short: "Show recent broadcast history",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if cfg.JSONMode {
			return printJSON(map[string]interface{}{
				"note":       "Broadcast history requires direct D1 access",
				"suggestion": "View history at /arbor/zephyr in the admin dashboard",
			})
		}

		ui.Info("Broadcast history is available in the admin dashboard")
		ui.Muted("  Visit: grove.place/arbor/zephyr")
		fmt.Println()
		ui.Muted("Direct CLI history requires a dedicated API endpoint (coming soon).")

		return nil
	},
}

// --- social setup ---

var socialSetupCmd = &cobra.Command{
	Use:   "setup",
	Short: "Show setup instructions for social platforms",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if cfg.JSONMode {
			return printJSON(map[string]interface{}{
				"platforms": map[string]interface{}{
					"bluesky": map[string]interface{}{
						"steps": []string{
							"Go to bsky.app → Settings → App Passwords",
							"Create a new app password (name it grove-zephyr)",
							"Copy the generated password",
							"Run: wrangler secret put BLUESKY_HANDLE",
							"Run: wrangler secret put BLUESKY_APP_PASSWORD",
						},
					},
				},
				"api_key": map[string]interface{}{
					"options": []string{
						"Set ZEPHYR_API_KEY env var",
						"Store in vault: gw secret set ZEPHYR_API_KEY",
					},
				},
			})
		}

		fmt.Println()
		ui.PrintHeader("Social Platform Setup")
		fmt.Println()

		fmt.Println("  API Key Configuration:")
		fmt.Println("    Option 1: Set ZEPHYR_API_KEY environment variable")
		fmt.Println("    Option 2: Store in vault: gw secret set ZEPHYR_API_KEY")
		fmt.Println()

		fmt.Println("  Bluesky Setup:")
		fmt.Println("    1. Go to bsky.app → Settings → App Passwords")
		fmt.Println("    2. Create a new app password (name it \"grove-zephyr\")")
		fmt.Println("    3. Copy the generated password")
		fmt.Println("    4. Set the secrets:")
		ui.Muted("       wrangler secret put BLUESKY_HANDLE")
		fmt.Println("         → e.g. autumn.bsky.social")
		ui.Muted("       wrangler secret put BLUESKY_APP_PASSWORD")
		fmt.Println("         → paste the generated password")
		fmt.Println()

		fmt.Println("  5. Test it:")
		fmt.Println("     gw social post --write \"Hello from Grove!\"")
		fmt.Println()
		ui.Muted("  Mastodon and DEV.to support coming soon.")
		fmt.Println()

		return nil
	},
}

func init() {
	rootCmd.AddCommand(socialCmd)

	// social post
	socialPostCmd.Flags().StringSliceP("platform", "p", []string{"bluesky"}, "Target platform(s)")
	socialCmd.AddCommand(socialPostCmd)

	// social status
	socialCmd.AddCommand(socialStatusCmd)

	// social history
	socialCmd.AddCommand(socialHistoryCmd)

	// social setup
	socialCmd.AddCommand(socialSetupCmd)
}
