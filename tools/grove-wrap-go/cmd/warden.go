package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

// wardenBaseURL is the base URL for the Grove Warden service.
const wardenBaseURL = "https://warden.grove.place"

// wardenUserAgent is the User-Agent sent with all Warden requests.
const wardenUserAgent = "gw-cli/1.0 (Grove Wrap)"

// wardenCmd is the parent command for Grove Warden service management.
var wardenCmd = &cobra.Command{
	Use:   "warden",
	Short: "Grove Warden service management",
	Long:  "Manage agents, credentials, and audit logs for the Grove Warden gateway.",
}

// wardenAgentCmd groups agent management subcommands.
var wardenAgentCmd = &cobra.Command{
	Use:   "agent",
	Short: "Manage Warden agents",
}

// =============================================================================
// HTTP helpers
// =============================================================================

// wardenRequest builds an HTTP request against the Warden API.
// Auth key is pulled from the vault (WARDEN_ADMIN_KEY).
func wardenRequest(method, path string, adminKey string) (*http.Request, error) {
	url := wardenBaseURL + path
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", wardenUserAgent)
	if adminKey != "" {
		req.Header.Set("X-API-Key", adminKey)
	}
	return req, nil
}

// wardenRequestWithBody builds an HTTP request with a JSON body.
func wardenRequestWithBody(method, path string, body interface{}, adminKey string) (*http.Request, error) {
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
	if adminKey != "" {
		req.Header.Set("X-API-Key", adminKey)
	}
	return req, nil
}

