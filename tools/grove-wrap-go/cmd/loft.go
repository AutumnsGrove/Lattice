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
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

// loftBaseURL is the base URL for the Grove Loft service.
const loftBaseURL = "https://loft.grove.place"

// loftUserAgent is the User-Agent sent with all Loft requests.
const loftUserAgent = "gw-cli/1.0 (Grove Wrap)"

// loftCmd is the parent command for Loft ephemeral dev environments.
var loftCmd = &cobra.Command{
	Use:   "loft",
	Short: "Ephemeral dev environments",
	Long:  "Provision and manage code-server + SSH environments on Fly.io.",
}

// loftSSHKeyCmd groups SSH key management subcommands.
var loftSSHKeyCmd = &cobra.Command{
	Use:   "ssh-key",
	Short: "Manage SSH public key",
}

// =============================================================================
// HTTP helpers
// =============================================================================

// loftRequest builds an HTTP request against the Loft API.
func loftRequest(method, path string, apiKey string) (*http.Request, error) {
	url := loftBaseURL + path
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", loftUserAgent)
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	return req, nil
}

// loftRequestWithBody builds an HTTP request with a JSON body.
func loftRequestWithBody(method, path string, body interface{}, apiKey string) (*http.Request, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request body: %w", err)
	}
	url := loftBaseURL + path
	req, err := http.NewRequest(method, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", loftUserAgent)
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	return req, nil
}

// loftDoRequest executes an HTTP request and reads the response body.
func loftDoRequest(req *http.Request) (int, []byte, error) {
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

// getLoftAPIKey reads LOFT_API_KEY from the local vault.
func getLoftAPIKey() (string, error) {
	password, err := vault.GetVaultPassword()
	if err != nil {
		return "", fmt.Errorf("vault password required: %w", err)
	}

	v, err := vault.UnlockOrCreate(password)
	if err != nil {
		return "", fmt.Errorf("failed to unlock vault: %w", err)
	}

	key, ok := v.Get("LOFT_API_KEY")
	if !ok || key == "" {
		return "", fmt.Errorf("LOFT_API_KEY not found in vault — run: gw secret vault set LOFT_API_KEY <key>")
	}

	return key, nil
}

// =============================================================================
// loft status
// =============================================================================

var loftStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check active instance info + idle time",
	RunE: func(cmd *cobra.Command, args []string) error {
		apiKey, err := getLoftAPIKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		req, err := loftRequest(http.MethodGet, "/status", apiKey)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := loftDoRequest(req)
		if err != nil {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"reachable": false,
					"error":     err.Error(),
				})
				fmt.Println(string(data))
			} else {
				ui.Step(false, fmt.Sprintf("Loft unreachable: %s", err.Error()))
			}
			return nil
		}

		if statusCode != http.StatusOK {
			return fmt.Errorf("Loft returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
			return nil
		}

		var envelope struct {
			Success bool `json:"success"`
			Data    struct {
				Active    bool `json:"active"`
				Instances []struct {
					InstanceID       string `json:"instanceId"`
					ProviderServerID string `json:"providerServerId"`
					Status           string `json:"status"`
					Region           string `json:"region"`
					CreatedAt        string `json:"createdAt"`
					IdleMinutes      int    `json:"idleMinutes"`
					RemainingMinutes int    `json:"remainingMinutes"`
					CodeServerURL    string `json:"codeServerUrl"`
				} `json:"instances"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &envelope); err != nil {
			fmt.Println(string(body))
			return nil
		}

		if !envelope.Data.Active {
			ui.Muted("No active instances")
			return nil
		}

		ui.PrintHeader("Loft Status")
		fmt.Println()
		for _, inst := range envelope.Data.Instances {
			ui.PrintKeyValue("Instance", inst.InstanceID)
			ui.PrintKeyValue("  Status", inst.Status)
			ui.PrintKeyValue("  Region", inst.Region)
			ui.PrintKeyValue("  Created", inst.CreatedAt)
			ui.PrintKeyValue("  Idle", fmt.Sprintf("%d min", inst.IdleMinutes))
			ui.PrintKeyValue("  Remaining", fmt.Sprintf("%d min", inst.RemainingMinutes))
			ui.PrintKeyValue("  Code Server", inst.CodeServerURL)
			fmt.Println()
		}

		return nil
	},
}

// =============================================================================
// loft sessions
// =============================================================================

var loftSessionsCmd = &cobra.Command{
	Use:   "sessions",
	Short: "Recent session history",
	RunE: func(cmd *cobra.Command, args []string) error {
		apiKey, err := getLoftAPIKey()
		if err != nil {
			return err
		}

		cfg := config.Get()
		limit, _ := cmd.Flags().GetInt("limit")
		if limit < 1 {
			limit = 1
		}
		if limit > 100 {
			limit = 100
		}

		req, err := loftRequest(http.MethodGet, fmt.Sprintf("/sessions?limit=%d", limit), apiKey)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := loftDoRequest(req)
		if err != nil {
			return fmt.Errorf("Loft request failed: %w", err)
		}
		if statusCode != http.StatusOK {
			return fmt.Errorf("Loft returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
			return nil
		}

		var envelope struct {
			Success bool `json:"success"`
			Data    struct {
				Sessions []struct {
					ID          string  `json:"id"`
					InstanceID  string  `json:"instanceId"`
					Region      string  `json:"region"`
					Size        string  `json:"size"`
					StartedAt   *string `json:"startedAt"`
					EndedAt     *string `json:"endedAt"`
					DurationMin *int    `json:"durationMin"`
					Status      string  `json:"status"`
				} `json:"sessions"`
				Total int `json:"total"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &envelope); err != nil {
			fmt.Println(string(body))
			return nil
		}

		sessions := envelope.Data.Sessions
		if len(sessions) == 0 {
			ui.Muted("No sessions found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Loft Sessions (%d)", len(sessions)))
		fmt.Println()
		for _, s := range sessions {
			started := "—"
			if s.StartedAt != nil {
				started = *s.StartedAt
			}
			duration := "—"
			if s.DurationMin != nil {
				duration = fmt.Sprintf("%d min", *s.DurationMin)
			}

			ui.PrintKeyValue("Session", s.ID[:8])
			ui.PrintKeyValue("  Status", s.Status)
			ui.PrintKeyValue("  Region", s.Region)
			ui.PrintKeyValue("  Started", started)
			ui.PrintKeyValue("  Duration", duration)
			fmt.Println()
		}

		return nil
	},
}

