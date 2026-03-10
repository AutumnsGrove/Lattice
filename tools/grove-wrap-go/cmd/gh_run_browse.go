package cmd

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"

	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// browseRun holds parsed workflow run data for the browser.
type browseRun struct {
	ID           string `json:"databaseId"`
	Title        string `json:"displayTitle"`
	Status       string `json:"status"`
	Conclusion   string `json:"conclusion"`
	WorkflowName string `json:"workflowName"`
	HeadBranch   string `json:"headBranch"`
	HeadSha      string `json:"headSha"`
	Event        string `json:"event"`
	CreatedAt    string `json:"createdAt"`
	URL          string `json:"url"`

	// Populated by FetchDetail
	Jobs []runJob `json:"jobs,omitempty"`

	// GroupStart is true for the first run in a commit group (same headSha).
	// Computed during runsToItems() for visual separation.
	GroupStart bool `json:"-"`
}

type runJob struct {
	Name       string `json:"name"`
	Status     string `json:"status"`
	Conclusion string `json:"conclusion"`
	FailedSteps []string
}

// runFetchArgs holds the parameters needed to re-fetch runs in the TUI.
type runFetchArgs struct {
	workflow string
	branch   string
	status   string
	limit    int
}

// buildRunFetchArgs captures the current filter flags for TUI re-fetching.
func buildRunFetchArgs(workflow, branch, status string, limit int) runFetchArgs {
	return runFetchArgs{workflow: workflow, branch: branch, status: status, limit: limit}
}

// Run-specific status styles
var (
	runStatusSuccess    = lipgloss.NewStyle().Foreground(ui.ForestGreen).Bold(true)
	runStatusFailure    = lipgloss.NewStyle().Foreground(ui.DangerRed).Bold(true)
	runStatusInProgress = lipgloss.NewStyle().Foreground(ui.SunsetAmber)
	runStatusQueued     = lipgloss.NewStyle().Foreground(ui.DimGray)
)

func renderRunStatus(conclusion, status string) string {
	if strings.EqualFold(status, "in_progress") {
		return runStatusInProgress.Render("in_progress")
	}
	if strings.EqualFold(status, "queued") {
		return runStatusQueued.Render("queued")
	}
	switch strings.ToLower(conclusion) {
	case "success":
		return runStatusSuccess.Render("success")
	case "failure":
		return runStatusFailure.Render("failure")
	case "cancelled":
		return runStatusQueued.Render("cancelled")
	default:
		display := conclusion
		if display == "" {
			display = status
		}
		return display
	}
}

