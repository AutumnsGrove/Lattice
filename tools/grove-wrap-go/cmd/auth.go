package cmd

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Authentication and OAuth client management",
	Long:  "Check auth status, manage OAuth clients in the groveauth D1 database.",
}

// --- auth check ---

var authCheckCmd = &cobra.Command{
	Use:   "check",
	Short: "Check Cloudflare authentication status",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		result, err := exec.Wrangler("whoami")
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		authenticated := result.OK()

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"authenticated": authenticated,
				"output":        strings.TrimSpace(result.Stdout),
			})
			fmt.Println(string(data))
			return nil
		}

		if authenticated {
			ui.Success("Authenticated with Cloudflare")
			for _, line := range result.Lines() {
				if strings.Contains(line, "@") || strings.Contains(line, "account") {
					fmt.Printf("  %s\n", line)
				}
			}
		} else {
			ui.Error("Not authenticated with Cloudflare")
			ui.Hint("Run: gw auth login --write")
		}
		return nil
	},
}

// --- auth login ---

var authLoginCmd = &cobra.Command{
	Use:   "login",
	Short: "Log in to Cloudflare via wrangler",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("auth_login"); err != nil {
			return err
		}

		result, err := exec.WranglerInteractive("login")
		if err != nil {
			return fmt.Errorf("wrangler login failed: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler login exited with code %d", result.ExitCode)
		}
		return nil
	},
}

// --- auth client ---

var authClientCmd = &cobra.Command{
	Use:   "client",
	Short: "Manage OAuth clients",
}

// --- auth client list ---

var authClientListCmd = &cobra.Command{
	Use:   "list",
	Short: "List OAuth clients",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		sql := "SELECT client_id, name, redirect_uri, created_at FROM oauth_clients ORDER BY created_at DESC"
		dbName, err := resolveDatabase("groveauth")
		if err != nil {
			return err
		}

		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{"clients": rows})
			fmt.Println(string(data))
			return nil
		}

		if len(rows) == 0 {
			ui.Muted("No OAuth clients found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("OAuth Clients (%d)", len(rows)))
		for _, row := range rows {
			clientID := fmt.Sprintf("%v", row["client_id"])
			name := fmt.Sprintf("%v", row["name"])
			uri := fmt.Sprintf("%v", row["redirect_uri"])
			truncID := clientID
			if len(truncID) > 16 {
				truncID = truncID[:16] + "..."
			}
			ui.PrintKeyValue(
				fmt.Sprintf("%-20s", name),
				fmt.Sprintf("%s  → %s", truncID, uri),
			)
		}
		return nil
	},
}

// --- auth client info ---

var authClientInfoCmd = &cobra.Command{
	Use:   "info <client_id>",
	Short: "Show full details for an OAuth client",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		clientID := args[0]
		escaped := strings.ReplaceAll(clientID, "'", "''")

		dbName, err := resolveDatabase("groveauth")
		if err != nil {
			return err
		}

		sql := fmt.Sprintf("SELECT * FROM oauth_clients WHERE client_id = '%s'", escaped)
		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)
		if len(rows) == 0 {
			return fmt.Errorf("client not found: %s", clientID)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(rows[0])
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader("OAuth Client Details")
		for k, v := range rows[0] {
			ui.PrintKeyValue(fmt.Sprintf("%-16s", k), fmt.Sprintf("%v", v))
		}
		return nil
	},
}

// --- auth client create ---

var authClientCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new OAuth client",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("auth_client_create"); err != nil {
			return err
		}
		cfg := config.Get()
		name, _ := cmd.Flags().GetString("name")
		redirectURI, _ := cmd.Flags().GetString("redirect-uri")

		if name == "" || redirectURI == "" {
			return fmt.Errorf("--name and --redirect-uri are required")
		}

		// Generate client ID (24 random bytes, urlsafe base64)
		idBytes := make([]byte, 24)
		if _, err := rand.Read(idBytes); err != nil {
			return fmt.Errorf("failed to generate client ID: %w", err)
		}
		clientID := base64.URLEncoding.EncodeToString(idBytes)

		// Generate client secret (32 random bytes, urlsafe base64)
		secretBytes := make([]byte, 32)
		if _, err := rand.Read(secretBytes); err != nil {
			return fmt.Errorf("failed to generate client secret: %w", err)
		}
		clientSecret := base64.URLEncoding.EncodeToString(secretBytes)

		dbName, err := resolveDatabase("groveauth")
		if err != nil {
			return err
		}

		escapedName := strings.ReplaceAll(name, "'", "''")
		escapedURI := strings.ReplaceAll(redirectURI, "'", "''")

		sql := fmt.Sprintf(
			"INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uri, created_at, updated_at) VALUES ('%s', '%s', '%s', '%s', datetime('now'), datetime('now'))",
			clientID, clientSecret, escapedName, escapedURI,
		)

		_, err = exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"client_id":     clientID,
				"client_secret": clientSecret,
				"name":          name,
				"redirect_uri":  redirectURI,
				"created":       true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success("OAuth client created")
			ui.PrintKeyValue("Client ID    ", clientID)
			ui.PrintKeyValue("Client Secret", clientSecret)
			ui.PrintKeyValue("Name         ", name)
			ui.PrintKeyValue("Redirect URI ", redirectURI)
			fmt.Println()
			ui.Warning("Save the client secret — it cannot be retrieved later")
		}
		return nil
	},
}

// --- auth client rotate ---

var authClientRotateCmd = &cobra.Command{
	Use:   "rotate <client_id>",
	Short: "Rotate an OAuth client's secret",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("auth_client_rotate"); err != nil {
			return err
		}
		cfg := config.Get()
		clientID := args[0]

		secretBytes := make([]byte, 32)
		if _, err := rand.Read(secretBytes); err != nil {
			return fmt.Errorf("failed to generate client secret: %w", err)
		}
		newSecret := base64.URLEncoding.EncodeToString(secretBytes)

		dbName, err := resolveDatabase("groveauth")
		if err != nil {
			return err
		}

		escaped := strings.ReplaceAll(clientID, "'", "''")
		sql := fmt.Sprintf(
			"UPDATE oauth_clients SET client_secret = '%s', updated_at = datetime('now') WHERE client_id = '%s'",
			newSecret, escaped,
		)

		_, err = exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"client_id":     clientID,
				"client_secret": newSecret,
				"rotated":       true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success("Client secret rotated")
			ui.PrintKeyValue("Client ID    ", clientID)
			ui.PrintKeyValue("New Secret   ", newSecret)
			fmt.Println()
			ui.Warning("Save the new secret — it cannot be retrieved later")
		}
		return nil
	},
}

// --- auth client delete ---

var authClientDeleteCmd = &cobra.Command{
	Use:   "delete <client_id>",
	Short: "Delete an OAuth client (dangerous)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("auth_client_delete"); err != nil {
			return err
		}
		cfg := config.Get()
		clientID := args[0]

		dbName, err := resolveDatabase("groveauth")
		if err != nil {
			return err
		}

		escaped := strings.ReplaceAll(clientID, "'", "''")
		sql := fmt.Sprintf("DELETE FROM oauth_clients WHERE client_id = '%s'", escaped)

		_, err = exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"client_id": clientID, "deleted": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("OAuth client deleted: %s", clientID))
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(authCmd)

	authCmd.AddCommand(authCheckCmd)
	authCmd.AddCommand(authLoginCmd)
	authCmd.AddCommand(authClientCmd)

	authClientCmd.AddCommand(authClientListCmd)
	authClientCmd.AddCommand(authClientInfoCmd)

	authClientCreateCmd.Flags().String("name", "", "Client application name")
	authClientCreateCmd.Flags().String("redirect-uri", "", "OAuth redirect URI")
	authClientCmd.AddCommand(authClientCreateCmd)

	authClientCmd.AddCommand(authClientRotateCmd)
	authClientCmd.AddCommand(authClientDeleteCmd)
}
