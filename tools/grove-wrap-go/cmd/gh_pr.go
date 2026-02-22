package cmd

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// requireGHSafety checks GitHub operation safety.
func requireGHSafety(operation string) error {
	cfg := config.Get()
	return safety.CheckGitHubSafety(
		operation, cfg.WriteFlag, cfg.AgentMode, cfg.IsInteractive(),
	)
}

// maxGHLimit is the maximum limit for list operations.
const maxGHLimit = 1000

// validateGHNumber validates a PR/issue number argument.
func validateGHNumber(s string) error {
	num, err := strconv.Atoi(s)
	if err != nil {
		return fmt.Errorf("invalid number: %q", s)
	}
	if num <= 0 {
		return fmt.Errorf("number must be positive, got %d", num)
	}
	return nil
}

// validateRunID validates a workflow run ID argument.
func validateRunID(s string) error {
	num, err := strconv.Atoi(s)
	if err != nil {
		return fmt.Errorf("invalid run ID: %q", s)
	}
	if num <= 0 {
		return fmt.Errorf("run ID must be positive, got %d", num)
	}
	return nil
}

// clampGHLimit clamps a list limit to [1, maxGHLimit].
func clampGHLimit(limit int) int {
	if limit < 1 {
		return 1
	}
	if limit > maxGHLimit {
		return maxGHLimit
	}
	return limit
}

// ghRepoArgs returns the --repo flag for gh CLI if configured.
func ghRepoArgs() []string {
	cfg := config.Get()
	if cfg.GitHub.Owner != "" && cfg.GitHub.Repo != "" {
		return []string{"--repo", cfg.GitHub.Owner + "/" + cfg.GitHub.Repo}
	}
	return nil
}

// jsonFields returns --json and --jq args for gh CLI commands.
func jsonFields(fields []string, jq string) []string {
	args := []string{"--json", strings.Join(fields, ",")}
	if jq != "" {
		args = append(args, "--jq", jq)
	}
	return args
}

var prCmd = &cobra.Command{
	Use:   "pr",
	Short: "Pull request operations",
	Long:  "Pull request operations with safety-tiered access.",
}

// --- pr list ---

var prListCmd = &cobra.Command{
	Use:   "list",
	Short: "List pull requests",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		state, _ := cmd.Flags().GetString("state")
		author, _ := cmd.Flags().GetString("author")
		label, _ := cmd.Flags().GetString("label")
		limit, _ := cmd.Flags().GetInt("limit")

		ghArgs := []string{"pr", "list"}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		limit = clampGHLimit(limit)
		ghArgs = append(ghArgs, "--state", state, "--limit", fmt.Sprintf("%d", limit))

		fields := []string{"number", "title", "state", "author", "url", "isDraft", "labels"}
		ghArgs = append(ghArgs, jsonFields(fields, "")...)

		if author != "" {
			ghArgs = append(ghArgs, "--author", author)
		}
		if label != "" {
			ghArgs = append(ghArgs, "--label", label)
		}

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			fmt.Println(output)
			return nil
		}

		var prs []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &prs); err != nil {
			return fmt.Errorf("failed to parse PR list: %w", err)
		}

		if len(prs) == 0 {
			ui.Muted("No pull requests found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Pull Requests (%s)", state))
		for _, pr := range prs {
			number := pr["number"]
			title := pr["title"]
			author := ""
			if a, ok := pr["author"].(map[string]interface{}); ok {
				author = fmt.Sprintf("%v", a["login"])
			}
			draft := ""
			if d, ok := pr["isDraft"].(bool); ok && d {
				draft = " (Draft)"
			}
			ui.PrintKeyValue(
				fmt.Sprintf("#%-5v", number),
				fmt.Sprintf("%v%s  — %s", title, draft, author),
			)
		}
		return nil
	},
}

// --- pr view ---