// runRunBrowse launches the interactive run browser using the shared framework.
func runRunBrowse(runs []browseRun, pageSize int, fetchArgs runFetchArgs) error {
	items := runsToItems(runs)
	allLoaded := len(runs) < fetchArgs.limit

	return RunBrowser(items, pageSize, browseConfig{
		Title:      "Run Browser",
		CountLabel: "workflow runs",
		AllLoaded:  allLoaded,

		RenderRow: func(data any, width int) string {
			run := data.(browseRun)
			icon := conclusionIcon(run.Conclusion, run.Status)

			// SHA column: show hash for group starts, dot for continuations
			sha := run.HeadSha
			if len(sha) > 7 {
				sha = sha[:7]
			}
			shaCol := "   ·   " // 7 chars to match SHA width
			if run.GroupStart {
				shaCol = sha
			}

			// Plain-text status for alignment (color applied separately)
			display := run.Conclusion
			if display == "" {
				display = run.Status
			}

			workflow := TruncateStr(run.WorkflowName, 26)
			branch := TruncateStr(run.HeadBranch, 18)
			date := truncDate(run.CreatedAt)

			return fmt.Sprintf("%s %s %-11s %-26s %-18s %s",
				icon, shaCol, display, workflow, branch, date)
		},

		RenderDetail: func(data any) string {
			run := data.(browseRun)
			var b strings.Builder
			b.WriteString(browseHeaderStyle.Render(fmt.Sprintf("Run #%s: %s", run.ID, run.Title)) + "\n\n")
			b.WriteString(fmt.Sprintf("  Workflow:   %s\n", run.WorkflowName))
			b.WriteString(fmt.Sprintf("  Status:     %s\n", renderRunStatus(run.Conclusion, run.Status)))
			b.WriteString(fmt.Sprintf("  Branch:     %s\n", run.HeadBranch))
			b.WriteString(fmt.Sprintf("  Event:      %s\n", run.Event))
			b.WriteString(fmt.Sprintf("  Created:    %s\n", run.CreatedAt))
			if run.HeadSha != "" {
				sha := run.HeadSha
				if len(sha) > 7 {
					sha = sha[:7]
				}
				b.WriteString(fmt.Sprintf("  Commit:     %s\n", sha))
			}
			b.WriteString(fmt.Sprintf("  URL:        %s\n", run.URL))

			if len(run.Jobs) > 0 {
				b.WriteString("\n")
				b.WriteString(browseHelpCatStyle.Render("  Jobs") + "\n")
				for _, job := range run.Jobs {
					icon := conclusionIcon(job.Conclusion, job.Status)
					display := job.Conclusion
					if display == "" {
						display = job.Status
					}
					line := fmt.Sprintf("    %s %-35s %s", icon, job.Name, display)
					if len(job.FailedSteps) > 0 {
						line += "  ← " + strings.Join(job.FailedSteps, ", ")
					}
					b.WriteString(line + "\n")
				}
			}

			return b.String()
		},

		FetchDetail: func(data any) any {
			run := data.(browseRun)
			ghArgs := []string{"run", "view", run.ID}
			ghArgs = append(ghArgs, ghRepoArgs()...)
			ghArgs = append(ghArgs, "--json", "jobs")
			output, err := gwexec.GHOutput(ghArgs...)
			if err == nil {
				var d map[string]interface{}
				if json.Unmarshal([]byte(output), &d) == nil {
					run.Jobs = parseRunJobs(d)
				}
			}
			return run
		},

		Actions: []browseAction{
			{Key: "O", Hint: "O open", Inline: true, Handler: func(data any) error {
				run := data.(browseRun)
				ghArgs := []string{"run", "view", run.ID, "--web"}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				gwexec.GH(ghArgs...)
				return nil
			}},
			{Key: "L", Hint: "L logs", Handler: func(data any) error {
				run := data.(browseRun)
				fmt.Printf("\n  Fetching failed logs for run %s...\n\n", run.ID)
				logArgs := []string{"run", "view", run.ID, "--log-failed"}
				logArgs = append(logArgs, ghRepoArgs()...)
				logResult, err := gwexec.GHOutput(logArgs...)
				if err == nil && strings.TrimSpace(logResult) != "" {
					lines := strings.Split(strings.TrimSpace(logResult), "\n")
					if len(lines) > 60 {
						fmt.Printf("  ... (%d lines truncated, showing last 60)\n\n", len(lines)-60)
						logResult = strings.Join(lines[len(lines)-60:], "\n")
					}
					fmt.Println(logResult)
				} else {
					ui.Muted("No failure logs available")
				}
				return nil
			}},
			{Key: "W", Hint: "W watch", Handler: func(data any) error {
				run := data.(browseRun)
				ui.Muted(fmt.Sprintf("Watching run %s...", run.ID))
				ghArgs := []string{"run", "watch", run.ID}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				exitCode, err := gwexec.GHStreaming(ghArgs...)
				if err != nil {
					return fmt.Errorf("github error: %w", err)
				}
				if exitCode != 0 {
					return fmt.Errorf("gh run watch exited with code %d", exitCode)
				}
				return nil
			}},
			{Key: "R", Hint: "R rerun", Handler: func(data any) error {
				if err := requireGHSafety("run_rerun"); err != nil {
					ui.Warning(fmt.Sprintf("Rerun requires --write flag"))
					return nil
				}
				run := data.(browseRun)
				ghArgs := []string{"run", "rerun", run.ID}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				result, err := gwexec.GH(ghArgs...)
				if err != nil {
					return fmt.Errorf("github error: %w", err)
				}
				if !result.OK() {
					return fmt.Errorf("github error: %s", result.Stderr)
				}
				ui.Success(fmt.Sprintf("Rerunning all jobs for run %s", run.ID))
				return nil
			}},
			{Key: "F", Hint: "F failed", Handler: func(data any) error {
				if err := requireGHSafety("run_rerun"); err != nil {
					ui.Warning(fmt.Sprintf("Rerun requires --write flag"))
					return nil
				}
				run := data.(browseRun)
				ghArgs := []string{"run", "rerun", run.ID, "--failed"}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				result, err := gwexec.GH(ghArgs...)
				if err != nil {
					return fmt.Errorf("github error: %w", err)
				}
				if !result.OK() {
					return fmt.Errorf("github error: %s", result.Stderr)
				}
				ui.Success(fmt.Sprintf("Rerunning failed jobs for run %s", run.ID))
				return nil
			}},
			{Key: "X", Hint: "X cancel", Handler: func(data any) error {
				if err := requireGHSafety("run_cancel"); err != nil {
					ui.Warning(fmt.Sprintf("Cancel requires --write flag"))
					return nil
				}
				run := data.(browseRun)
				ghArgs := []string{"run", "cancel", run.ID}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				result, err := gwexec.GH(ghArgs...)
				if err != nil {
					return fmt.Errorf("github error: %w", err)
				}
				if !result.OK() {
					return fmt.Errorf("github error: %s", result.Stderr)
				}
				ui.Success(fmt.Sprintf("Cancelled run %s", run.ID))
				return nil
			}},
			{Key: "A", Hint: "A diagnose", Handler: func(data any) error {
				run := data.(browseRun)
				return launchClaudeForRun(run)
			}},
		},

		FetchMore: func(currentCount int) ([]browseItem, error) {
			runs, err := fetchMoreRuns(fetchArgs, currentCount)
			if err != nil {
				return nil, err
			}
			return runsToItems(runs), nil
		},

		FilterMatch: func(data any, query string) bool {
			run := data.(browseRun)
			lower := strings.ToLower(query)
			return strings.Contains(strings.ToLower(run.WorkflowName), lower) ||
				strings.Contains(strings.ToLower(run.HeadBranch), lower) ||
				strings.Contains(strings.ToLower(run.Conclusion), lower) ||
				strings.Contains(strings.ToLower(run.Status), lower) ||
				strings.Contains(strings.ToLower(run.Title), lower) ||
				strings.Contains(run.ID, query)
		},
	})
}

