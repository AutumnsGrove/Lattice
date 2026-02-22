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

var issueCmd = &cobra.Command{
	Use:   "issue",
	Short: "Issue operations",
	Long:  "Issue operations with safety-tiered access.",
}

// --- issue list ---

var issueListCmd = &cobra.Command{
	Use:   "list",
	Short: "List issues",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		state, _ := cmd.Flags().GetString("state")
		author, _ := cmd.Flags().GetString("author")
		assignee, _ := cmd.Flags().GetString("assignee")
		label, _ := cmd.Flags().GetString("label")
		milestone, _ := cmd.Flags().GetString("milestone")
		limit, _ := cmd.Flags().GetInt("limit")

		ghArgs := []string{"issue", "list"}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--state", state, "--limit", fmt.Sprintf("%d", limit))
		ghArgs = append(ghArgs, "--json", "number,title,state,author,url,labels")

		if author != "" {
			ghArgs = append(ghArgs, "--author", author)
		}
		if assignee != "" {
			ghArgs = append(ghArgs, "--assignee", assignee)
		}
		if label != "" {
			ghArgs = append(ghArgs, "--label", label)
		}
		if milestone != "" {
			ghArgs = append(ghArgs, "--milestone", milestone)
		}

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			fmt.Println(output)
			return nil
		}

		var issues []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &issues); err != nil {
			return fmt.Errorf("failed to parse issues: %w", err)
		}

		if len(issues) == 0 {
			ui.Muted("No issues found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Issues (%s)", state))
		for _, issue := range issues {
			number := issue["number"]
			title := issue["title"]
			author := ""
			if a, ok := issue["author"].(map[string]interface{}); ok {
				author = fmt.Sprintf("%v", a["login"])
			}

			var labelNames []string
			if labels, ok := issue["labels"].([]interface{}); ok {
				for _, l := range labels {
					if m, ok := l.(map[string]interface{}); ok {
						labelNames = append(labelNames, fmt.Sprintf("%v", m["name"]))
					}
				}
			}
			labelStr := ""
			if len(labelNames) > 0 {
				labelStr = "  [" + strings.Join(labelNames, ", ") + "]"
			}

			ui.PrintKeyValue(
				fmt.Sprintf("#%-5v", number),
				fmt.Sprintf("%v  — %s%s", title, author, labelStr),
			)
		}
		return nil
	},
}

// --- issue view ---

var issueViewCmd = &cobra.Command{
	Use:   "view <number>",
	Short: "View issue details",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		number := args[0]
		showComments, _ := cmd.Flags().GetBool("comments")

		ghArgs := []string{"issue", "view", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--json",
			"number,title,state,author,url,body,labels,assignees,milestone")

		output, err := exec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}

		if cfg.JSONMode {
			if showComments {
				commentArgs := []string{"issue", "view", number}
				commentArgs = append(commentArgs, ghRepoArgs()...)
				commentArgs = append(commentArgs, "--json", "comments", "--jq", ".comments")
				commentOutput, _ := exec.GHOutput(commentArgs...)
				var issueData map[string]interface{}
				json.Unmarshal([]byte(output), &issueData)
				var comments interface{}
				json.Unmarshal([]byte(commentOutput), &comments)
				issueData["comments"] = comments
				merged, _ := json.MarshalIndent(issueData, "", "  ")
				fmt.Println(string(merged))
				return nil
			}
			fmt.Println(output)
			return nil
		}

		var issue map[string]interface{}
		if err := json.Unmarshal([]byte(output), &issue); err != nil {
			return fmt.Errorf("failed to parse issue: %w", err)
		}

		title := fmt.Sprintf("%v", issue["title"])
		state := fmt.Sprintf("%v", issue["state"])
		url := fmt.Sprintf("%v", issue["url"])
		author := ""
		if a, ok := issue["author"].(map[string]interface{}); ok {
			author = fmt.Sprintf("%v", a["login"])
		}

		ui.PrintHeader(fmt.Sprintf("Issue #%v", issue["number"]))
		fmt.Printf("  %s\n", title)
		fmt.Printf("  %s  Author: %s  %s\n", state, author, url)

		// Labels
		if labels, ok := issue["labels"].([]interface{}); ok && len(labels) > 0 {
			var names []string
			for _, l := range labels {
				if m, ok := l.(map[string]interface{}); ok {
					names = append(names, fmt.Sprintf("%v", m["name"]))
				}
			}
			fmt.Printf("\n  Labels: %s\n", strings.Join(names, ", "))
		}

		// Assignees
		if assignees, ok := issue["assignees"].([]interface{}); ok && len(assignees) > 0 {
			var names []string
			for _, a := range assignees {
				if m, ok := a.(map[string]interface{}); ok {
					names = append(names, fmt.Sprintf("%v", m["login"]))
				}
			}
			fmt.Printf("  Assignees: %s\n", strings.Join(names, ", "))
		}

		// Milestone
		if ms, ok := issue["milestone"].(map[string]interface{}); ok {
			fmt.Printf("  Milestone: %v\n", ms["title"])
		}

		// Body
		if body, ok := issue["body"].(string); ok && body != "" {
			fmt.Printf("\n  Description:\n  %s\n", body)
		}

		// Comments
		if showComments {
			commentArgs := []string{"issue", "view", number}
			commentArgs = append(commentArgs, ghRepoArgs()...)
			commentArgs = append(commentArgs, "--json", "comments", "--jq", ".comments")
			commentOutput, err := exec.GHOutput(commentArgs...)
			if err == nil {
				var comments []map[string]interface{}
				if json.Unmarshal([]byte(commentOutput), &comments) == nil && len(comments) > 0 {
					fmt.Printf("\n  Comments (%d):\n", len(comments))
					for _, c := range comments {
						cAuthor := ""
						if a, ok := c["author"].(map[string]interface{}); ok {
							cAuthor = fmt.Sprintf("%v", a["login"])
						}
						body, _ := c["body"].(string)
						createdAt, _ := c["createdAt"].(string)
						if len(createdAt) > 10 {
							createdAt = createdAt[:10]
						}
						fmt.Printf("    %s (%s):\n      %s\n\n", cAuthor, createdAt, body)
					}
				}
			}
		}

		return nil
	},
}

