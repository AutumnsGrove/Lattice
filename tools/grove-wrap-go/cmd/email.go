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

// emailCmd is the parent command for email routing operations.
var emailCmd = &cobra.Command{
	Use:   "email",
	Short: "Email routing operations",
	Long:  "Email routing operations — check status and rules via the Cloudflare dashboard.",
}

// --- email status ---

var emailStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check email routing status",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		dashURL := "https://dash.cloudflare.com/?to=/:account/:zone/email/routing"

		// Try to detect if grove-email worker is active
		workerActive := false
		_, err := exec.WranglerOutput("tail", "--format=json", "grove-email", "--once")
		if err == nil {
			workerActive = true
		}

		if cfg.JSONMode {
			result := map[string]interface{}{
				"email_worker": map[string]interface{}{
					"name":   "grove-email",
					"active": workerActive,
				},
				"note":          "Full email routing status requires Cloudflare dashboard",
				"dashboard_url": dashURL,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader("Email Routing Status")
		if workerActive {
			ui.Step(true, "grove-email worker: Active")
		} else {
			ui.Step(false, "grove-email worker: Not Found")
		}
		fmt.Println()
		ui.Info(fmt.Sprintf("Dashboard: %s", dashURL))
		ui.Muted("  Full email routing status requires Cloudflare dashboard")

		return nil
	},
}

// --- email rules ---

var emailRulesCmd = &cobra.Command{
	Use:   "rules",
	Short: "List email routing rules",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		dashURL := "https://dash.cloudflare.com/?to=/:account/:zone/email/routing/routes"

		if cfg.JSONMode {
			result := map[string]interface{}{
				"note":          "Email routing rules must be viewed in Cloudflare dashboard",
				"dashboard_url": dashURL,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader("Email Routing Rules")
		ui.Info(fmt.Sprintf("View rules in dashboard: %s", dashURL))
		ui.Muted("  Email routing rules are managed via the Cloudflare dashboard")

		return nil
	},
}

// --- email test ---

var emailTestCmd = &cobra.Command{
	Use:   "test",
	Short: "Send a test email",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("email_test"); err != nil {
			return err
		}

		cfg := config.Get()
		to, _ := cmd.Flags().GetString("to")
		subject, _ := cmd.Flags().GetString("subject")

		if to == "" {
			return fmt.Errorf("--to flag is required")
		}
		if len(to) > 254 || !strings.Contains(to, "@") || strings.ContainsAny(to, " \n\r\t") {
			return fmt.Errorf("invalid email address: %q", to)
		}
		if len(subject) > 512 {
			return fmt.Errorf("subject too long (max 512 chars)")
		}

		if cfg.JSONMode {
			result := map[string]interface{}{
				"to":      to,
				"subject": subject,
				"status":  "not_implemented",
				"note":    "Test email sending requires grove-email worker endpoint",
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.Warning("Test email sending is not yet implemented")
		ui.Info("To send test emails:")
		ui.Muted("  1. Configure email routing in Cloudflare dashboard")
		ui.Muted("  2. Deploy the grove-email worker")
		ui.Muted("  3. Send directly via the worker endpoint")

		return nil
	},
}

var emailHelpCategories = []ui.HelpCategory{
	{Title: "Read (Always Safe)", Icon: "📖", Style: ui.SafeReadStyle, Commands: []ui.HelpCommand{
		{Name: "status", Desc: "Check email routing status"},
		{Name: "rules", Desc: "List email routing rules"},
	}},
	{Title: "Write (--write)", Icon: "✏️", Style: ui.SafeWriteStyle, Commands: []ui.HelpCommand{
		{Name: "test", Desc: "Send a test email"},
	}},
}

func init() {
	rootCmd.AddCommand(emailCmd)

	emailCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp("gw email", "email routing operations", emailHelpCategories, true)
		fmt.Print(output)
	})

	// email status
	emailCmd.AddCommand(emailStatusCmd)

	// email rules
	emailCmd.AddCommand(emailRulesCmd)

	// email test
	emailTestCmd.Flags().StringP("to", "t", "", "Recipient email address")
	emailTestCmd.Flags().StringP("subject", "s", "Grove Email Test", "Email subject")
	emailTestCmd.Flags().StringP("body", "b", "This is a test email from Grove.", "Email body")
	emailCmd.AddCommand(emailTestCmd)
}