// =============================================================================
// loft ignite
// =============================================================================

var loftIgniteCmd = &cobra.Command{
	Use:   "ignite",
	Short: "Provision a new dev environment",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("loft_ignite"); err != nil {
			return err
		}

		apiKey, err := getLoftAPIKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		req, err := loftRequest(http.MethodPost, "/ignite", apiKey)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		if !cfg.JSONMode {
			ui.Info("Igniting dev environment...")
		}

		statusCode, body, err := loftDoRequest(req)
		if err != nil {
			return fmt.Errorf("Loft request failed: %w", err)
		}
		if statusCode < 200 || statusCode >= 300 {
			return fmt.Errorf("Loft returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
			return nil
		}

		var envelope struct {
			Success bool `json:"success"`
			Data    struct {
				InstanceID        string `json:"instanceId"`
				ProviderServerID  string `json:"providerServerId"`
				CodeServerURL     string `json:"codeServerUrl"`
				CodeServerPassword string `json:"codeServerPassword"`
				SSHHost           string `json:"sshHost"`
				SSHUser           string `json:"sshUser"`
				Status            string `json:"status"`
				Region            string `json:"region"`
				HardCapAt         string `json:"hardCapAt"`
			} `json:"data"`
			Error *struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}

		if err := json.Unmarshal(body, &envelope); err != nil {
			return fmt.Errorf("failed to parse response: %w", err)
		}

		if !envelope.Success {
			msg := "ignite failed"
			if envelope.Error != nil {
				msg = envelope.Error.Message
			}
			return fmt.Errorf("%s", msg)
		}

		d := envelope.Data
		ui.Success("Dev environment ready!")
		fmt.Println()
		ui.PrintKeyValue("Instance", d.InstanceID)
		ui.PrintKeyValue("Region", d.Region)
		ui.PrintKeyValue("Status", d.Status)
		fmt.Println()
		ui.PrintKeyValue("Code Server", d.CodeServerURL)
		ui.PrintKeyValue("Password", d.CodeServerPassword)
		fmt.Println()
		ui.PrintKeyValue("SSH", fmt.Sprintf("ssh %s@%s", d.SSHUser, d.SSHHost))
		ui.PrintKeyValue("Hard Cap", d.HardCapAt)

		return nil
	},
}