// wardenDoRequest executes an HTTP request and reads the response body.
func wardenDoRequest(req *http.Request) (int, []byte, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

// getWardenAdminKey reads WARDEN_ADMIN_KEY from the local vault.
func getWardenAdminKey() (string, error) {
	password, err := vault.GetVaultPassword()
	if err != nil {
		return "", fmt.Errorf("vault password required: %w", err)
	}

	v, err := vault.UnlockOrCreate(password)
	if err != nil {
		return "", fmt.Errorf("failed to unlock vault: %w", err)
	}

	key, ok := v.Get("WARDEN_ADMIN_KEY")
	if !ok || key == "" {
		return "", fmt.Errorf("WARDEN_ADMIN_KEY not found in vault — run: gw secret set WARDEN_ADMIN_KEY")
	}

	return key, nil
}

// =============================================================================
// warden status
// =============================================================================

var wardenStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check Warden service health",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		req, err := wardenRequest(http.MethodGet, "/health", "")
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

// =============================================================================
// warden test
// =============================================================================

var wardenTestCmd = &cobra.Command{
	Use:   "test",
	Short: "Probe Warden connectivity with timing",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		req, err := wardenRequest(http.MethodGet, "/health", "")
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		start := time.Now()
		statusCode, body, err := wardenDoRequest(req)
		elapsed := time.Since(start)

		if err != nil {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"reachable":  false,
					"error":      err.Error(),
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

// =============================================================================
// warden agent list
// =============================================================================

var wardenAgentListCmd = &cobra.Command{
	Use:   "list",
	Short: "List registered Warden agents",
	RunE: func(cmd *cobra.Command, args []string) error {
		adminKey, err := getWardenAdminKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		req, err := wardenRequest(http.MethodGet, "/admin/agents", adminKey)
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

		// Parse Warden's envelope: { success, data: { agents, total } }
		var envelope struct {
			Success bool `json:"success"`
			Data    struct {
				Agents []struct {
					ID           string          `json:"id"`
					Name         string          `json:"name"`
					Owner        string          `json:"owner"`
					Scopes       json.RawMessage `json:"scopes"`
					RateLimitRPM int             `json:"rate_limit_rpm"`
					RateLimitDay int             `json:"rate_limit_daily"`
					Enabled      bool            `json:"enabled"`
					CreatedAt    string          `json:"created_at"`
					LastUsedAt   *string         `json:"last_used_at"`
					RequestCount int             `json:"request_count"`
				} `json:"agents"`
				Total int `json:"total"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &envelope); err != nil {
			// Fallback: print raw
			fmt.Println(string(body))
			return nil
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
			return nil
		}

		agents := envelope.Data.Agents
		if len(agents) == 0 {
			ui.Muted("No agents registered")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Warden Agents (%d)", len(agents)))
		fmt.Println()
		for _, agent := range agents {
			status := "active"
			if !agent.Enabled {
				status = "revoked"
			}

			var scopes []string
			_ = json.Unmarshal(agent.Scopes, &scopes)

			ui.PrintKeyValue("Name", agent.Name)
			ui.PrintKeyValue("  ID", agent.ID)
			ui.PrintKeyValue("  Owner", agent.Owner)
			ui.PrintKeyValue("  Scopes", strings.Join(scopes, ", "))
			ui.PrintKeyValue("  Rate Limits", fmt.Sprintf("%d RPM / %d daily", agent.RateLimitRPM, agent.RateLimitDay))
			ui.PrintKeyValue("  Status", status)
			ui.PrintKeyValue("  Requests", fmt.Sprintf("%d", agent.RequestCount))
			if agent.LastUsedAt != nil {
				ui.PrintKeyValue("  Last Used", *agent.LastUsedAt)
			}
			fmt.Println()
		}

		return nil
	},
}

// =============================================================================
// warden agent enroll
// =============================================================================

var wardenAgentEnrollCmd = &cobra.Command{
	Use:   "enroll",
	Short: "Enroll a new agent with Warden",
	Long: `Enroll a new agent with Warden and optionally deploy its API key.

This registers the agent, saves the returned secret to the local vault,
and can auto-deploy it to a Cloudflare Worker via wrangler.

Example:
  gw warden agent enroll --write \
    --name grove-lumen \
    --owner system \
    --scopes "openrouter:*" \
    --rpm 600 --daily 50000 \
    --apply-to grove-lumen`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("warden_agent_register"); err != nil {
			return err
		}

		adminKey, err := getWardenAdminKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		name, _ := cmd.Flags().GetString("name")
		owner, _ := cmd.Flags().GetString("owner")
		scopesRaw, _ := cmd.Flags().GetString("scopes")
		rpm, _ := cmd.Flags().GetInt("rpm")
		daily, _ := cmd.Flags().GetInt("daily")
		applyTo, _ := cmd.Flags().GetString("apply-to")
		secretName, _ := cmd.Flags().GetString("secret-name")

		if name == "" {
			return fmt.Errorf("--name is required")
		}
		if err := validateCFName(name, "agent name"); err != nil {
			return err
		}
		if owner == "" {
			owner = "system"
		}

		// Parse scopes: comma-separated → array
		scopes := []string{}
		if scopesRaw != "" {
			for _, s := range strings.Split(scopesRaw, ",") {
				s = strings.TrimSpace(s)
				if s != "" {
					scopes = append(scopes, s)
				}
			}
		}
		if len(scopes) == 0 {
			return fmt.Errorf("--scopes is required (e.g., --scopes \"openrouter:*\")")
		}

		// Default secret name for vault storage
		if secretName == "" {
			// grove-lumen → LUMEN_WARDEN_API_KEY
			cleanName := strings.TrimPrefix(name, "grove-")
			secretName = strings.ToUpper(strings.ReplaceAll(cleanName, "-", "_")) + "_WARDEN_API_KEY"
		}

		// Call Warden admin API
		reqBody := map[string]interface{}{
			"name":            name,
			"owner":           owner,
			"scopes":          scopes,
			"rate_limit_rpm":  rpm,
			"rate_limit_daily": daily,
		}

		req, err := wardenRequestWithBody(http.MethodPost, "/admin/agents", reqBody, adminKey)
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

		// Parse response to extract the agent secret
		var envelope struct {
			Success bool `json:"success"`
			Data    struct {
				ID      string   `json:"id"`
				Name    string   `json:"name"`
				Owner   string   `json:"owner"`
				Scopes  []string `json:"scopes"`
				Secret  string   `json:"secret"`
				RPM     int      `json:"rate_limit_rpm"`
				Daily   int      `json:"rate_limit_daily"`
				Message string   `json:"message"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &envelope); err != nil {
			return fmt.Errorf("failed to parse Warden response: %w", err)
		}

		if !envelope.Success || envelope.Data.Secret == "" {
			return fmt.Errorf("enrollment failed: %s", string(body))
		}

		// Save the secret to the vault
		password, err := vault.GetVaultPassword()
		if err != nil {
			return fmt.Errorf("vault password required to save agent secret: %w", err)
		}

		v, err := vault.UnlockOrCreate(password)
		if err != nil {
			return fmt.Errorf("failed to unlock vault: %w", err)
		}

		if err := v.Set(secretName, envelope.Data.Secret); err != nil {
			return fmt.Errorf("failed to save secret to vault: %w", err)
		}

		// Output results
		if cfg.JSONMode {
			result := map[string]interface{}{
				"enrolled":    true,
				"agent_id":    envelope.Data.ID,
				"agent_name":  envelope.Data.Name,
				"owner":       envelope.Data.Owner,
				"scopes":      envelope.Data.Scopes,
				"rpm":         envelope.Data.RPM,
				"daily":       envelope.Data.Daily,
				"vault_key":   secretName,
				"applied_to":  applyTo,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Agent enrolled: %s", envelope.Data.Name))
			ui.PrintKeyValue("Agent ID", envelope.Data.ID)
			ui.PrintKeyValue("Owner", envelope.Data.Owner)
			ui.PrintKeyValue("Scopes", strings.Join(envelope.Data.Scopes, ", "))
			ui.PrintKeyValue("Rate Limits", fmt.Sprintf("%d RPM / %d daily", envelope.Data.RPM, envelope.Data.Daily))
			ui.PrintKeyValue("Vault Key", secretName)
		}

		// Auto-deploy if --apply-to is set
		if applyTo != "" {
			if !cfg.JSONMode {
				fmt.Println()
				ui.Info(fmt.Sprintf("Deploying %s → %s...", secretName, applyTo))
			}

			// Use wrangler secret put via stdin (never in process args)
			wranglerArgs := []string{"secret", "put", "WARDEN_API_KEY", "--name", applyTo}
			result, err := exec.WranglerWithStdin(envelope.Data.Secret, wranglerArgs...)
			if err != nil {
				if !cfg.JSONMode {
					ui.Step(false, fmt.Sprintf("Deploy failed: %s", err.Error()))
					ui.Warning("Secret is saved in vault — deploy manually with: gw secret apply " + secretName + " --worker " + applyTo)
				}
				return nil
			}

			if !result.OK() {
				if !cfg.JSONMode {
					ui.Step(false, fmt.Sprintf("Deploy failed: %s", result.Stderr))
					ui.Warning("Secret is saved in vault — deploy manually with: gw secret apply " + secretName + " --worker " + applyTo)
				}
				return nil
			}

			// Record deployment in vault
			_ = v.RecordDeployment(secretName, applyTo)

			if !cfg.JSONMode {
				ui.Step(true, fmt.Sprintf("WARDEN_API_KEY deployed to %s", applyTo))
			}
		}

		return nil
	},
}

// =============================================================================
// warden agent revoke
// =============================================================================

var wardenAgentRevokeCmd = &cobra.Command{
	Use:   "revoke <agent_id>",
	Short: "Revoke a registered Warden agent",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("warden_agent_revoke"); err != nil {
			return err
		}

		adminKey, err := getWardenAdminKey()
		if err != nil {
			return err
		}

		cfg := config.Get()
		agentID := args[0]
		if err := validateCFName(agentID, "agent ID"); err != nil {
			return err
		}

		req, err := wardenRequest(http.MethodDelete, "/admin/agents/"+agentID, adminKey)
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

// =============================================================================
// warden logs
// =============================================================================

var wardenLogsCmd = &cobra.Command{
	Use:   "logs",
	Short: "Fetch Warden audit logs",
	RunE: func(cmd *cobra.Command, args []string) error {
		adminKey, err := getWardenAdminKey()
		if err != nil {
			return err
		}

		cfg := config.Get()
		limit, _ := cmd.Flags().GetInt("limit")
		service, _ := cmd.Flags().GetString("service")
		agentFilter, _ := cmd.Flags().GetString("agent")

		if limit < 1 {
			limit = 1
		}
		if limit > 500 {
			limit = 500
		}

		// Build query string
		query := fmt.Sprintf("/admin/logs?limit=%d", limit)
		if service != "" {
			query += "&service=" + service
		}
		if agentFilter != "" {
			query += "&agent_id=" + agentFilter
		}

		req, err := wardenRequest(http.MethodGet, query, adminKey)
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
			fmt.Println(string(body))
			return nil
		}

		// Parse Warden's envelope: { success, data: { entries, total } }
		var envelope struct {
			Success bool `json:"success"`
			Data    struct {
				Entries []struct {
					AgentName     *string `json:"agent_name"`
					TargetService string  `json:"target_service"`
					Action        string  `json:"action"`
					AuthResult    string  `json:"auth_result"`
					EventType     string  `json:"event_type"`
					TenantID      *string `json:"tenant_id"`
					LatencyMs     int     `json:"latency_ms"`
					CreatedAt     string  `json:"created_at"`
				} `json:"entries"`
				Total int `json:"total"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &envelope); err != nil {
			fmt.Println(string(body))
			return nil
		}

		entries := envelope.Data.Entries
		if len(entries) == 0 {
			ui.Muted("No audit logs found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Warden Audit Logs (%d)", len(entries)))
		fmt.Println()
		for _, entry := range entries {
			ts := entry.CreatedAt
			if len(ts) > 19 {
				ts = ts[:19]
			}

			agent := "—"
			if entry.AgentName != nil {
				agent = *entry.AgentName
			}

			tenant := ""
			if entry.TenantID != nil {
				tenant = fmt.Sprintf("  tenant=%s", *entry.TenantID)
			}

			result := entry.AuthResult
			icon := "  "
			if result == "success" {
				icon = "  "
			} else {
				icon = "  "
			}

			ui.PrintKeyValue(
				fmt.Sprintf("%s%s", icon, ts),
				fmt.Sprintf("%-12s %-20s %-16s %dms%s",
					entry.EventType, agent, entry.TargetService+"/"+entry.Action,
					entry.LatencyMs, tenant),
			)
		}

		return nil
	},
}

// =============================================================================
// Help categories
// =============================================================================

var wardenHelpCategories = []ui.HelpCategory{
	{
		Title: "Read (Always Safe)",
		Icon:  "eye",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "status", Desc: "Check Warden service health"},
			{Name: "test", Desc: "Probe connectivity with timing"},
			{Name: "agent list", Desc: "List registered agents"},
			{Name: "logs", Desc: "Fetch audit logs"},
		},
	},
	{
		Title: "Write (--write)",
		Icon:  "pencil",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "agent enroll", Desc: "Register a new agent + save secret to vault"},
		},
	},
	{
		Title: "Dangerous (--write --force)",
		Icon:  "flame",
		Style: ui.DangerStyle,
		Commands: []ui.HelpCommand{
			{Name: "agent revoke <id>", Desc: "Disable an agent (irreversible)"},
		},
	},
}

// =============================================================================
// Registration
// =============================================================================

func init() {
	rootCmd.AddCommand(wardenCmd)

	// Custom help
	wardenCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		if cmd != wardenCmd {
			fmt.Println(cmd.UsageString())
			return
		}
		output := ui.RenderCozyHelp(
			"gw warden",
			"grove's API gateway — agents, credentials, audit logs",
			wardenHelpCategories,
			true,
		)
		fmt.Print(output)
	})

	// warden status
	wardenCmd.AddCommand(wardenStatusCmd)

	// warden test
	wardenCmd.AddCommand(wardenTestCmd)

	// warden agent (parent)
	wardenCmd.AddCommand(wardenAgentCmd)

	// warden agent list
	wardenAgentCmd.AddCommand(wardenAgentListCmd)

	// warden agent enroll
	wardenAgentEnrollCmd.Flags().String("name", "", "Agent name (required, e.g., grove-lumen)")
	wardenAgentEnrollCmd.Flags().String("owner", "system", "Agent owner")
	wardenAgentEnrollCmd.Flags().String("scopes", "", "Comma-separated scopes (required, e.g., \"openrouter:*\")")
	wardenAgentEnrollCmd.Flags().Int("rpm", 60, "Rate limit: requests per minute")
	wardenAgentEnrollCmd.Flags().Int("daily", 1000, "Rate limit: requests per day")
	wardenAgentEnrollCmd.Flags().String("apply-to", "", "Auto-deploy WARDEN_API_KEY to this Cloudflare Worker")
	wardenAgentEnrollCmd.Flags().String("secret-name", "", "Vault key name (default: <NAME>_WARDEN_API_KEY)")
	wardenAgentCmd.AddCommand(wardenAgentEnrollCmd)

	// warden agent revoke
	wardenAgentCmd.AddCommand(wardenAgentRevokeCmd)

	// warden logs
	wardenLogsCmd.Flags().IntP("limit", "n", 50, "Maximum log entries to return")
	wardenLogsCmd.Flags().StringP("service", "s", "", "Filter by service (e.g., openrouter)")
	wardenLogsCmd.Flags().StringP("agent", "a", "", "Filter by agent ID")
	wardenCmd.AddCommand(wardenLogsCmd)
}
