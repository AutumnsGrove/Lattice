package cmd

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/search"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/tools"
)

// ---------- github (parent command) ----------

var githubCmd = &cobra.Command{
	Use:     "github",
	Aliases: []string{"gh"},
	Short:   "GitHub issue and PR commands",
	Long:    `GitHub subcommands for browsing issues, PRs, and cross-referencing them with the codebase.`,
}

func init() {
	githubCmd.AddCommand(ghIssueCmd)
	githubCmd.AddCommand(ghIssuesCmd)
	githubCmd.AddCommand(ghBoardCmd)
	githubCmd.AddCommand(ghMineCmd)
	githubCmd.AddCommand(ghStaleCmd)
	githubCmd.AddCommand(ghRefsCmd)
	githubCmd.AddCommand(ghLinkCmd)
}

// requireGh checks whether the gh CLI is available and prints an error if not.
func requireGh() error {
	t := tools.Discover()
	if !t.HasGh() {
		return fmt.Errorf("gh CLI is not installed or not in PATH — GitHub commands require it.\nInstall: https://cli.github.com")
	}
	return nil
}

// ---------- issue [number] ----------

var ghIssueCmd = &cobra.Command{
	Use:   "issue [number]",
	Short: "View a specific issue or list recent open issues",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGh(); err != nil {
			return err
		}
		cfg := config.Get()

		if len(args) == 0 {
			return ghListRecentIssues(cfg)
		}

		number := args[0]
		return ghViewIssue(cfg, number)
	},
}

func ghListRecentIssues(cfg *config.Config) error {
	result, err := search.RunGh("issue", "list", "--limit", "15", "--state", "open",
		"--json", "number,title,labels,assignees,updatedAt")
	if err != nil {
		return fmt.Errorf("gh issue list failed: %w", err)
	}

	if cfg.JSONMode {
		// Pass through the raw JSON from gh.
		var parsed any
		if err := json.Unmarshal([]byte(result), &parsed); err != nil {
			output.PrintJSON(map[string]any{"command": "github issue", "raw": result})
			return nil
		}
		output.PrintJSON(map[string]any{
			"command": "github issue",
			"issues":  parsed,
		})
		return nil
	}

	output.PrintSection("Recent Open Issues")
	if strings.TrimSpace(result) == "" || strings.TrimSpace(result) == "[]" {
		output.PrintNoResults("open issues")
		return nil
	}

	var issues []map[string]any
	if err := json.Unmarshal([]byte(result), &issues); err != nil {
		output.PrintRaw(result)
		return nil
	}

	for _, issue := range issues {
		num := jsonFloat(issue, "number")
		title := jsonString(issue, "title")
		labels := jsonLabelNames(issue, "labels")
		labelStr := ""
		if len(labels) > 0 {
			labelStr = " [" + strings.Join(labels, ", ") + "]"
		}
		output.Printf("  #%.0f  %s%s", num, title, labelStr)
	}

	return nil
}

