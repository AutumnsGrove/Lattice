package cmd

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/heartwood"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

// groveTokenKey is the vault key for the Heartwood auth token.
const groveTokenKey = "GROVE_TOKEN"

// defaultPollInterval is the base polling interval for device code flow.
const defaultPollInterval = 5

// maxPollTime is the maximum time to wait for device authorization (15 min).
const maxPollTime = 900

// getGroveToken retrieves the Heartwood token.
// Priority: GROVE_TOKEN env var → vault auto-unlock → interactive vault prompt.
func getGroveToken() (string, error) {
	// 1. Environment variable
	if token := os.Getenv("GROVE_TOKEN"); token != "" {
		return token, nil
	}

	// 2. Vault auto-unlock (env var password)
	if v, err := vault.AutoUnlock(); err == nil {
		if token, ok := v.Get(groveTokenKey); ok && token != "" {
			return token, nil
		}
	} else if !errors.Is(err, vault.ErrNoAutoPassword) {
		// Auto-unlock attempted but failed (wrong password, etc.)
		// Fall through to interactive prompt
	}

	// 3. Interactive vault prompt
	if !vault.VaultExists() {
		return "", fmt.Errorf("not logged in — run `gw login` first")
	}

	password, err := vault.GetVaultPassword()
	if err != nil {
		return "", fmt.Errorf("vault unlock failed: %w", err)
	}

	v, err := vault.Unlock(password)
	if err != nil {
		return "", fmt.Errorf("vault unlock failed: %w", err)
	}

	token, ok := v.Get(groveTokenKey)
	if !ok || token == "" {
		return "", fmt.Errorf("not logged in — run `gw login` first")
	}
	return token, nil
}

// ── gw login ────────────────────────────────────────────────────────

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with Grove via Heartwood",
	Long: `Log in to Grove using the device code flow or a direct token.

The device code flow opens your browser and asks you to authorize.
Once authorized, the token is saved to the encrypted vault.

Use --token to provide a token directly (for CI/automation).`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("grove_login"); err != nil {
			return err
		}
		cfg := config.Get()
		client := heartwood.NewClient(cfg.Grove.AuthBaseURL, "")

		tokenDirect, _ := cmd.Flags().GetString("token")

		if tokenDirect != "" {
			return loginWithToken(cfg, tokenDirect)
		}
		return loginDeviceFlow(cfg, client)
	},
}

// loginWithToken validates and saves a directly-provided token.
func loginWithToken(cfg *config.Config, token string) error {
	client := heartwood.NewClient(cfg.Grove.AuthBaseURL, token)

	// Validate the token by fetching user info
	user, err := client.GetUserInfo()
	if err != nil {
		return fmt.Errorf("invalid token: %w", err)
	}

	// Save to vault
	if err := saveTokenToVault(token); err != nil {
		return err
	}

	if cfg.JSONMode {
		data, _ := json.Marshal(map[string]any{
			"logged_in": true,
			"user":      user,
			"method":    "token",
		})
		fmt.Println(string(data))
	} else {
		ui.Success(fmt.Sprintf("Logged in as %s (%s)", user.Name, user.Email))
	}
	return nil
}