var prViewCmd = &cobra.Command{
	Use:   "view <number>",
	Short: "View pull request details",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		showComments, _ := cmd.Flags().GetBool("comments")

		ghArgs := []string{"pr", "view", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		fields := []string{"number", "title", "state", "author", "url", "body",
			"headRefName", "baseRefName", "labels", "isDraft", "mergeable"}
		ghArgs = append(ghArgs, jsonFields(fields, "")...)

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			if showComments {
				// Append comments to the JSON
				commentArgs := []string{"pr", "view", number}
				commentArgs = append(commentArgs, ghRepoArgs()...)
				commentArgs = append(commentArgs, "--json", "comments", "--jq", ".comments")
				commentOutput, _ := exec.GHOutput(commentArgs...)
				// Merge into output
				var prData map[string]interface{}
				json.Unmarshal([]byte(output), &prData)
				var comments interface{}
				json.Unmarshal([]byte(commentOutput), &comments)
				prData["comments"] = comments
				merged, _ := json.MarshalIndent(prData, "", "  ")
				fmt.Println(string(merged))
				return nil
			}
			fmt.Println(output)
			return nil
		}

		var pr map[string]interface{}
		if err := json.Unmarshal([]byte(output), &pr); err != nil {
			return fmt.Errorf("failed to parse PR: %w", err)
		}

		// Header
		title := fmt.Sprintf("%v", pr["title"])
		state := fmt.Sprintf("%v", pr["state"])
		head := fmt.Sprintf("%v", pr["headRefName"])
		base := fmt.Sprintf("%v", pr["baseRefName"])
		url := fmt.Sprintf("%v", pr["url"])
		author := ""
		if a, ok := pr["author"].(map[string]interface{}); ok {
			author = fmt.Sprintf("%v", a["login"])
		}

		draft := ""
		if d, ok := pr["isDraft"].(bool); ok && d {
			draft = " (Draft)"
		}

		ui.PrintHeader(fmt.Sprintf("PR #%v", pr["number"]))
		fmt.Printf("  %s%s\n", title, draft)
		fmt.Printf("  %s  %s → %s\n", state, head, base)
		fmt.Printf("  Author: %s  %s\n", author, url)

		// Labels
		if labels, ok := pr["labels"].([]interface{}); ok && len(labels) > 0 {
			var names []string
			for _, l := range labels {
				if m, ok := l.(map[string]interface{}); ok {
					names = append(names, fmt.Sprintf("%v", m["name"]))
				}
			}
			fmt.Printf("\n  Labels: %s\n", strings.Join(names, ", "))
		}

		// Body
		if body, ok := pr["body"].(string); ok && body != "" {
			fmt.Printf("\n  Description:\n  %s\n", body)
		}

		// Comments
		if showComments {
			commentArgs := []string{"pr", "view", number}
			commentArgs = append(commentArgs, ghRepoArgs()...)
			commentArgs = append(commentArgs, "--json", "comments", "--jq", ".comments")
			commentOutput, err := exec.GHOutput(commentArgs...)
			if err == nil {
				var comments []map[string]interface{}
				if json.Unmarshal([]byte(commentOutput), &comments) == nil && len(comments) > 0 {
					fmt.Printf("\n  Comments (%d):\n", len(comments))
					for _, c := range comments {
						author := ""
						if a, ok := c["author"].(map[string]interface{}); ok {
							author = fmt.Sprintf("%v", a["login"])
						}
						fmt.Printf("    %s: %v\n", author, c["body"])
					}
				}
			}
		}

		return nil
	},
}

// --- pr create ---

var prCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a pull request",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("pr_create"); err != nil {
			return err
		}

		cfg := config.Get()
		title, _ := cmd.Flags().GetString("title")
		body, _ := cmd.Flags().GetString("body")
		base, _ := cmd.Flags().GetString("base")
		head, _ := cmd.Flags().GetString("head")
		draft, _ := cmd.Flags().GetBool("draft")
		labels, _ := cmd.Flags().GetStringSlice("label")
		reviewers, _ := cmd.Flags().GetStringSlice("reviewer")

		if title == "" {
			return fmt.Errorf("title required (use -t)")
		}

		ghArgs := []string{"pr", "create"}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--title", title)

		if body != "" {
			ghArgs = append(ghArgs, "--body", body)
		} else {
			ghArgs = append(ghArgs, "--body", "")
		}
		if base != "" {
			ghArgs = append(ghArgs, "--base", base)
		}
		if head != "" {
			ghArgs = append(ghArgs, "--head", head)
		}
		if draft {
			ghArgs = append(ghArgs, "--draft")
		}
		for _, l := range labels {
			ghArgs = append(ghArgs, "--label", l)
		}
		for _, r := range reviewers {
			ghArgs = append(ghArgs, "--reviewer", r)
		}

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		url := strings.TrimSpace(result.Stdout)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]string{"url": url, "title": title})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Created PR: %s", title))
			ui.Muted(url)
		}
		return nil
	},
}

// --- pr comment ---

var prCommentCmd = &cobra.Command{
	Use:   "comment <number>",
	Short: "Add a comment to a pull request",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("pr_comment"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		body, _ := cmd.Flags().GetString("body")

		if body == "" {
			return fmt.Errorf("body required (use -b)")
		}

		ghArgs := []string{"pr", "comment", number, "--body", body}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{"commented": number})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Commented on PR #%s", number))
		}
		return nil
	},
}

// --- pr review ---

