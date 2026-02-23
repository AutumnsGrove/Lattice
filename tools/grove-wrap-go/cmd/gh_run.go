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

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Workflow run operations",
	Long:  "Workflow run operations with safety-tiered access.",
}

// --- run list ---

var runListCmd = &cobra.Command{
	Use:   "list",
	Short: "List workflow runs",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		workflow, _ := cmd.Flags().GetString("workflow")
		branch, _ := cmd.Flags().GetString("branch")
		status, _ := cmd.Flags().GetString("status")
		limit, _ := cmd.Flags().GetInt("limit")

		ghArgs := []string{"run", "list"}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		limit = clampGHLimit(limit)
		ghArgs = append(ghArgs, "--limit", fmt.Sprintf("%d", limit))
		ghArgs = append(ghArgs, "--json",
			"databaseId,displayTitle,status,conclusion,workflowName,headBranch,event,createdAt,url,headSha")

		if workflow != "" {
			ghArgs = append(ghArgs, "--workflow", workflow)
		}
		if branch != "" {
			ghArgs = append(ghArgs, "--branch", branch)
		}
		if status != "" {
			ghArgs = append(ghArgs, "--status", status)
		}

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			fmt.Println(output)
			return nil
		}

		var runs []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &runs); err != nil {
			return fmt.Errorf("failed to parse runs: %w", err)
		}

		if len(runs) == 0 {
			ui.Muted("No workflow runs found")
			return nil
		}

		flat, _ := cmd.Flags().GetBool("flat")

		if flat {
			// Flat view: one run per line with IDs for easy piping
			ui.PrintHeader("Workflow Runs")
			for _, r := range runs {
				id := fmt.Sprintf("%v", r["databaseId"])
				workflow, _ := r["workflowName"].(string)
				conclusion, _ := r["conclusion"].(string)
				runStatus, _ := r["status"].(string)
				branch, _ := r["headBranch"].(string)
				createdAt, _ := r["createdAt"].(string)
				if len(createdAt) > 10 {
					createdAt = createdAt[:10]
				}

				icon := conclusionIcon(conclusion, runStatus)
				display := conclusion
				if display == "" {
					display = runStatus
				}

				fmt.Printf("  %s %-12s %-24s %-10s %-20s %s\n",
					icon, id, workflow, display, branch, createdAt)
			}
			fmt.Println()
			return nil
		}

		// Group by headSha for the default grouped view
		type runGroup struct {
			sha  string
			runs []map[string]interface{}
		}
		var groups []runGroup
		seen := map[string]int{}

		for _, r := range runs {
			sha, _ := r["headSha"].(string)
			if sha == "" {
				sha = fmt.Sprintf("unknown-%v", r["databaseId"])
			}
			if idx, ok := seen[sha]; ok {
				groups[idx].runs = append(groups[idx].runs, r)
			} else {
				seen[sha] = len(groups)
				groups = append(groups, runGroup{sha: sha, runs: []map[string]interface{}{r}})
			}
		}

		ui.PrintHeader("Workflow Runs")
		for _, g := range groups {
			shortSha := g.sha
			if len(shortSha) > 7 {
				shortSha = shortSha[:7]
			}

			first := g.runs[0]
			title, _ := first["displayTitle"].(string)
			createdAt, _ := first["createdAt"].(string)
			if len(createdAt) > 10 {
				createdAt = createdAt[:10]
			}

			fmt.Printf("\n  ● %s  %s  %s\n", shortSha, title, createdAt)

			for _, r := range g.runs {
				id := fmt.Sprintf("%v", r["databaseId"])
				workflow, _ := r["workflowName"].(string)
				conclusion, _ := r["conclusion"].(string)
				runStatus, _ := r["status"].(string)

				icon := conclusionIcon(conclusion, runStatus)
				display := conclusion
				if display == "" {
					display = runStatus
				}

				padding := 40 - len(workflow) - len(display)
				if padding < 1 {
					padding = 1
				}
				dots := strings.Repeat("·", padding)
				fmt.Printf("    %s %-12s %s %s %s\n", icon, id, workflow, dots, display)
			}
		}
		fmt.Println()
		return nil
	},
}