// --- issue create ---

var issueCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create an issue",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("issue_create"); err != nil {
			return err
		}

		cfg := config.Get()
		title, _ := cmd.Flags().GetString("title")
		body, _ := cmd.Flags().GetString("body")
		labels, _ := cmd.Flags().GetStringSlice("label")
		assignees, _ := cmd.Flags().GetStringSlice("assignee")
		milestone, _ := cmd.Flags().GetString("milestone")

		if title == "" {
			return fmt.Errorf("title required (use -t)")
		}

		ghArgs := []string{"issue", "create"}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--title", title)

		if body != "" {
			ghArgs = append(ghArgs, "--body", body)
		} else {
			ghArgs = append(ghArgs, "--body", "")
		}
		for _, l := range labels {
			ghArgs = append(ghArgs, "--label", l)
		}
		for _, a := range assignees {
			ghArgs = append(ghArgs, "--assignee", a)
		}
		if milestone != "" {
			ghArgs = append(ghArgs, "--milestone", milestone)
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
			ui.Success(fmt.Sprintf("Created issue: %s", title))
			ui.Muted(url)
		}
		return nil
	},
}

// --- issue comment ---

var issueCommentCmd = &cobra.Command{
	Use:   "comment <number>",
	Short: "Add a comment to an issue",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("issue_comment"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]
		body, _ := cmd.Flags().GetString("body")

		if body == "" {
			return fmt.Errorf("body required (use -b)")
		}

		ghArgs := []string{"issue", "comment", number, "--body", body}
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
			ui.Success(fmt.Sprintf("Commented on issue #%s", number))
		}
		return nil
	},
}

// --- issue close ---

var issueCloseCmd = &cobra.Command{
	Use:   "close <number>",
	Short: "Close an issue",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("issue_close"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]
		reason, _ := cmd.Flags().GetString("reason")
		comment, _ := cmd.Flags().GetString("comment")

		ghArgs := []string{"issue", "close", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		if reason != "" {
			ghArgs = append(ghArgs, "--reason", reason)
		}
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
			data, _ := json.Marshal(map[string]interface{}{
				"closed": number, "reason": reason,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Closed issue #%s (%s)", number, reason))
		}
		return nil
	},
}

// --- issue reopen ---

var issueReopenCmd = &cobra.Command{
	Use:   "reopen <number>",
	Short: "Reopen an issue",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("issue_reopen"); err != nil {
			return err
		}

		cfg := config.Get()
		number := args[0]

		ghArgs := []string{"issue", "reopen", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)

		result, err := exec.GH(ghArgs...)
		if err != nil {
			return fmt.Errorf("github error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("github error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{"reopened": number})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Reopened issue #%s", number))
		}
		return nil
	},
}

// --- issue comments ---

var issueCommentsCmd = &cobra.Command{
	Use:   "comments <number>",
	Short: "List all comments on an issue",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		number := args[0]

		ghArgs := []string{"issue", "view", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--json", "comments", "--jq", ".comments")

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

		ui.PrintHeader(fmt.Sprintf("Issue #%s Comments (%d)", number, len(comments)))
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
	ghCmd.AddCommand(issueCmd)

	// issue list
	issueListCmd.Flags().String("state", "open", "Filter by state (open, closed, all)")
	issueListCmd.Flags().String("author", "", "Filter by author")
	issueListCmd.Flags().String("assignee", "", "Filter by assignee")
	issueListCmd.Flags().String("label", "", "Filter by label")
	issueListCmd.Flags().String("milestone", "", "Filter by milestone")
	issueListCmd.Flags().Int("limit", 30, "Maximum number to return")
	issueCmd.AddCommand(issueListCmd)

	// issue view
	issueViewCmd.Flags().Bool("comments", false, "Show comments")
	issueCmd.AddCommand(issueViewCmd)

	// issue create
	issueCreateCmd.Flags().StringP("title", "t", "", "Issue title")
	issueCreateCmd.Flags().StringP("body", "b", "", "Issue body")
	issueCreateCmd.Flags().StringSlice("label", nil, "Labels to add")
	issueCreateCmd.Flags().StringSlice("assignee", nil, "Assignees")
	issueCreateCmd.Flags().String("milestone", "", "Milestone")
	issueCmd.AddCommand(issueCreateCmd)

	// issue comment
	issueCommentCmd.Flags().StringP("body", "b", "", "Comment body")
	issueCmd.AddCommand(issueCommentCmd)

	// issue close
	issueCloseCmd.Flags().String("reason", "completed", "Close reason (completed, not_planned)")
	issueCloseCmd.Flags().StringP("comment", "c", "", "Closing comment")
	issueCmd.AddCommand(issueCloseCmd)

	// issue reopen
	issueCmd.AddCommand(issueReopenCmd)

	// issue comments
	issueCmd.AddCommand(issueCommentsCmd)
}