// =============================================================================
// loft fade
// =============================================================================

var loftFadeCmd = &cobra.Command{
	Use:   "fade [instance_id]",
	Short: "Terminate active machine",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("loft_fade"); err != nil {
			return err
		}

		apiKey, err := getLoftAPIKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		// If no ID provided, get the active instance
		instanceID := ""
		if len(args) > 0 {
			instanceID = args[0]
		} else {
			// Look up active instance
			statusReq, err := loftRequest(http.MethodGet, "/status", apiKey)
			if err != nil {
				return fmt.Errorf("failed to build request: %w", err)
			}
			sc, sb, err := loftDoRequest(statusReq)
			if err != nil {
				return fmt.Errorf("failed to get status: %w", err)
			}
			if sc != http.StatusOK {
				return fmt.Errorf("status request failed: HTTP %d", sc)
			}

			var statusEnv struct {
				Data struct {
					Active    bool `json:"active"`
					Instances []struct {
						InstanceID string `json:"instanceId"`
					} `json:"instances"`
				} `json:"data"`
			}
			if err := json.Unmarshal(sb, &statusEnv); err != nil {
				return fmt.Errorf("failed to parse status: %w", err)
			}
			if !statusEnv.Data.Active || len(statusEnv.Data.Instances) == 0 {
				if cfg.JSONMode {
					data, _ := json.Marshal(map[string]interface{}{"faded": false, "error": "no active instance"})
					fmt.Println(string(data))
				} else {
					ui.Muted("No active instances to fade")
				}
				return nil
			}
			instanceID = statusEnv.Data.Instances[0].InstanceID
		}

		if !cfg.JSONMode {
			ui.Info(fmt.Sprintf("Fading %s...", instanceID[:8]))
		}

		req, err := loftRequest(http.MethodPost, "/fade/"+instanceID, apiKey)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := loftDoRequest(req)
		if err != nil {
			return fmt.Errorf("Loft request failed: %w", err)
		}
		if statusCode < 200 || statusCode >= 300 {
			return fmt.Errorf("Loft returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
		} else {
			ui.Success(fmt.Sprintf("Instance faded: %s", instanceID[:8]))
		}

		return nil
	},
}

// =============================================================================
// loft extend
// =============================================================================

var loftExtendCmd = &cobra.Command{
	Use:   "extend [instance_id]",
	Short: "Reset idle timer (keep-alive)",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("loft_extend"); err != nil {
			return err
		}

		apiKey, err := getLoftAPIKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		// If no ID provided, get the active instance
		instanceID := ""
		if len(args) > 0 {
			instanceID = args[0]
		} else {
			statusReq, err := loftRequest(http.MethodGet, "/status", apiKey)
			if err != nil {
				return fmt.Errorf("failed to build request: %w", err)
			}
			sc, sb, err := loftDoRequest(statusReq)
			if err != nil {
				return fmt.Errorf("failed to get status: %w", err)
			}
			if sc != http.StatusOK {
				return fmt.Errorf("status request failed: HTTP %d", sc)
			}

			var statusEnv struct {
				Data struct {
					Active    bool `json:"active"`
					Instances []struct {
						InstanceID string `json:"instanceId"`
					} `json:"instances"`
				} `json:"data"`
			}
			if err := json.Unmarshal(sb, &statusEnv); err != nil {
				return fmt.Errorf("failed to parse status: %w", err)
			}
			if !statusEnv.Data.Active || len(statusEnv.Data.Instances) == 0 {
				return fmt.Errorf("no active instance to extend")
			}
			instanceID = statusEnv.Data.Instances[0].InstanceID
		}

		req, err := loftRequest(http.MethodPost, "/activity/"+instanceID, apiKey)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := loftDoRequest(req)
		if err != nil {
			return fmt.Errorf("Loft request failed: %w", err)
		}
		if statusCode < 200 || statusCode >= 300 {
			return fmt.Errorf("Loft returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
		} else {
			ui.Success("Idle timer reset")
		}

		return nil
	},
}

// =============================================================================
// loft ssh-key show
// =============================================================================

