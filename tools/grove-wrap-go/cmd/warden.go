package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// wardenBaseURL is the base URL for the Grove Warden service.
const wardenBaseURL = "https://warden.grove.place"

// wardenUserAgent is the User-Agent sent with all Warden requests.
const wardenUserAgent = "gw-cli/1.0 (Grove Wrap)"

// wardenCmd is the parent command for Grove Warden service management.
var wardenCmd = &cobra.Command{
	Use:   "warden",
	Short: "Grove Warden service management",
	Long:  "Manage and inspect the Grove Warden service.",
}

// wardenAgentCmd groups agent management subcommands.
var wardenAgentCmd = &cobra.Command{
	Use:   "agent",
	Short: "Manage Warden agents",
}

// wardenRequest builds an HTTP request against the Warden API.
// It sets the User-Agent header and, if WARDEN_ADMIN_KEY is set, the Authorization header.
func wardenRequest(method, path string) (*http.Request, error) {
	url := wardenBaseURL + path
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", wardenUserAgent)
	if key := os.Getenv("WARDEN_ADMIN_KEY"); key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	return req, nil
}

// wardenRequestWithBody builds an HTTP request with a JSON body.
func wardenRequestWithBody(method, path string, body interface{}) (*http.Request, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request body: %w", err)
	}
	url := wardenBaseURL + path
	req, err := http.NewRequest(method, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", wardenUserAgent)
	req.Header.Set("Content-Type", "application/json")
	if key := os.Getenv("WARDEN_ADMIN_KEY"); key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	return req, nil
}

// wardenDoRequest executes an HTTP request and reads the response body.
func wardenDoRequest(req *http.Request) (int, []byte, error) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

// requireWardenKey returns an error if WARDEN_ADMIN_KEY is not set.
func requireWardenKey() error {
	if os.Getenv("WARDEN_ADMIN_KEY") == "" {
		return fmt.Errorf("WARDEN_ADMIN_KEY environment variable is required for this command")
	}
	return nil
}

// --- warden status ---

var wardenStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check Warden service health",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		req, err := wardenRequest(http.MethodGet, "/health")
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := wardenDoRequest(req)
		if err != nil {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"healthy": false,
					"error":   err.Error(),
				})
				fmt.Println(string(data))
			} else {
				ui.Step(false, fmt.Sprintf("Warden unreachable: %s", err.Error()))
			}
			return nil
		}

		healthy := statusCode == http.StatusOK

		if cfg.JSONMode {
			var result json.RawMessage
			if json.Unmarshal(body, &result) != nil {
				result = json.RawMessage(`{}`)
			}
			data, _ := json.Marshal(map[string]interface{}{
				"healthy":     healthy,
				"status_code": statusCode,
				"body":        result,
			})
			fmt.Println(string(data))
			return nil
		}

		ui.Step(healthy, fmt.Sprintf("Warden — HTTP %d", statusCode))
		if healthy {
			ui.Success("Warden is healthy")
		} else {
			ui.Warning(fmt.Sprintf("Warden returned HTTP %d", statusCode))
		}

		return nil
	},
}

// --- warden test ---

var wardenTestCmd = &cobra.Command{
	Use:   "test",
	Short: "Probe Warden connectivity with timing",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		req, err := wardenRequest(http.MethodGet, "/health")
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		start := time.Now()
		statusCode, body, err := wardenDoRequest(req)
		elapsed := time.Since(start)

		if err != nil {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"reachable": false,
					"error":     err.Error(),
					"latency_ms": elapsed.Milliseconds(),
				})
				fmt.Println(string(data))
			} else {
				ui.Step(false, fmt.Sprintf("Warden unreachable after %dms: %s", elapsed.Milliseconds(), err.Error()))
			}
			return nil
		}

		healthy := statusCode == http.StatusOK
		latencyMS := elapsed.Milliseconds()

		if cfg.JSONMode {
			var result json.RawMessage
			if json.Unmarshal(body, &result) != nil {
				result = json.RawMessage(`{}`)
			}
			data, _ := json.Marshal(map[string]interface{}{
				"reachable":   true,
				"healthy":     healthy,
				"status_code": statusCode,
				"latency_ms":  latencyMS,
				"body":        result,
			})
			fmt.Println(string(data))
			return nil
		}

		ui.Step(healthy, fmt.Sprintf("Warden connectivity — HTTP %d  (%dms)", statusCode, latencyMS))
		if healthy {
			ui.PrintKeyValue("Latency", fmt.Sprintf("%dms", latencyMS))
		} else {
			ui.Warning(fmt.Sprintf("Unexpected HTTP %d from Warden", statusCode))
		}

		return nil
	},
}

// --- warden agent list ---