var prReviewCmd = &cobra.Command{
	Use:   "review <number>",
	Short: "Review a pull request",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("pr_review"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		approve, _ := cmd.Flags().GetBool("approve")
		requestChanges, _ := cmd.Flags().GetBool("request-changes")
		commentOnly, _ := cmd.Flags().GetBool("comment")
		body, _ := cmd.Flags().GetString("body")

		var action string
		switch {
		case approve:
			action = "--approve"
		case requestChanges:
			action = "--request-changes"
		case commentOnly:
			action = "--comment"
		default:
			return fmt.Errorf("specify --approve, --request-changes, or --comment")
		}

		ghArgs := []string{"pr", "review", number, action}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		if body != "" {
			ghArgs = append(ghArgs, "--body", body)
		}

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		actionStr := strings.TrimPrefix(action, "--")
		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"reviewed": number, "action": actionStr,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Reviewed PR #%s: %s", number, actionStr))
		}
		return nil
	},
}

// --- pr merge ---

var prMergeCmd = &cobra.Command{
	Use:   "merge <number>",
	Short: "Merge a pull request",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("pr_merge"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		squash, _ := cmd.Flags().GetBool("squash")
		rebase, _ := cmd.Flags().GetBool("rebase")
		auto, _ := cmd.Flags().GetBool("auto")
		deleteBranch, _ := cmd.Flags().GetBool("delete-branch")

		ghArgs := []string{"pr", "merge", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		switch {
		case squash:
			ghArgs = append(ghArgs, "--squash")
		case rebase:
			ghArgs = append(ghArgs, "--rebase")
		default:
			ghArgs = append(ghArgs, "--merge")
		}

		if auto {
			ghArgs = append(ghArgs, "--auto")
		}
		if deleteBranch {
			ghArgs = append(ghArgs, "--delete-branch")
		}

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		method := "merge"
		if squash {
			method = "squash"
		} else if rebase {
			method = "rebase"
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"merged": number, "method": method,
			})
			fmt.Println(string(data))
		} else {
			if auto {
				ui.Success(fmt.Sprintf("Auto-merge enabled for PR #%s", number))
			} else {
				ui.Success(fmt.Sprintf("Merged PR #%s (%s)", number, method))
			}
		}
		return nil
	},
}

// --- pr close ---

var prCloseCmd = &cobra.Command{
	Use:   "close <number>",
	Short: "Close a pull request without merging",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("pr_close"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		comment, _ := cmd.Flags().GetString("comment")

		ghArgs := []string{"pr", "close", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		if comment != "" {
			ghArgs = append(ghArgs, "--comment", comment)
		}

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{"closed": number})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Closed PR #%s", number))
		}
		return nil
	},
}

// --- pr checks ---

var prChecksCmd = &cobra.Command{
	Use:   "checks <number>",
	Short: "Show CI/CD check status for a pull request",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		watch, _ := cmd.Flags().GetBool("watch")

		if watch {
			ghArgs := []string{"pr", "checks", number, "--watch"}
			ghArgs = append(ghArgs, ghRepoArgs()...)
			result, err := exec.GH(ghArgs...)
			if err != nil {
				return fmt.Errorf("github error: %w", err)
			}
			fmt.Print(result.Stdout)
			return nil
		}

		ghArgs := []string{"pr", "checks", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--json", "name,state,conclusion,link")

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			fmt.Println(output)
			return nil
		}

		var checks []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &checks); err != nil {
			return fmt.Errorf("failed to parse checks: %w", err)
		}

		if len(checks) == 0 {
			ui.Muted("No checks found")
			return nil
		}

		// Summary counts
		var passed, failed, pending int
		for _, c := range checks {
			conclusion, _ := c["conclusion"].(string)
			state, _ := c["state"].(string)
			switch {
			case conclusion == "SUCCESS":
				passed++
			case conclusion == "FAILURE" || conclusion == "TIMED_OUT":
				failed++
			case state == "QUEUED" || state == "IN_PROGRESS" || state == "PENDING":
				pending++
			default:
				passed++ // neutral, skipped count as not-failed
			}
		}

		ui.PrintHeader(fmt.Sprintf("PR #%s Checks", number))
		if passed > 0 {
			fmt.Printf("  %d passed", passed)
		}
		if failed > 0 {
			fmt.Printf("  %d failed", failed)
		}
		if pending > 0 {
			fmt.Printf("  %d pending", pending)
		}
		fmt.Println()

		for _, c := range checks {
			name, _ := c["name"].(string)
			conclusion, _ := c["conclusion"].(string)
			state, _ := c["state"].(string)

			var icon string
			switch {
			case conclusion == "SUCCESS":
				icon = "✓"
			case conclusion == "FAILURE" || conclusion == "TIMED_OUT":
				icon = "✗"
			case state == "QUEUED" || state == "IN_PROGRESS" || state == "PENDING":
				icon = "●"
			case conclusion == "SKIPPED":
				icon = "○"
			default:
				icon = "?"
			}

			status := conclusion
			if status == "" {
				status = state
			}
			fmt.Printf("  %s %-40s %s\n", icon, name, status)
		}

		return nil
	},
}