// conclusionIcon returns a status icon for a workflow conclusion/status.
func conclusionIcon(conclusion, status string) string {
	if strings.EqualFold(status, "in_progress") {
		return "◐"
	}
	if strings.EqualFold(status, "queued") {
		return "○"
	}
	switch strings.ToLower(conclusion) {
	case "success":
		return "✓"
	case "failure":
		return "✗"
	case "cancelled":
		return "⊘"
	case "skipped":
		return "–"
	default:
		return "?"
	}
}

// --- run view ---

var runViewCmd = &cobra.Command{
	Use:   "view <run-id>",
	Short: "View workflow run details with job breakdown",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		runID := args[0]
		if err := validateRunID(runID); err != nil {
			return err
		}
		showLog, _ := cmd.Flags().GetBool("log")
		logFailed, _ := cmd.Flags().GetBool("log-failed")
		noLogs, _ := cmd.Flags().GetBool("no-logs")

		ghArgs := []string{"run", "view", runID}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--json",
			"databaseId,displayTitle,status,conclusion,workflowName,headBranch,event,createdAt,url,jobs")

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			fmt.Println(output)
			return nil
		}

		var run map[string]interface{}
		if err := json.Unmarshal([]byte(output), &run); err != nil {
			return fmt.Errorf("failed to parse run: %w", err)
		}

		workflow, _ := run["workflowName"].(string)
		title, _ := run["displayTitle"].(string)
		conclusion, _ := run["conclusion"].(string)
		runStatus, _ := run["status"].(string)
		branch, _ := run["headBranch"].(string)
		event, _ := run["event"].(string)
		createdAt, _ := run["createdAt"].(string)
		url, _ := run["url"].(string)

		display := conclusion
		if display == "" {
			display = runStatus
		}

		ui.PrintHeader(fmt.Sprintf("Run #%s", runID))
		fmt.Printf("  %s — %s\n", workflow, title)
		fmt.Printf("  Status: %s\n", display)
		fmt.Printf("  Branch: %s  Event: %s\n", branch, event)
		fmt.Printf("  Created: %s\n", createdAt)
		fmt.Printf("  URL: %s\n", url)

		// Job breakdown
		hasFailures := false
		if jobs, ok := run["jobs"].([]interface{}); ok && len(jobs) > 0 {
			fmt.Printf("\n  Jobs:\n")
			for _, j := range jobs {
				job, ok := j.(map[string]interface{})
				if !ok {
					continue
				}
				jobName, _ := job["name"].(string)
				jobConclusion, _ := job["conclusion"].(string)
				jobStatus, _ := job["status"].(string)

				jobDisplay := jobConclusion
				if jobDisplay == "" {
					jobDisplay = jobStatus
				}

				icon := conclusionIcon(jobConclusion, jobStatus)

				if strings.EqualFold(jobConclusion, "failure") {
					hasFailures = true
				}

				// Find failed steps
				var failedSteps []string
				if steps, ok := job["steps"].([]interface{}); ok {
					for _, s := range steps {
						step, ok := s.(map[string]interface{})
						if !ok {
							continue
						}
						if c, _ := step["conclusion"].(string); strings.EqualFold(c, "failure") {
							name, _ := step["name"].(string)
							failedSteps = append(failedSteps, name)
						}
					}
				}

				stepInfo := ""
				if len(failedSteps) > 0 {
					stepInfo = "  ← " + strings.Join(failedSteps, ", ")
				}

				fmt.Printf("    %s %-35s %s%s\n", icon, jobName, jobDisplay, stepInfo)
			}
		}

		// Auto-fetch failure logs
		showFailedLogs := logFailed || (hasFailures && !noLogs && !showLog)
		if showLog || showFailedLogs {
			logType := "full"
			if showFailedLogs {
				logType = "failed"
			}
			fmt.Printf("\n  Fetching %s logs...\n\n", logType)

			var logArgs []string
			if showFailedLogs {
				logArgs = []string{"run", "view", runID, "--log-failed"}
			} else {
				logArgs = []string{"run", "view", runID, "--log"}
			}
			logArgs = append(logArgs, ghRepoArgs()...)

			logResult, logErr := exec.GHOutput(logArgs...)
			if logErr == nil && strings.TrimSpace(logResult) != "" {
				lines := strings.Split(strings.TrimSpace(logResult), "\n")
				if len(lines) > 60 && !showLog {
					fmt.Printf("  ... (%d lines truncated, use --log for full output)\n\n", len(lines)-60)
					logResult = strings.Join(lines[len(lines)-60:], "\n")
				}
				fmt.Println(logResult)
			} else {
				ui.Muted("Could not fetch logs")
			}
		}

		return nil
	},
}

