package cmd

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// --- gh api ---

var ghAPICmd = &cobra.Command{
	Use:   "api <endpoint>",
	Short: "Make raw GitHub API requests",
	Long: `Make raw GitHub API requests.

GET requests are always safe. POST/PATCH require --write.
DELETE requires --write --force.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		endpoint := args[0]
		method, _ := cmd.Flags().GetString("method")
		fields, _ := cmd.Flags().GetStringArray("field")
		jqFilter, _ := cmd.Flags().GetString("jq")

		method = strings.ToUpper(method)

		// Validate endpoint — reject empty, shell metacharacters
		if endpoint == "" {
			return fmt.Errorf("endpoint required")
		}
		if strings.ContainsAny(endpoint, ";|&`$()") {
			return fmt.Errorf("endpoint contains invalid characters")
		}

		// Safety check based on HTTP method
		tier := safety.APITierFromMethod(method)
		switch tier {
		case safety.TierWrite:
			if err := requireGHSafety("api_" + strings.ToLower(method)); err != nil {
				return err
			}
		case safety.TierDangerous:
			if !cfg.WriteFlag {
				return fmt.Errorf("DELETE requires --write flag")
			}
			if !cfg.ForceFlag {
				return fmt.Errorf("DELETE requires --force flag (destructive operation)")
			}
		}

		ghArgs := []string{"api", endpoint}
		if method != "GET" {
			ghArgs = append(ghArgs, "-X", method)
		}
		for _, f := range fields {
			ghArgs = append(ghArgs, "-f", f)
		}
		if jqFilter != "" {
			ghArgs = append(ghArgs, "--jq", jqFilter)
		}

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		// Try to pretty-print JSON
		if cfg.JSONMode || !cfg.IsHumanMode() {
			fmt.Println(output)
		} else {
			var data interface{}
			if json.Unmarshal([]byte(output), &data) == nil {
				pretty, _ := json.MarshalIndent(data, "", "  ")
				fmt.Println(string(pretty))
			} else {
				fmt.Println(output)
			}
		}
		return nil
	},
}

// --- gh rate-limit ---

var ghRateLimitCmd = &cobra.Command{
	Use:   "rate-limit",
	Short: "Show GitHub API rate limit status",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		output, err := exec.GHOutput("api", "rate_limit")
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			fmt.Println(output)
			return nil
		}

		var data map[string]interface{}
		if err := json.Unmarshal([]byte(output), &data); err != nil {
			return fmt.Errorf("failed to parse rate limit: %w", err)
		}

		resources, ok := data["resources"].(map[string]interface{})
		if !ok {
			fmt.Println(output)
			return nil
		}

		headers := []string{"Resource", "Used", "Remaining", "Limit"}
		var rows [][]string
		var lowResources, exhaustedResources []string

		for name, v := range resources {
			r, ok := v.(map[string]interface{})
			if !ok {
				continue
			}

			limitF, ok1 := r["limit"].(float64)
			usedF, ok2 := r["used"].(float64)
			remainingF, ok3 := r["remaining"].(float64)
			if !ok1 || !ok2 || !ok3 {
				continue
			}
			limit := int(limitF)
			used := int(usedF)
			remaining := int(remainingF)

			warnThreshold := cfg.GitHub.RateLimitWarnThreshold
			if warnThreshold == 0 {
				warnThreshold = 100
			}

			if remaining == 0 {
				exhaustedResources = append(exhaustedResources, name)
			} else if remaining < warnThreshold {
				lowResources = append(lowResources, name)
			}

			rows = append(rows, []string{name, fmt.Sprintf("%d", used), fmt.Sprintf("%d", remaining), fmt.Sprintf("%d", limit)})
		}
		fmt.Print(ui.RenderTable("GitHub API Rate Limits", headers, rows))

		if len(exhaustedResources) > 0 {
			fmt.Printf("\n  Exhausted: %s\n", strings.Join(exhaustedResources, ", "))
		}
		if len(lowResources) > 0 {
			fmt.Printf("\n  Running low: %s\n", strings.Join(lowResources, ", "))
		}

		return nil
	},
}

func init() {
	// gh api
	ghAPICmd.Flags().StringP("method", "X", "GET", "HTTP method")
	ghAPICmd.Flags().StringArrayP("field", "f", nil, "Form fields (key=value)")
	ghAPICmd.Flags().String("jq", "", "jq filter for output")
	ghCmd.AddCommand(ghAPICmd)

	// gh rate-limit
	ghCmd.AddCommand(ghRateLimitCmd)
}