// launchClaudeForRun fetches failure context and launches Claude Code for diagnosis.
func launchClaudeForRun(run browseRun) error {
	// Fetch failed job logs for context
	var failedLogs string
	logArgs := []string{"run", "view", run.ID, "--log-failed"}
	logArgs = append(logArgs, ghRepoArgs()...)
	logResult, err := gwexec.GHOutput(logArgs...)
	if err == nil && strings.TrimSpace(logResult) != "" {
		lines := strings.Split(strings.TrimSpace(logResult), "\n")
		// Truncate to last 80 lines to keep the prompt focused
		if len(lines) > 80 {
			failedLogs = strings.Join(lines[len(lines)-80:], "\n")
		} else {
			failedLogs = strings.TrimSpace(logResult)
		}
	}

	// Build the failed jobs summary
	var failedJobs []string
	if len(run.Jobs) > 0 {
		for _, job := range run.Jobs {
			if strings.EqualFold(job.Conclusion, "failure") {
				entry := job.Name
				if len(job.FailedSteps) > 0 {
					entry += " (" + strings.Join(job.FailedSteps, ", ") + ")"
				}
				failedJobs = append(failedJobs, entry)
			}
		}
	}

	// If we don't have job info yet, fetch it
	if len(run.Jobs) == 0 {
		ghArgs := []string{"run", "view", run.ID}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--json", "jobs")
		output, fetchErr := gwexec.GHOutput(ghArgs...)
		if fetchErr == nil {
			var d map[string]interface{}
			if json.Unmarshal([]byte(output), &d) == nil {
				jobs := parseRunJobs(d)
				for _, job := range jobs {
					if strings.EqualFold(job.Conclusion, "failure") {
						entry := job.Name
						if len(job.FailedSteps) > 0 {
							entry += " (" + strings.Join(job.FailedSteps, ", ") + ")"
						}
						failedJobs = append(failedJobs, entry)
					}
				}
			}
		}
	}

	// Build prompt
	var prompt strings.Builder
	prompt.WriteString(fmt.Sprintf(
		"GitHub Actions run %s for workflow '%s' failed on branch '%s'.",
		run.ID, run.WorkflowName, run.HeadBranch))

	if len(failedJobs) > 0 {
		prompt.WriteString(fmt.Sprintf("\n\nFailed jobs: %s", strings.Join(failedJobs, "; ")))
	}

	if failedLogs != "" {
		prompt.WriteString("\n\nFailure logs (last 80 lines):\n```\n")
		prompt.WriteString(failedLogs)
		prompt.WriteString("\n```")
	}

	prompt.WriteString("\n\nDiagnose the failure, identify the root cause, and suggest a fix.")

	root := effectiveRoot()
	ui.Info(fmt.Sprintf("Launching Claude Code to diagnose run %s", run.ID))

	args := []string{prompt.String()}
	exitCode, launchErr := gwexec.RunStreamingInDir(root, "claude", args...)
	if launchErr != nil {
		return fmt.Errorf("failed to launch claude: %w", launchErr)
	}
	if exitCode != 0 {
		return fmt.Errorf("claude exited with code %d", exitCode)
	}
	return nil
}