func ghViewIssue(cfg *config.Config, number string) error {
	// Fetch the issue details.
	issueResult, err := search.RunGh("issue", "view", number,
		"--json", "number,title,body,state,labels,assignees,createdAt,updatedAt,comments")
	if err != nil {
		return fmt.Errorf("gh issue view failed: %w", err)
	}

	// Also find related PRs that mention this issue.
	prResult, _ := search.RunGh("pr", "list", "--search", fmt.Sprintf("issue:%s", number),
		"--state", "all", "--limit", "10",
		"--json", "number,title,state,headRefName")

	// Find branches mentioning the issue number.
	branchResult, _ := search.RunGit("branch", "-a", "--list", fmt.Sprintf("*%s*", number))

	// Find commits referencing the issue.
	commitResult, _ := search.RunGit("log", "--all", "--oneline", "--grep", fmt.Sprintf("#%s", number), "-20")

	if cfg.JSONMode {
		data := map[string]any{
			"command": "github issue",
			"number":  number,
		}
		var issueData any
		if err := json.Unmarshal([]byte(issueResult), &issueData); err == nil {
			data["issue"] = issueData
		} else {
			data["issue_raw"] = issueResult
		}

		var prData any
		if prResult != "" {
			if err := json.Unmarshal([]byte(prResult), &prData); err == nil {
				data["related_prs"] = prData
			}
		}
		data["related_branches"] = search.SplitLines(branchResult)
		data["related_commits"] = search.SplitLines(commitResult)

		output.PrintJSON(data)
		return nil
	}

	output.PrintSection(fmt.Sprintf("Issue #%s", number))

	var issue map[string]any
	if err := json.Unmarshal([]byte(issueResult), &issue); err != nil {
		output.PrintRaw(issueResult)
	} else {
		title := jsonString(issue, "title")
		state := jsonString(issue, "state")
		body := jsonString(issue, "body")
		labels := jsonLabelNames(issue, "labels")

		output.Printf("  Title: %s", title)
		output.Printf("  State: %s", state)
		if len(labels) > 0 {
			output.Printf("  Labels: %s", strings.Join(labels, ", "))
		}
		if body != "" {
			output.PrintSection("Body")
			// Truncate long bodies.
			if len(body) > 1000 {
				body = body[:1000] + "\n  ...(truncated)"
			}
			output.PrintRaw(body + "\n")
		}
	}

	// Related PRs.
	if prResult != "" && strings.TrimSpace(prResult) != "[]" {
		output.PrintSection("Related PRs")
		var prs []map[string]any
		if err := json.Unmarshal([]byte(prResult), &prs); err == nil {
			for _, pr := range prs {
				num := jsonFloat(pr, "number")
				title := jsonString(pr, "title")
				state := jsonString(pr, "state")
				branch := jsonString(pr, "headRefName")
				output.Printf("  #%.0f  %s (%s) [%s]", num, title, state, branch)
			}
		}
	}

	// Related branches.
	branches := search.SplitLines(branchResult)
	if len(branches) > 0 {
		output.PrintSection("Related Branches")
		for _, b := range branches {
			output.Printf("  %s", strings.TrimSpace(b))
		}
	}

	// Related commits.
	commits := search.SplitLines(commitResult)
	if len(commits) > 0 {
		output.PrintSection("Related Commits")
		for _, c := range commits {
			output.Printf("  %s", c)
		}
	}

	return nil
}

// ---------- issues [filter] ----------

var ghIssuesCmd = &cobra.Command{
	Use:   "issues [filter]",
	Short: "Flexible issue filtering: label, \"closed\", \"all\", @username, keyword",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGh(); err != nil {
			return err
		}
		cfg := config.Get()
		filter := ""
		if len(args) > 0 {
			filter = args[0]
		}
		return ghFilterIssues(cfg, filter)
	},
}

func ghFilterIssues(cfg *config.Config, filter string) error {
	ghArgs := []string{"issue", "list", "--limit", "30",
		"--json", "number,title,state,labels,assignees,updatedAt"}

	switch {
	case filter == "":
		ghArgs = append(ghArgs, "--state", "open")
	case filter == "closed":
		ghArgs = append(ghArgs, "--state", "closed")
	case filter == "all":
		ghArgs = append(ghArgs, "--state", "all")
	case strings.HasPrefix(filter, "@"):
		username := strings.TrimPrefix(filter, "@")
		ghArgs = append(ghArgs, "--state", "open", "--assignee", username)
	default:
		// Try as a label first; fall back to search.
		ghArgs = append(ghArgs, "--state", "open", "--search", filter)
	}

	result, err := search.RunGh(ghArgs...)
	if err != nil {
		return fmt.Errorf("gh issue list failed: %w", err)
	}

	if cfg.JSONMode {
		var parsed any
		if err := json.Unmarshal([]byte(result), &parsed); err != nil {
			output.PrintJSON(map[string]any{"command": "github issues", "filter": filter, "raw": result})
			return nil
		}
		output.PrintJSON(map[string]any{
			"command": "github issues",
			"filter":  filter,
			"issues":  parsed,
		})
		return nil
	}

	label := "Issues"
	if filter != "" {
		label = fmt.Sprintf("Issues (filter: %s)", filter)
	}
	output.PrintSection(label)

	if strings.TrimSpace(result) == "" || strings.TrimSpace(result) == "[]" {
		output.PrintNoResults("matching issues")
		return nil
	}

	var issues []map[string]any
	if err := json.Unmarshal([]byte(result), &issues); err != nil {
		output.PrintRaw(result)
		return nil
	}

	for _, issue := range issues {
		num := jsonFloat(issue, "number")
		title := jsonString(issue, "title")
		state := jsonString(issue, "state")
		labels := jsonLabelNames(issue, "labels")
		labelStr := ""
		if len(labels) > 0 {
			labelStr = " [" + strings.Join(labels, ", ") + "]"
		}
		stateTag := ""
		if state != "" && state != "OPEN" {
			stateTag = fmt.Sprintf(" (%s)", strings.ToLower(state))
		}
		output.Printf("  #%.0f  %s%s%s", num, title, labelStr, stateTag)
	}

	return nil
}