var wardenAgentListCmd = &cobra.Command{
	Use:   "list",
	Short: "List registered Warden agents",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireWardenKey(); err != nil {
			return err
		}

		cfg := config.Get()

		req, err := wardenRequest(http.MethodGet, "/api/agents")
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := wardenDoRequest(req)
		if err != nil {
			return fmt.Errorf("Warden request failed: %w", err)
		}
		if statusCode != http.StatusOK {
			return fmt.Errorf("Warden returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			var result json.RawMessage
			if json.Unmarshal(body, &result) != nil {
				result = json.RawMessage("[]")
			}
			data, _ := json.Marshal(map[string]interface{}{
				"agents": result,
			})
			fmt.Println(string(data))
			return nil
		}

		var agents []map[string]interface{}
		if err := json.Unmarshal(body, &agents); err != nil {
			// Print raw if not an array
			fmt.Println(string(body))
			return nil
		}

		if len(agents) == 0 {
			ui.Muted("No agents registered")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Warden Agents (%d)", len(agents)))
		for _, agent := range agents {
			id := fmt.Sprintf("%v", agent["id"])
			name := fmt.Sprintf("%v", agent["name"])
			status := fmt.Sprintf("%v", agent["status"])
			if id == "<nil>" {
				id = ""
			}
			ui.PrintKeyValue(
				fmt.Sprintf("%-36s", id),
				fmt.Sprintf("%-24s  status: %s", name, status),
			)
		}

		return nil
	},
}

// --- warden agent register ---

var wardenAgentRegisterCmd = &cobra.Command{
	Use:   "register",
	Short: "Register a new Warden agent",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("warden_agent_register"); err != nil {
			return err
		}
		if err := requireWardenKey(); err != nil {
			return err
		}

		cfg := config.Get()
		name, _ := cmd.Flags().GetString("name")
		if name == "" {
			return fmt.Errorf("--name is required")
		}
		if err := validateCFName(name, "agent name"); err != nil {
			return err
		}

		req, err := wardenRequestWithBody(http.MethodPost, "/api/agents", map[string]interface{}{
			"name": name,
		})
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := wardenDoRequest(req)
		if err != nil {
			return fmt.Errorf("Warden request failed: %w", err)
		}
		if statusCode < 200 || statusCode >= 300 {
			return fmt.Errorf("Warden returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			var result json.RawMessage
			if json.Unmarshal(body, &result) != nil {
				result = json.RawMessage(`{}`)
			}
			data, _ := json.Marshal(map[string]interface{}{
				"registered": true,
				"name":       name,
				"response":   result,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Agent registered: %s", name))
			// Try to print returned ID
			var respObj map[string]interface{}
			if json.Unmarshal(body, &respObj) == nil {
				if id, ok := respObj["id"]; ok {
					ui.PrintKeyValue("Agent ID", fmt.Sprintf("%v", id))
				}
			}
		}

		return nil
	},
}

// --- warden agent revoke ---

var wardenAgentRevokeCmd = &cobra.Command{
	Use:   "revoke <agent_id>",
	Short: "Revoke a registered Warden agent",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("warden_agent_revoke"); err != nil {
			return err
		}
		if err := requireWardenKey(); err != nil {
			return err
		}

		cfg := config.Get()
		agentID := args[0]
		if err := validateCFName(agentID, "agent ID"); err != nil {
			return err
		}

		req, err := wardenRequest(http.MethodDelete, "/api/agents/"+agentID)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := wardenDoRequest(req)
		if err != nil {
			return fmt.Errorf("Warden request failed: %w", err)
		}
		if statusCode != http.StatusOK && statusCode != http.StatusNoContent {
			return fmt.Errorf("Warden returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"revoked":  true,
				"agent_id": agentID,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Agent revoked: %s", agentID))
		}

		return nil
	},
}

// --- warden logs ---

var wardenLogsCmd = &cobra.Command{
	Use:   "logs",
	Short: "Fetch Warden audit logs",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireWardenKey(); err != nil {
			return err
		}

		cfg := config.Get()
		limit, _ := cmd.Flags().GetInt("limit")
		if limit < 1 {
			limit = 1
		}
		if limit > 1000 {
			limit = 1000
		}

		req, err := wardenRequest(http.MethodGet, fmt.Sprintf("/api/audit?limit=%d", limit))
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := wardenDoRequest(req)
		if err != nil {
			return fmt.Errorf("Warden request failed: %w", err)
		}
		if statusCode != http.StatusOK {
			return fmt.Errorf("Warden returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			var result json.RawMessage
			if json.Unmarshal(body, &result) != nil {
				result = json.RawMessage("[]")
			}
			data, _ := json.Marshal(map[string]interface{}{
				"logs":  result,
				"limit": limit,
			})
			fmt.Println(string(data))
			return nil
		}

		var logs []map[string]interface{}
		if err := json.Unmarshal(body, &logs); err != nil {
			// Might be wrapped — print raw
			fmt.Println(string(body))
			return nil
		}

		if len(logs) == 0 {
			ui.Muted("No audit logs found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Warden Audit Logs (%d)", len(logs)))
		for _, entry := range logs {
			ts := fmt.Sprintf("%v", entry["timestamp"])
			if len(ts) > 19 {
				ts = ts[:19]
			}
			action := fmt.Sprintf("%v", entry["action"])
			actor := fmt.Sprintf("%v", entry["actor"])
			if actor == "<nil>" {
				actor = "—"
			}

			ui.PrintKeyValue(
				fmt.Sprintf("  %-20s", ts),
				fmt.Sprintf("%-30s  actor: %s", action, actor),
			)
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(wardenCmd)

	// warden status
	wardenCmd.AddCommand(wardenStatusCmd)

	// warden test
	wardenCmd.AddCommand(wardenTestCmd)

	// warden agent (parent)
	wardenCmd.AddCommand(wardenAgentCmd)

	// warden agent list
	wardenAgentCmd.AddCommand(wardenAgentListCmd)

	// warden agent register
	wardenAgentRegisterCmd.Flags().String("name", "", "Name for the new agent (required)")
	wardenAgentCmd.AddCommand(wardenAgentRegisterCmd)

	// warden agent revoke
	wardenAgentCmd.AddCommand(wardenAgentRevokeCmd)

	// warden logs
	wardenLogsCmd.Flags().IntP("limit", "n", 50, "Maximum log entries to return")
	wardenCmd.AddCommand(wardenLogsCmd)
}