// runsToItems converts domain runs to generic browse items,
// marking group boundaries where the commit SHA changes.
func runsToItems(runs []browseRun) []browseItem {
	items := make([]browseItem, len(runs))
	var lastSha string
	for i, run := range runs {
		run.GroupStart = run.HeadSha != lastSha
		lastSha = run.HeadSha

		labels := []string{run.WorkflowName, run.HeadBranch}
		display := run.Conclusion
		if display == "" {
			display = run.Status
		}
		if display != "" {
			labels = append(labels, display)
		}
		items[i] = browseItem{Labels: labels, Data: run}
	}
	return items
}

// parseRunsToBrowse converts raw JSON run data to browseRun structs.
func parseRunsToBrowse(raw string) ([]browseRun, error) {
	var runs []map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &runs); err != nil {
		return nil, err
	}

	result := make([]browseRun, 0, len(runs))
	for _, r := range runs {
		br := browseRun{
			ID:           formatRunID(r["databaseId"]),
			Title:        fmt.Sprintf("%v", r["displayTitle"]),
			WorkflowName: fmt.Sprintf("%v", r["workflowName"]),
			HeadBranch:   fmt.Sprintf("%v", r["headBranch"]),
			Event:        fmt.Sprintf("%v", r["event"]),
			CreatedAt:    fmt.Sprintf("%v", r["createdAt"]),
			URL:          fmt.Sprintf("%v", r["url"]),
		}
		if status, ok := r["status"].(string); ok {
			br.Status = status
		}
		if conclusion, ok := r["conclusion"].(string); ok {
			br.Conclusion = conclusion
		}
		if sha, ok := r["headSha"].(string); ok {
			br.HeadSha = sha
		}
		result = append(result, br)
	}
	return result, nil
}

// parseRunJobs extracts job data from a run view response.
func parseRunJobs(data map[string]interface{}) []runJob {
	rawJobs, ok := data["jobs"].([]interface{})
	if !ok {
		return nil
	}

	var jobs []runJob
	for _, j := range rawJobs {
		job, ok := j.(map[string]interface{})
		if !ok {
			continue
		}
		rj := runJob{
			Name: fmt.Sprintf("%v", job["name"]),
		}
		if c, ok := job["conclusion"].(string); ok {
			rj.Conclusion = c
		}
		if s, ok := job["status"].(string); ok {
			rj.Status = s
		}

		// Extract failed step names
		if steps, ok := job["steps"].([]interface{}); ok {
			for _, s := range steps {
				step, ok := s.(map[string]interface{})
				if !ok {
					continue
				}
				if c, _ := step["conclusion"].(string); strings.EqualFold(c, "failure") {
					if name, ok := step["name"].(string); ok {
						rj.FailedSteps = append(rj.FailedSteps, name)
					}
				}
			}
		}

		jobs = append(jobs, rj)
	}
	return jobs
}

// fetchMoreRuns fetches the next page of runs for the TUI browser.
func fetchMoreRuns(args runFetchArgs, currentCount int) ([]browseRun, error) {
	nextPage := (currentCount / args.limit) + 1
	fetchLimit := args.limit * (nextPage + 1)
	if fetchLimit > maxGHLimit {
		fetchLimit = maxGHLimit
	}
	if fetchLimit <= currentCount {
		return nil, nil
	}

	ghArgs := []string{"run", "list"}
	ghArgs = append(ghArgs, ghRepoArgs()...)
	ghArgs = append(ghArgs, "--limit", fmt.Sprintf("%d", fetchLimit))
	ghArgs = append(ghArgs, "--json",
		"databaseId,displayTitle,status,conclusion,workflowName,headBranch,event,createdAt,url,headSha")

	if args.workflow != "" {
		ghArgs = append(ghArgs, "--workflow", args.workflow)
	}
	if args.branch != "" {
		ghArgs = append(ghArgs, "--branch", args.branch)
	}
	if args.status != "" {
		ghArgs = append(ghArgs, "--status", args.status)
	}

	output, err := gwexec.GHOutput(ghArgs...)
	if err != nil {
		return nil, err
	}
	return parseRunsToBrowse(output)
}