// loginDeviceFlow runs the full RFC 8628 device authorization flow.
func loginDeviceFlow(cfg *config.Config, client *heartwood.Client) error {
	// Request device code
	dc, err := client.RequestDeviceCode(heartwood.DefaultClientID)
	if err != nil {
		return fmt.Errorf("failed to start login: %w", err)
	}

	interval := dc.Interval
	if interval <= 0 {
		interval = defaultPollInterval
	}

	if cfg.JSONMode {
		// In agent/JSON mode, output the code for the caller to handle
		data, _ := json.Marshal(map[string]any{
			"user_code":        dc.UserCode,
			"verification_uri": dc.VerificationURI,
			"expires_in":       dc.ExpiresIn,
			"status":           "awaiting_authorization",
		})
		fmt.Println(string(data))
	} else {
		fmt.Println()
		fmt.Printf("  Open: %s\n", ui.InfoStyle.Render(dc.VerificationURI))
		fmt.Printf("  Code: %s\n", ui.TitleStyle.Render(dc.UserCode))
		fmt.Println()
	}

	// Open browser (skip in agent mode)
	if !cfg.AgentMode && dc.VerificationURI != "" {
		if err := heartwood.OpenBrowser(dc.VerificationURI); err != nil {
			if !cfg.JSONMode {
				ui.Hint("Could not open browser — visit the URL above manually")
			}
		}
	}

	// Poll for authorization
	deadline := time.Now().Add(time.Duration(dc.ExpiresIn) * time.Second)
	if dc.ExpiresIn <= 0 {
		deadline = time.Now().Add(time.Duration(maxPollTime) * time.Second)
	}

	if !cfg.JSONMode && !cfg.AgentMode {
		fmt.Print("  Waiting for authorization")
	}

	for time.Now().Before(deadline) {
		time.Sleep(time.Duration(interval) * time.Second)

		token, dce, err := client.PollDeviceCode(dc.DeviceCode, heartwood.DefaultClientID)
		if err != nil {
			return fmt.Errorf("polling error: %w", err)
		}

		if token != nil {
			// Success! Save token
			if !cfg.JSONMode && !cfg.AgentMode {
				fmt.Println() // end the "Waiting" line
			}

			authClient := heartwood.NewClient(cfg.Grove.AuthBaseURL, token.AccessToken)
			user, _ := authClient.GetUserInfo()

			if err := saveTokenToVault(token.AccessToken); err != nil {
				return err
			}

			if cfg.JSONMode {
				result := map[string]any{
					"logged_in": true,
					"method":    "device_code",
				}
				if user != nil {
					result["user"] = user
				}
				data, _ := json.Marshal(result)
				fmt.Println(string(data))
			} else if user != nil {
				ui.Success(fmt.Sprintf("Logged in as %s (%s)", user.Name, user.Email))
			} else {
				ui.Success("Logged in successfully")
			}
			return nil
		}

		if dce != nil {
			switch dce.Error {
			case "authorization_pending":
				if !cfg.JSONMode && !cfg.AgentMode {
					fmt.Print(".")
				}
				continue
			case "slow_down":
				interval += 5
				continue
			case "access_denied":
				if !cfg.JSONMode && !cfg.AgentMode {
					fmt.Println()
				}
				return fmt.Errorf("login denied — you declined the authorization request")
			case "expired_token":
				if !cfg.JSONMode && !cfg.AgentMode {
					fmt.Println()
				}
				return fmt.Errorf("login expired — the device code timed out, try again")
			default:
				if !cfg.JSONMode && !cfg.AgentMode {
					fmt.Println()
				}
				return fmt.Errorf("login failed: %s — %s", dce.Error, dce.ErrorDescription)
			}
		}
	}

	if !cfg.JSONMode && !cfg.AgentMode {
		fmt.Println()
	}
	return fmt.Errorf("login timed out — try `gw login` again")
}

// saveTokenToVault saves a token to the encrypted vault.
func saveTokenToVault(token string) error {
	// Try auto-unlock first
	v, err := vault.AutoUnlock()
	if err != nil {
		if errors.Is(err, vault.ErrNoAutoPassword) {
			// No auto password — try interactive
			password, pwErr := vault.GetVaultPassword()
			if pwErr != nil {
				// No vault yet — create one
				password, pwErr = vault.GetNewVaultPassword()
				if pwErr != nil {
					return fmt.Errorf("vault setup failed: %w", pwErr)
				}
			}
			v, err = vault.UnlockOrCreate(password)
			if err != nil {
				return fmt.Errorf("vault unlock failed: %w", err)
			}
		} else {
			return fmt.Errorf("vault error: %w", err)
		}
	}
	return v.Set(groveTokenKey, token)
}

// ── gw logout ───────────────────────────────────────────────────────

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Log out of Grove and revoke the session",
	Long:  "Revokes the session on Heartwood and deletes the token from the vault.",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("grove_logout"); err != nil {
			return err
		}
		cfg := config.Get()

		// Try to get the token to revoke the session server-side
		token, tokenErr := getGroveToken()
		if tokenErr == nil && token != "" {
			client := heartwood.NewClient(cfg.Grove.AuthBaseURL, token)
			// Best-effort revocation — don't fail logout if server is unreachable
			_ = client.RevokeSession()
		}

		// Delete token from vault
		v, err := vault.AutoUnlock()
		if err != nil {
			if errors.Is(err, vault.ErrNoAutoPassword) {
				password, pwErr := vault.GetVaultPassword()
				if pwErr != nil {
					// If we can't even unlock the vault, we're already logged out
					if cfg.JSONMode {
						data, _ := json.Marshal(map[string]any{"logged_out": true})
						fmt.Println(string(data))
					} else {
						ui.Success("Already logged out")
					}
					return nil
				}
				v, err = vault.Unlock(password)
				if err != nil {
					return fmt.Errorf("vault unlock failed: %w", err)
				}
			} else {
				return fmt.Errorf("vault error: %w", err)
			}
		}

		if v.Exists(groveTokenKey) {
			if err := v.Delete(groveTokenKey); err != nil {
				return fmt.Errorf("failed to delete token: %w", err)
			}
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]any{"logged_out": true})
			fmt.Println(string(data))
		} else {
			ui.Success("Logged out of Grove")
		}
		return nil
	},
}

// ── Registration ────────────────────────────────────────────────────

func init() {
	loginCmd.Flags().String("token", "", "Provide token directly (for CI/automation)")
	rootCmd.AddCommand(loginCmd)
	rootCmd.AddCommand(logoutCmd)
}