// --- pr diff ---

var prDiffCmd = &cobra.Command{
	Use:   "diff <number>",
	Short: "View code changes in a pull request",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		stat, _ := cmd.Flags().GetBool("stat")
		nameOnly, _ := cmd.Flags().GetBool("name-only")

		ghArgs := []string{"pr", "diff", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		if stat {
			ghArgs = append(ghArgs, "--stat")
		}
		if nameOnly {
			ghArgs = append(ghArgs, "--name-only")
		}

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]string{"diff": output})
			fmt.Println(string(data))
		} else {
			fmt.Print(output)
		}
		return nil
	},
}

// --- pr comments ---

var prCommentsCmd = &cobra.Command{
	Use:   "comments <number>",
	Short: "List all comments on a pull request",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}
		reviewOnly, _ := cmd.Flags().GetBool("review-only")

		ghArgs := []string{"pr", "view", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		if reviewOnly {
			ghArgs = append(ghArgs, "--json", "reviewComments",
				"--jq", ".reviewComments")
		} else {
			ghArgs = append(ghArgs, "--json", "comments",
				"--jq", ".comments")
		}

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			fmt.Println(output)
			return nil
		}

		var comments []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &comments); err != nil {
			return fmt.Errorf("failed to parse comments: %w", err)
		}

		if len(comments) == 0 {
			ui.Muted("No comments found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("PR #%s Comments (%d)", number, len(comments)))
		for _, c := range comments {
			author := ""
			if a, ok := c["author"].(map[string]interface{}); ok {
				author = fmt.Sprintf("%v", a["login"])
			}
			body, _ := c["body"].(string)
			createdAt, _ := c["createdAt"].(string)
			if len(createdAt) > 10 {
				createdAt = createdAt[:10]
			}
			fmt.Printf("  %s (%s):\n    %s\n\n", author, createdAt, body)
		}
		return nil
	},
}

func init() {
	ghCmd.AddCommand(prCmd)

	// pr list
	prListCmd.Flags().String("state", "open", "Filter by state (open, closed, merged, all)")
	prListCmd.Flags().String("author", "", "Filter by author")
	prListCmd.Flags().String("label", "", "Filter by label")
	prListCmd.Flags().Int("limit", 30, "Maximum number to return")
	prCmd.AddCommand(prListCmd)

	// pr view
	prViewCmd.Flags().Bool("comments", false, "Show comments")
	prCmd.AddCommand(prViewCmd)

	// pr create
	prCreateCmd.Flags().StringP("title", "t", "", "PR title")
	prCreateCmd.Flags().StringP("body", "b", "", "PR body")
	prCreateCmd.Flags().String("base", "main", "Base branch")
	prCreateCmd.Flags().String("head", "", "Head branch (default: current)")
	prCreateCmd.Flags().Bool("draft", false, "Create as draft")
	prCreateCmd.Flags().StringSlice("label", nil, "Labels to add")
	prCreateCmd.Flags().StringSlice("reviewer", nil, "Reviewers to request")
	prCmd.AddCommand(prCreateCmd)

	// pr comment
	prCommentCmd.Flags().StringP("body", "b", "", "Comment body")
	prCmd.AddCommand(prCommentCmd)

	// pr review
	prReviewCmd.Flags().Bool("approve", false, "Approve the PR")
	prReviewCmd.Flags().Bool("request-changes", false, "Request changes")
	prReviewCmd.Flags().Bool("comment", false, "Comment without approval")
	prReviewCmd.Flags().StringP("body", "b", "", "Review body")
	prCmd.AddCommand(prReviewCmd)

	// pr merge
	prMergeCmd.Flags().Bool("squash", false, "Squash commits")
	prMergeCmd.Flags().Bool("rebase", false, "Rebase commits")
	prMergeCmd.Flags().Bool("auto", false, "Enable auto-merge when checks pass")
	prMergeCmd.Flags().Bool("delete-branch", false, "Delete branch after merge")
	prCmd.AddCommand(prMergeCmd)

	// pr close
	prCloseCmd.Flags().StringP("comment", "c", "", "Closing comment")
	prCmd.AddCommand(prCloseCmd)

	// pr checks
	prChecksCmd.Flags().Bool("watch", false, "Watch until all checks complete")
	prCmd.AddCommand(prChecksCmd)

	// pr diff
	prDiffCmd.Flags().Bool("stat", false, "Show diffstat only")
	prDiffCmd.Flags().Bool("name-only", false, "Show changed file names only")
	prCmd.AddCommand(prDiffCmd)

	// pr comments
	prCommentsCmd.Flags().Bool("review-only", false, "Show only review comments")
	prCmd.AddCommand(prCommentsCmd)
}