// ---------- board ----------

var ghBoardCmd = &cobra.Command{
	Use:   "board",
	Short: "Board-style overview grouped by label",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGh(); err != nil {
			return err
		}
		cfg := config.Get()

		result, err := search.RunGh("issue", "list", "--state", "open", "--limit", "100",
			"--json", "number,title,labels,assignees")
		if err != nil {
			return fmt.Errorf("gh issue list failed: %w", err)
		}

		if strings.TrimSpace(result) == "" || strings.TrimSpace(result) == "[]" {
			if cfg.JSONMode {
				output.PrintJSON(map[string]any{"command": "github board", "groups": map[string]any{}})
			} else {
				output.PrintSection("Board")
				output.PrintNoResults("open issues")
			}
			return nil
		}

		var issues []map[string]any
		if err := json.Unmarshal([]byte(result), &issues); err != nil {
			return fmt.Errorf("failed to parse issue JSON: %w", err)
		}

		// Group issues by label.
		groups := make(map[string][]map[string]any)
		unlabeled := make([]map[string]any, 0)

		for _, issue := range issues {
			labels := jsonLabelNames(issue, "labels")
			if len(labels) == 0 {
				unlabeled = append(unlabeled, issue)
			} else {
				for _, label := range labels {
					groups[label] = append(groups[label], issue)
				}
			}
		}

		if cfg.JSONMode {
			jsonGroups := make(map[string]any)
			for label, items := range groups {
				jsonGroups[label] = items
			}
			if len(unlabeled) > 0 {
				jsonGroups["_unlabeled"] = unlabeled
			}
			output.PrintJSON(map[string]any{
				"command": "github board",
				"groups":  jsonGroups,
				"total":   len(issues),
			})
			return nil
		}

		output.PrintMajorHeader("Issue Board")

		// Sort label names for consistent output.
		sortedLabels := make([]string, 0, len(groups))
		for label := range groups {
			sortedLabels = append(sortedLabels, label)
		}
		sort.Strings(sortedLabels)

		for _, label := range sortedLabels {
			items := groups[label]
			output.PrintSection(fmt.Sprintf("%s (%d)", label, len(items)))
			for _, issue := range items {
				num := jsonFloat(issue, "number")
				title := jsonString(issue, "title")
				output.Printf("  #%.0f  %s", num, title)
			}
		}

		if len(unlabeled) > 0 {
			output.PrintSection(fmt.Sprintf("Unlabeled (%d)", len(unlabeled)))
			for _, issue := range unlabeled {
				num := jsonFloat(issue, "number")
				title := jsonString(issue, "title")
				output.Printf("  #%.0f  %s", num, title)
			}
		}

		output.PrintCount("open issues", len(issues))

		return nil
	},
}

// ---------- mine ----------

