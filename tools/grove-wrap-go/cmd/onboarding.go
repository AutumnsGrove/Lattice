package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// onboardingBaseURL is the deployed OnboardingAgent worker.
const onboardingBaseURL = "https://grove-onboarding.m7jv4v7npb.workers.dev"

// --- HTTP helpers (no auth needed — worker is internal) ---

func onboardingGet(path string) (int, []byte, error) {
	req, err := http.NewRequest(http.MethodGet, onboardingBaseURL+path, nil)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("User-Agent", "gw-cli/1.0 (Grove Wrap)")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

func onboardingPost(path string, payload interface{}) (int, []byte, error) {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to encode request: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, onboardingBaseURL+path, bytes.NewReader(bodyBytes))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("User-Agent", "gw-cli/1.0 (Grove Wrap)")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

// --- onboarding command group ---

var onboardingCmd = &cobra.Command{
	Use:   "onboarding",
	Short: "Manage email onboarding sequences",
	Long:  "View status, start sequences, and unsubscribe users via the OnboardingAgent.",
}

// --- onboarding status <email> ---

var onboardingStatusCmd = &cobra.Command{
	Use:   "status <email>",
	Short: "Check onboarding state for a user",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		email := strings.ToLower(strings.TrimSpace(args[0]))

		statusCode, body, err := onboardingGet("/status/" + email)
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}

		var result map[string]interface{}
		if jsonErr := json.Unmarshal(body, &result); jsonErr != nil {
			return fmt.Errorf("failed to parse response (HTTP %d)", statusCode)
		}

		if cfg.JSONMode {
			return printJSON(result)
		}

		state, _ := result["state"].(map[string]interface{})
		if state == nil {
			ui.Muted(fmt.Sprintf("No onboarding state for %s", email))
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Onboarding: %s", email))

		audience, _ := state["audience"].(string)
		unsubscribed, _ := state["unsubscribed"].(bool)

		if audience != "" {
			ui.PrintKeyValue("Audience", audience)
		} else {
			ui.Muted("  No sequence started")
			return nil
		}

		if unsubscribed {
			ui.PrintKeyValue("Status", "Unsubscribed")
		} else {
			ui.PrintKeyValue("Status", "Active")
		}

		emailsSent, _ := state["emailsSent"].([]interface{})
		ui.PrintKeyValue("Emails sent", fmt.Sprintf("%d", len(emailsSent)))

		for _, e := range emailsSent {
			entry, ok := e.(map[string]interface{})
			if !ok {
				continue
			}
			day := entry["day"]
			msgID, _ := entry["messageId"].(string)
			if msgID != "" {
				ui.Step(true, fmt.Sprintf("Day %v  (id: %s)", day, msgID[:8]))
			} else {
				ui.Step(true, fmt.Sprintf("Day %v", day))
			}
		}

		return nil
	},
}

// --- onboarding start <email> [--audience wanderer] ---

var onboardingStartCmd = &cobra.Command{
	Use:   "start <email>",
	Short: "Start onboarding sequence for a user",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("onboarding_start"); err != nil {
			return err
		}

		cfg := config.Get()
		email := strings.ToLower(strings.TrimSpace(args[0]))
		audience, _ := cmd.Flags().GetString("audience")

		statusCode, body, err := onboardingPost("/start", map[string]interface{}{
			"email":    email,
			"audience": audience,
		})
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}

		var result map[string]interface{}
		if jsonErr := json.Unmarshal(body, &result); jsonErr != nil {
			return fmt.Errorf("failed to parse response (HTTP %d)", statusCode)
		}

		if cfg.JSONMode {
			return printJSON(result)
		}

		if started, _ := result["started"].(bool); started {
			ui.Success(fmt.Sprintf("Sequence started for %s (audience: %s)", email, audience))
		} else {
			ui.Info(fmt.Sprintf("Sequence already active for %s — no changes", email))
		}

		return nil
	},
}

// --- onboarding unsubscribe <email> ---

var onboardingUnsubCmd = &cobra.Command{
	Use:   "unsubscribe <email>",
	Short: "Unsubscribe a user and cancel pending emails",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("onboarding_unsubscribe"); err != nil {
			return err
		}

		cfg := config.Get()
		email := strings.ToLower(strings.TrimSpace(args[0]))

		statusCode, body, err := onboardingPost("/unsubscribe", map[string]interface{}{
			"email": email,
		})
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}

		var result map[string]interface{}
		if jsonErr := json.Unmarshal(body, &result); jsonErr != nil {
			return fmt.Errorf("failed to parse response (HTTP %d)", statusCode)
		}

		if cfg.JSONMode {
			return printJSON(result)
		}

		if unsub, _ := result["unsubscribed"].(bool); unsub {
			ui.Success(fmt.Sprintf("Unsubscribed %s — pending emails cancelled", email))
		} else {
			ui.Info(fmt.Sprintf("%s was already unsubscribed", email))
		}

		return nil
	},
}

// --- onboarding health ---

var onboardingHealthCmd = &cobra.Command{
	Use:   "health",
	Short: "Check OnboardingAgent worker health",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		statusCode, body, err := onboardingGet("/health")
		if err != nil {
			return fmt.Errorf("request failed: %w", err)
		}

		var result map[string]interface{}
		if jsonErr := json.Unmarshal(body, &result); jsonErr != nil {
			return fmt.Errorf("failed to parse response (HTTP %d)", statusCode)
		}

		if cfg.JSONMode {
			return printJSON(result)
		}

		status, _ := result["status"].(string)
		version, _ := result["version"].(string)

		if status == "healthy" {
			ui.Step(true, fmt.Sprintf("OnboardingAgent healthy (v%s)", version))
		} else {
			ui.Step(false, fmt.Sprintf("OnboardingAgent unhealthy (HTTP %d)", statusCode))
		}

		return nil
	},
}

// --- help + registration ---

var onboardingHelpCategories = []ui.HelpCategory{
	{Title: "Read (Always Safe)", Icon: "📖", Style: ui.SafeReadStyle, Commands: []ui.HelpCommand{
		{Name: "status <email>", Desc: "Check onboarding state for a user"},
		{Name: "health", Desc: "Check OnboardingAgent worker health"},
	}},
	{Title: "Write (--write)", Icon: "✏️", Style: ui.SafeWriteStyle, Commands: []ui.HelpCommand{
		{Name: "start <email>", Desc: "Start onboarding sequence for a user"},
		{Name: "unsubscribe <email>", Desc: "Unsubscribe a user and cancel pending emails"},
	}},
}

func init() {
	rootCmd.AddCommand(onboardingCmd)

	onboardingCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp("gw onboarding", "email onboarding sequences", onboardingHelpCategories, true)
		fmt.Print(output)
	})

	// Read commands
	onboardingCmd.AddCommand(onboardingStatusCmd)
	onboardingCmd.AddCommand(onboardingHealthCmd)

	// Write commands
	onboardingStartCmd.Flags().StringP("audience", "a", "wanderer", "Audience type: wanderer, promo, or rooted")
	onboardingCmd.AddCommand(onboardingStartCmd)
	onboardingCmd.AddCommand(onboardingUnsubCmd)
}
