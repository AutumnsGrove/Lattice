package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/asktui"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/nlp"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
)

var (
	askFlagInteractive bool
	askFlagNoAutostart bool
	askFlagMaxRounds   int
)

var askCmd = &cobra.Command{
	Use:   "ask <query>",
	Short: "Natural language codebase search (requires local LLM)",
	Long: `Search the codebase using natural language. Powered by a local LLM
running in LM Studio, gf ask translates your description into structured
searches and returns file paths with explanations.

Examples:
  gf ask "where are the service icons defined"
  gf ask "the thing that handles rate limiting"
  gf ask "wherever the seasonal theme colors live"`,
	Args: cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		query := strings.Join(args, " ")
		cfg := config.Get()
		ctx := context.Background()

		// Interactive TUI mode
		if askFlagInteractive {
			return asktui.Run(asktui.Options{
				Query:     query,
				Autostart: !askFlagNoAutostart,
				MaxRounds: askFlagMaxRounds,
			})
		}

		// Status callback: prints to stderr so stdout stays clean for piping
		onStatus := func(msg string) {
			if cfg.JSONMode {
				return
			}
			if cfg.AgentMode {
				fmt.Fprintf(os.Stderr, "--- %s ---\n", msg)
			} else {
				fmt.Fprintf(os.Stderr, "  %s\n", msg)
			}
		}

		// Round status callback
		onRoundStatus := func(round, maxRounds int, status string) {
			if cfg.JSONMode {
				return
			}
			if cfg.AgentMode {
				fmt.Fprintf(os.Stderr, "--- round %d/%d: %s ---\n", round, maxRounds, status)
			} else {
				fmt.Fprintf(os.Stderr, "\r  \033[K  ◐ %s  (round %d/%d)", status, round, maxRounds)
			}
		}

		// Print the query header
		if !cfg.JSONMode {
			if cfg.AgentMode {
				fmt.Fprintf(os.Stderr, "--- Searching: %s ---\n", query)
			} else {
				output.PrintSection(fmt.Sprintf("Searching: %q", query))
			}
		}

		// Ensure LM Studio is running
		client, err := nlp.EnsureServer(ctx, !askFlagNoAutostart, onStatus)
		if err != nil {
			return err
		}

		// Run the agentic loop
		result, err := nlp.RunAgent(ctx, client, query, nlp.AgentOptions{
			MaxRounds: askFlagMaxRounds,
			Verbose:   cfg.Verbose,
			OnStatus:  onRoundStatus,
		})
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		// Clear the status line in human mode
		if cfg.IsHumanMode() {
			fmt.Fprintf(os.Stderr, "\r\033[K")
		}

		// Render output
		if cfg.JSONMode {
			return renderJSON(query, result)
		}

		if result.GaveUp {
			return renderGiveUp(cfg, result)
		}

		return renderAnswer(cfg, result)
	},
}

func init() {
	askCmd.Flags().BoolVarP(&askFlagInteractive, "interactive", "i", false, "Interactive TUI mode (Phase 2)")
	askCmd.Flags().BoolVar(&askFlagNoAutostart, "no-autostart", false, "Skip LM Studio auto-start")
	askCmd.Flags().IntVar(&askFlagMaxRounds, "max-rounds", nlp.DefaultMaxRounds, "Maximum agentic loop iterations")
}

func renderJSON(query string, result *nlp.AgentResult) error {
	data := map[string]any{
		"command":    "ask",
		"query":      query,
		"rounds":     result.Rounds,
		"tool_calls": result.ToolCalls,
	}

	if result.GaveUp {
		data["gave_up"] = true
		data["reason"] = result.GiveUp.Reason
		data["tried"] = result.GiveUp.Tried
		if len(result.GiveUp.Suggestions) > 0 {
			data["suggestions"] = result.GiveUp.Suggestions
		}
	} else {
		data["answer"] = result.Answer
		data["files"] = result.Files
	}

	output.PrintJSON(data)
	return nil
}

func renderGiveUp(cfg *config.Config, result *nlp.AgentResult) error {
	if cfg.AgentMode {
		fmt.Println("\n--- Could not find what you described ---")
		fmt.Printf("Reason: %s\n", result.GiveUp.Reason)
		if len(result.GiveUp.Tried) > 0 {
			fmt.Println("\nTried:")
			for _, t := range result.GiveUp.Tried {
				fmt.Printf("  %s\n", t)
			}
		}
		if len(result.GiveUp.Suggestions) > 0 {
			fmt.Println("\nSuggested commands:")
			for _, s := range result.GiveUp.Suggestions {
				fmt.Printf("  %s\n", s)
			}
		}
		return nil
	}

	// Human mode
	fmt.Println()
	output.PrintWarning("Could not find what you described.")
	fmt.Println()

	if result.GiveUp.Reason != "" {
		output.PrintDim("  " + result.GiveUp.Reason)
		fmt.Println()
	}

	if len(result.GiveUp.Tried) > 0 {
		output.PrintDim("  Tried:")
		for _, t := range result.GiveUp.Tried {
			output.PrintDim("    " + t)
		}
		fmt.Println()
	}

	if len(result.GiveUp.Suggestions) > 0 {
		output.PrintSection("You could try")
		for _, s := range result.GiveUp.Suggestions {
			fmt.Printf("    %s\n", s)
		}
		fmt.Println()
	}

	return nil
}

func renderAnswer(cfg *config.Config, result *nlp.AgentResult) error {
	if cfg.AgentMode {
		if len(result.Files) > 0 {
			fmt.Println("\n--- Found ---")
			for _, f := range result.Files {
				fmt.Println(f)
			}
			fmt.Println()
		}
		if result.Answer != "" {
			fmt.Println(result.Answer)
		}
		return nil
	}

	// Human mode
	fmt.Println()
	if len(result.Files) > 0 {
		output.PrintSuccess("Found it!")
		fmt.Println()
		for _, f := range result.Files {
			output.PrintColor("#e8a838", "  "+f)
		}
		fmt.Println()
	}

	if result.Answer != "" {
		// Print the answer, indented
		for _, line := range strings.Split(result.Answer, "\n") {
			// Skip lines that are just file paths (already printed above)
			trimmed := strings.TrimSpace(line)
			if trimmed != "" && !isInFileList(trimmed, result.Files) {
				fmt.Printf("  %s\n", line)
			}
		}
		fmt.Println()
	}

	return nil
}

// isInFileList checks if a line matches one of the extracted file paths.
func isInFileList(line string, files []string) bool {
	cleaned := strings.TrimPrefix(line, "- ")
	cleaned = strings.TrimPrefix(cleaned, "* ")
	cleaned = strings.TrimPrefix(cleaned, "`")
	cleaned = strings.TrimSuffix(cleaned, "`")
	cleaned = strings.TrimSpace(cleaned)

	for _, f := range files {
		if cleaned == f {
			return true
		}
	}
	return false
}