var ghMineCmd = &cobra.Command{
	Use:   "mine",
	Short: "Issues assigned to current user",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGh(); err != nil {
			return err
		}
		cfg := config.Get()

		// Get the current username.
		userResult, err := search.RunGh("api", "user", "--jq", ".login")
		if err != nil {
			return fmt.Errorf("failed to get current user: %w", err)
		}
		username := strings.TrimSpace(userResult)
		if username == "" {
			return fmt.Errorf("could not determine current GitHub username — are you logged in? (gh auth login)")
		}

		result, err := search.RunGh("issue", "list", "--state", "open", "--assignee", username,
			"--limit", "50",
			"--json", "number,title,labels,updatedAt,state")
		if err != nil {
			return fmt.Errorf("gh issue list failed: %w", err)
		}

		if cfg.JSONMode {
			var parsed any
			if err := json.Unmarshal([]byte(result), &parsed); err != nil {
				output.PrintJSON(map[string]any{"command": "github mine", "username": username, "raw": result})
				return nil
			}
			output.PrintJSON(map[string]any{
				"command":  "github mine",
				"username": username,
				"issues":   parsed,
			})
			return nil
		}

		output.PrintSection(fmt.Sprintf("Issues assigned to @%s", username))

		if strings.TrimSpace(result) == "" || strings.TrimSpace(result) == "[]" {
			output.PrintNoResults("assigned issues")
			return nil
		}

		var issues []map[string]any
		if err := json.Unmarshal([]byte(result), &issues); err != nil {
			output.PrintRaw(result)
			return nil
		}

		for _, issue := range issues {
			num := jsonFloat(issue, "number")
			title := jsonString(issue, "title")
			labels := jsonLabelNames(issue, "labels")
			labelStr := ""
			if len(labels) > 0 {
				labelStr = " [" + strings.Join(labels, ", ") + "]"
			}
			output.Printf("  #%.0f  %s%s", num, title, labelStr)
		}

		output.PrintCount("assigned issues", len(issues))
		return nil
	},
}

// ---------- stale [days=30] ----------

var ghStaleCmd = &cobra.Command{
	Use:   "stale [days]",
	Short: "Issues with no activity since cutoff (default: 30 days)",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGh(); err != nil {
			return err
		}
		cfg := config.Get()

		days := 30
		if len(args) > 0 {
			parsed, err := strconv.Atoi(args[0])
			if err != nil || parsed <= 0 {
				return fmt.Errorf("days must be a positive integer, got: %s", args[0])
			}
			days = parsed
		}

		cutoff := time.Now().AddDate(0, 0, -days)
		cutoffStr := cutoff.Format("2006-01-02")

		// Fetch open issues with their updatedAt timestamps.
		result, err := search.RunGh("issue", "list", "--state", "open", "--limit", "100",
			"--json", "number,title,labels,assignees,updatedAt,createdAt")
		if err != nil {
			return fmt.Errorf("gh issue list failed: %w", err)
		}

		if strings.TrimSpace(result) == "" || strings.TrimSpace(result) == "[]" {
			if cfg.JSONMode {
				output.PrintJSON(map[string]any{"command": "github stale", "days": days, "issues": []any{}})
			} else {
				output.PrintSection(fmt.Sprintf("Stale Issues (no activity in %d days)", days))
				output.PrintNoResults("open issues")
			}
			return nil
		}

		var issues []map[string]any
		if err := json.Unmarshal([]byte(result), &issues); err != nil {
			return fmt.Errorf("failed to parse issue JSON: %w", err)
		}

		// Filter to stale issues.
		stale := make([]map[string]any, 0)
		for _, issue := range issues {
			updatedStr := jsonString(issue, "updatedAt")
			if updatedStr == "" {
				continue
			}
			updatedAt, err := time.Parse(time.RFC3339, updatedStr)
			if err != nil {
				continue
			}
			if updatedAt.Before(cutoff) {
				stale = append(stale, issue)
			}
		}

		// Sort by updatedAt ascending (stalest first).
		sort.Slice(stale, func(i, j int) bool {
			ti := jsonString(stale[i], "updatedAt")
			tj := jsonString(stale[j], "updatedAt")
			return ti < tj
		})

		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command": "github stale",
				"days":    days,
				"cutoff":  cutoffStr,
				"count":   len(stale),
				"issues":  stale,
			})
			return nil
		}

		output.PrintSection(fmt.Sprintf("Stale Issues (no activity since %s, %d days)", cutoffStr, days))

		if len(stale) == 0 {
			output.PrintNoResults("stale issues")
			return nil
		}

		for _, issue := range stale {
			num := jsonFloat(issue, "number")
			title := jsonString(issue, "title")
			updatedStr := jsonString(issue, "updatedAt")
			updatedAt, _ := time.Parse(time.RFC3339, updatedStr)
			daysSince := int(time.Since(updatedAt).Hours() / 24)
			labels := jsonLabelNames(issue, "labels")
			labelStr := ""
			if len(labels) > 0 {
				labelStr = " [" + strings.Join(labels, ", ") + "]"
			}
			output.Printf("  #%.0f  %s%s  (%d days ago)", num, title, labelStr, daysSince)
		}

		output.PrintCount("stale issues", len(stale))
		return nil
	},
}

