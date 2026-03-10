package cmd

import (
	"encoding/json"
	"fmt"
	"strings"

	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
)

// browseIssue holds parsed issue data for the browser.
type browseIssue struct {
	Number int      `json:"number"`
	Title  string   `json:"title"`
	State  string   `json:"state"`
	Author string   `json:"author"`
	URL    string   `json:"url"`
	Labels []string `json:"labels"`
	Body   string   `json:"body"`
}

// runIssueBrowse launches the interactive issue browser using the shared framework.
func runIssueBrowse(issues []browseIssue, pageSize int, fetchArgs issueFetchArgs) error {
	items := issuesToBrowseItems(issues)
	allLoaded := len(issues) < fetchArgs.limit

	return RunBrowser(items, pageSize, browseConfig{
		Title:      "Issue Browser",
		CountLabel: "issues",
		AllLoaded:  allLoaded,

		RenderRow: func(data any, width int) string {
			issue := data.(browseIssue)
			num := fmt.Sprintf("#%-5d", issue.Number)
			title := TruncateStr(issue.Title, width-25)
			labels := ""
			if len(issue.Labels) > 0 {
				labels = " " + browseLabelStyle.Render("["+strings.Join(issue.Labels, ", ")+"]")
			}
			return fmt.Sprintf("%s %s%s", num, title, labels)
		},

		RenderDetail: func(data any) string {
			issue := data.(browseIssue)
			var b strings.Builder
			b.WriteString(browseHeaderStyle.Render(fmt.Sprintf("Issue #%d: %s", issue.Number, issue.Title)) + "\n\n")
			b.WriteString(fmt.Sprintf("  State:  %s\n", issue.State))
			b.WriteString(fmt.Sprintf("  Author: %s\n", issue.Author))
			if len(issue.Labels) > 0 {
				b.WriteString(fmt.Sprintf("  Labels: %s\n", browseLabelStyle.Render(strings.Join(issue.Labels, ", "))))
			}
			b.WriteString(fmt.Sprintf("  URL:    %s\n", issue.URL))
			if issue.Body != "" {
				b.WriteString("\n")
				for _, line := range strings.Split(issue.Body, "\n") {
					b.WriteString("  " + line + "\n")
				}
			}
			return b.String()
		},

		FetchDetail: func(data any) any {
			issue := data.(browseIssue)
			ghArgs := []string{"issue", "view", fmt.Sprintf("%d", issue.Number)}
			ghArgs = append(ghArgs, ghRepoArgs()...)
			ghArgs = append(ghArgs, "--json", "body")
			output, err := gwexec.GHOutput(ghArgs...)
			if err == nil {
				var d map[string]interface{}
				if json.Unmarshal([]byte(output), &d) == nil {
					if body, ok := d["body"].(string); ok {
						issue.Body = body
					}
				}
			}
			return issue
		},

		Actions: []browseAction{
			{Key: "O", Hint: "O open", Inline: true, Handler: func(data any) error {
				issue := data.(browseIssue)
				ghArgs := []string{"issue", "view", fmt.Sprintf("%d", issue.Number), "--web"}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				gwexec.GH(ghArgs...)
				return nil
			}},
			{Key: "W", Hint: "W tree", Handler: func(data any) error {
				issue := data.(browseIssue)
				num := fmt.Sprintf("%d", issue.Number)
				wtCmd := gitWorktreeCreateCmd
				wtCmd.SetArgs([]string{num})
				return wtCmd.RunE(wtCmd, []string{num})
			}},
		},

		FetchMore: func(currentCount int) ([]browseItem, error) {
			issues, err := fetchMoreIssues(fetchArgs, currentCount)
			if err != nil {
				return nil, err
			}
			return issuesToBrowseItems(issues), nil
		},

		OnSkill: func(skillName string, data any) error {
			issue := data.(browseIssue)
			return launchSkillForIssue(skillName, fmt.Sprintf("%d", issue.Number))
		},
		OnBoardSkill: launchBoardSkill,
	})
}

// issuesToBrowseItems converts domain issues to generic browse items.
func issuesToBrowseItems(issues []browseIssue) []browseItem {
	items := make([]browseItem, len(issues))
	for i, issue := range issues {
		items[i] = browseItem{Labels: issue.Labels, Data: issue}
	}
	return items
}

// parseIssuesToBrowse converts raw JSON issue data to browseIssue structs.
func parseIssuesToBrowse(raw string) ([]browseIssue, error) {
	var issues []map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &issues); err != nil {
		return nil, err
	}

	result := make([]browseIssue, 0, len(issues))
	for _, issue := range issues {
		bi := browseIssue{
			Title: fmt.Sprintf("%v", issue["title"]),
			State: fmt.Sprintf("%v", issue["state"]),
			URL:   fmt.Sprintf("%v", issue["url"]),
		}
		if num, ok := issue["number"].(float64); ok {
			bi.Number = int(num)
		}
		if author, ok := issue["author"].(map[string]interface{}); ok {
			bi.Author = fmt.Sprintf("%v", author["login"])
		}
		if labels, ok := issue["labels"].([]interface{}); ok {
			for _, l := range labels {
				if m, ok := l.(map[string]interface{}); ok {
					bi.Labels = append(bi.Labels, fmt.Sprintf("%v", m["name"]))
				}
			}
		}
		result = append(result, bi)
	}
	return result, nil
}