var loftSSHKeyShowCmd = &cobra.Command{
	Use:   "show",
	Short: "Display stored SSH public key",
	RunE: func(cmd *cobra.Command, args []string) error {
		apiKey, err := getLoftAPIKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		req, err := loftRequest(http.MethodGet, "/config/ssh-key", apiKey)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := loftDoRequest(req)
		if err != nil {
			return fmt.Errorf("Loft request failed: %w", err)
		}
		if statusCode != http.StatusOK {
			return fmt.Errorf("Loft returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
			return nil
		}

		var envelope struct {
			Data struct {
				SSHKey *string `json:"sshKey"`
			} `json:"data"`
		}
		if err := json.Unmarshal(body, &envelope); err != nil {
			fmt.Println(string(body))
			return nil
		}

		if envelope.Data.SSHKey == nil || *envelope.Data.SSHKey == "" {
			ui.Muted("No SSH key configured")
			return nil
		}

		ui.PrintKeyValue("SSH Key", *envelope.Data.SSHKey)
		return nil
	},
}

// =============================================================================
// loft ssh-key set
// =============================================================================

var loftSSHKeySetCmd = &cobra.Command{
	Use:   "set <public_key>",
	Short: "Store SSH public key",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("loft_ssh_key_set"); err != nil {
			return err
		}

		apiKey, err := getLoftAPIKey()
		if err != nil {
			return err
		}

		cfg := config.Get()

		// Join args in case the key has spaces (e.g., "ssh-ed25519 AAAA... comment")
		sshKey := strings.Join(args, " ")

		reqBody := map[string]interface{}{
			"ssh_key": sshKey,
		}

		req, err := loftRequestWithBody(http.MethodPut, "/config/ssh-key", reqBody, apiKey)
		if err != nil {
			return fmt.Errorf("failed to build request: %w", err)
		}

		statusCode, body, err := loftDoRequest(req)
		if err != nil {
			return fmt.Errorf("Loft request failed: %w", err)
		}
		if statusCode < 200 || statusCode >= 300 {
			return fmt.Errorf("Loft returned HTTP %d: %s", statusCode, string(body))
		}

		if cfg.JSONMode {
			fmt.Println(string(body))
		} else {
			ui.Success("SSH key stored")
		}

		return nil
	},
}

// =============================================================================
// Help categories
// =============================================================================

var loftHelpCategories = []ui.HelpCategory{
	{
		Title: "Read (Always Safe)",
		Icon:  "eye",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "status", Desc: "Active instance info + idle time"},
			{Name: "sessions", Desc: "Recent session history"},
			{Name: "ssh-key show", Desc: "Display stored SSH key"},
		},
	},
	{
		Title: "Write (--write)",
		Icon:  "pencil",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "ignite", Desc: "Provision a new dev environment"},
			{Name: "fade [id]", Desc: "Terminate active machine"},
			{Name: "extend [id]", Desc: "Reset idle timer (keep-alive)"},
			{Name: "ssh-key set <key>", Desc: "Store SSH public key"},
		},
	},
}

// =============================================================================
// Registration
// =============================================================================

func init() {
	rootCmd.AddCommand(loftCmd)

	// Custom help
	loftCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		if cmd != loftCmd {
			fmt.Println(cmd.UsageString())
			return
		}
		output := ui.RenderCozyHelp(
			"gw loft",
			"ephemeral dev environments — code-server + SSH on Fly.io",
			loftHelpCategories,
			true,
		)
		fmt.Print(output)
	})

	// loft status
	loftCmd.AddCommand(loftStatusCmd)

	// loft sessions
	loftSessionsCmd.Flags().IntP("limit", "n", 20, "Maximum sessions to return")
	loftCmd.AddCommand(loftSessionsCmd)

	// loft ignite
	loftCmd.AddCommand(loftIgniteCmd)

	// loft fade
	loftCmd.AddCommand(loftFadeCmd)

	// loft extend
	loftCmd.AddCommand(loftExtendCmd)

	// loft ssh-key (parent)
	loftCmd.AddCommand(loftSSHKeyCmd)

	// loft ssh-key show
	loftSSHKeyCmd.AddCommand(loftSSHKeyShowCmd)

	// loft ssh-key set
	loftSSHKeyCmd.AddCommand(loftSSHKeySetCmd)
}