// ---------- refs <number> ----------

var ghRefsCmd = &cobra.Command{
	Use:   "refs <number>",
	Short: "Find references to an issue in code, commits, branches, and PRs",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGh(); err != nil {
			return err
		}
		cfg := config.Get()
		number := args[0]

		// Search codebase for issue references (#N, issue N, etc.)
		issueTag := fmt.Sprintf("#%s", number)
		codeResult, _ := search.RunRg(issueTag)

		// Search for URL-style references.
		urlPattern := fmt.Sprintf(`issues/%s`, number)
		urlResult, _ := search.RunRg(urlPattern)

		// Git log references.
		commitResult, _ := search.RunGit("log", "--all", "--oneline", "--grep", issueTag, "-30")

		// Branches referencing the issue.
		branchResult, _ := search.RunGit("branch", "-a", "--list", fmt.Sprintf("*%s*", number))

		// PRs referencing the issue.
		prResult, _ := search.RunGh("pr", "list", "--search", number,
			"--state", "all", "--limit", "15",
			"--json", "number,title,state,headRefName")

		codeLines := search.SplitLines(codeResult)
		urlLines := search.SplitLines(urlResult)
		commits := search.SplitLines(commitResult)
		branches := search.SplitLines(branchResult)

		// Deduplicate code lines and URL lines.
		allCodeLines := dedup(append(codeLines, urlLines...))

		if cfg.JSONMode {
			data := map[string]any{
				"command":     "github refs",
				"number":      number,
				"code_refs":   allCodeLines,
				"commits":     commits,
				"branches":    branches,
			}
			if prResult != "" {
				var prs any
				if err := json.Unmarshal([]byte(prResult), &prs); err == nil {
					data["pull_requests"] = prs
				}
			}
			output.PrintJSON(data)
			return nil
		}

		output.PrintMajorHeader(fmt.Sprintf("References to Issue #%s", number))

		// Code references.
		output.PrintSection("Code References")
		if len(allCodeLines) > 0 {
			show, overflow := output.TruncateResults(allCodeLines, 30)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if overflow > 0 {
				output.Printf("  ... and %d more", overflow)
			}
		} else {
			output.PrintNoResults("code references")
		}

		// Commits.
		output.PrintSection("Commits")
		if len(commits) > 0 {
			for _, c := range commits {
				output.Printf("  %s", c)
			}
		} else {
			output.PrintNoResults("commits")
		}

		// Branches.
		output.PrintSection("Branches")
		if len(branches) > 0 {
			for _, b := range branches {
				output.Printf("  %s", strings.TrimSpace(b))
			}
		} else {
			output.PrintNoResults("branches")
		}

		// Pull requests.
		if prResult != "" && strings.TrimSpace(prResult) != "[]" {
			output.PrintSection("Pull Requests")
			var prs []map[string]any
			if err := json.Unmarshal([]byte(prResult), &prs); err == nil {
				for _, pr := range prs {
					num := jsonFloat(pr, "number")
					title := jsonString(pr, "title")
					state := jsonString(pr, "state")
					output.Printf("  #%.0f  %s (%s)", num, title, strings.ToLower(state))
				}
			}
		}

		return nil
	},
}

// ---------- link <filepath> ----------