// --- run watch ---

var runWatchCmd = &cobra.Command{
	Use:   "watch <run-id>",
	Short: "Watch a workflow run in progress",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		runID := args[0]
		if err := validateRunID(runID); err != nil {
			return err
		}
		ui.Muted(fmt.Sprintf("Watching run %s...", runID))

		ghArgs := []string{"run", "watch", runID}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		fmt.Print(result.Stdout)
		if result.Stderr != "" {
			fmt.Print(result.Stderr)
		}
		return nil
	},
}

// --- run rerun ---

var runRerunCmd = &cobra.Command{
	Use:   "rerun <run-id>",
	Short: "Rerun a workflow",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("run_rerun"); err != nil {
			return err
		}

		cfg := config.Get()
		runID := args[0]
		if err := validateRunID(runID); err != nil {
			return err
		}
		failedOnly, _ := cmd.Flags().GetBool("failed")

		ghArgs := []string{"run", "rerun", runID}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		if failedOnly {
			ghArgs = append(ghArgs, "--failed")
		}

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"rerun": runID, "failed_only": failedOnly,
			})
			fmt.Println(string(data))
		} else {
			if failedOnly {
				ui.Success(fmt.Sprintf("Rerunning failed jobs for run %s", runID))
			} else {
				ui.Success(fmt.Sprintf("Rerunning all jobs for run %s", runID))
			}
		}
		return nil
	},
}

// --- run cancel ---

var runCancelCmd = &cobra.Command{
	Use:   "cancel <run-id>",
	Short: "Cancel a workflow run",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("run_cancel"); err != nil {
			return err
		}

		cfg := config.Get()
		runID := args[0]
		if err := validateRunID(runID); err != nil {
			return err
		}

		ghArgs := []string{"run", "cancel", runID}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{"cancelled": runID})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Cancelled run %s", runID))
		}
		return nil
	},
}

var runHelpCategories = []ui.HelpCategory{
	{Title: "Read (Always Safe)", Icon: "📖", Style: ui.SafeReadStyle, Commands: []ui.HelpCommand{
		{Name: "list", Desc: "List workflow runs (--flat for IDs)"},
		{Name: "view", Desc: "View run details with job breakdown"},
		{Name: "watch", Desc: "Watch a run in progress"},
	}},
	{Title: "Write (--write)", Icon: "✏️", Style: ui.SafeWriteStyle, Commands: []ui.HelpCommand{
		{Name: "rerun", Desc: "Rerun a workflow"},
		{Name: "cancel", Desc: "Cancel a workflow run"},
	}},
}

func init() {
	ghCmd.AddCommand(runCmd)

	runCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp("gw gh run", "workflow run operations", runHelpCategories, true)
		fmt.Print(output)
	})

	// run list
	runListCmd.Flags().StringP("workflow", "w", "", "Filter by workflow file name")
	runListCmd.Flags().StringP("branch", "b", "", "Filter by branch")
	runListCmd.Flags().StringP("status", "s", "", "Filter by status")
	runListCmd.Flags().Int("limit", 20, "Maximum number to return")
	runListCmd.Flags().Bool("flat", false, "Flat view: one run per line with IDs")
	runCmd.AddCommand(runListCmd)

	// run view
	runViewCmd.Flags().Bool("log", false, "Show full logs")
	runViewCmd.Flags().Bool("log-failed", false, "Show only failed job logs")
	runViewCmd.Flags().Bool("no-logs", false, "Skip auto-fetching failure logs")
	runCmd.AddCommand(runViewCmd)

	// run watch
	runCmd.AddCommand(runWatchCmd)

	// run rerun
	runRerunCmd.Flags().Bool("failed", false, "Only rerun failed jobs")
	runCmd.AddCommand(runRerunCmd)

	// run cancel
	runCmd.AddCommand(runCancelCmd)
}