var ghLinkCmd = &cobra.Command{
	Use:   "link <filepath>",
	Short: "Find issues related to a file via commit history",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGh(); err != nil {
			return err
		}
		cfg := config.Get()
		filepath := args[0]

		// Get commit log for this file.
		logResult, err := search.RunGit("log", "--oneline", "--follow", "-50", "--", filepath)
		if err != nil {
			return fmt.Errorf("git log failed for %s: %w", filepath, err)
		}

		commits := search.SplitLines(logResult)
		if len(commits) == 0 {
			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command":  "github link",
					"filepath": filepath,
					"issues":   []any{},
				})
			} else {
				output.PrintSection(fmt.Sprintf("Issues linked to: %s", filepath))
				output.PrintNoResults("commits for this file")
			}
			return nil
		}

		// Extract issue numbers from commit messages (#N pattern).
		issueRe := regexp.MustCompile(`#(\d+)`)
		issueSet := make(map[string]bool)
		for _, commit := range commits {
			matches := issueRe.FindAllStringSubmatch(commit, -1)
			for _, m := range matches {
				issueSet[m[1]] = true
			}
		}

		issueNumbers := make([]string, 0, len(issueSet))
		for num := range issueSet {
			issueNumbers = append(issueNumbers, num)
		}
		sort.Strings(issueNumbers)

		// Fetch details for each referenced issue.
		type issueInfo struct {
			Number string
			Title  string
			State  string
			Labels []string
		}

		issueDetails := make([]issueInfo, 0, len(issueNumbers))
		for _, num := range issueNumbers {
			result, err := search.RunGh("issue", "view", num,
				"--json", "number,title,state,labels")
			if err != nil {
				continue
			}
			var data map[string]any
			if err := json.Unmarshal([]byte(result), &data); err != nil {
				continue
			}
			issueDetails = append(issueDetails, issueInfo{
				Number: num,
				Title:  jsonString(data, "title"),
				State:  jsonString(data, "state"),
				Labels: jsonLabelNames(data, "labels"),
			})
		}

		if cfg.JSONMode {
			output.PrintJSON(map[string]any{
				"command":        "github link",
				"filepath":       filepath,
				"total_commits":  len(commits),
				"issue_numbers":  issueNumbers,
				"issue_details":  issueDetails,
			})
			return nil
		}

		output.PrintSection(fmt.Sprintf("Issues linked to: %s", filepath))
		output.PrintDim(fmt.Sprintf("  (scanned %d commits)", len(commits)))

		if len(issueDetails) == 0 {
			if len(issueNumbers) == 0 {
				output.PrintNoResults("issue references in commit history")
			} else {
				output.Print("  Referenced issues (could not fetch details):")
				for _, num := range issueNumbers {
					output.Printf("    #%s", num)
				}
			}
			return nil
		}

		for _, info := range issueDetails {
			labelStr := ""
			if len(info.Labels) > 0 {
				labelStr = " [" + strings.Join(info.Labels, ", ") + "]"
			}
			stateTag := strings.ToLower(info.State)
			output.Printf("  #%s  %s (%s)%s", info.Number, info.Title, stateTag, labelStr)
		}

		output.PrintCount("linked issues", len(issueDetails))
		return nil
	},
}

// ---------- JSON helpers ----------

// jsonString extracts a string field from a JSON object map.
func jsonString(m map[string]any, key string) string {
	v, ok := m[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return fmt.Sprintf("%v", v)
	}
	return s
}

// jsonFloat extracts a numeric field from a JSON object map.
func jsonFloat(m map[string]any, key string) float64 {
	v, ok := m[key]
	if !ok {
		return 0
	}
	f, ok := v.(float64)
	if !ok {
		return 0
	}
	return f
}

// jsonLabelNames extracts label name strings from the gh JSON "labels" array.
func jsonLabelNames(m map[string]any, key string) []string {
	v, ok := m[key]
	if !ok {
		return nil
	}
	arr, ok := v.([]any)
	if !ok {
		return nil
	}
	names := make([]string, 0, len(arr))
	for _, item := range arr {
		switch label := item.(type) {
		case map[string]any:
			if name, ok := label["name"].(string); ok {
				names = append(names, name)
			}
		case string:
			names = append(names, label)
		}
	}
	return names
}

// dedup removes duplicate strings while preserving order.
func dedup(items []string) []string {
	seen := make(map[string]bool, len(items))
	result := make([]string, 0, len(items))
	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}
