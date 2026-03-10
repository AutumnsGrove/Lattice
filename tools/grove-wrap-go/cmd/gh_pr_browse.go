package cmd

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"

	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// browsePR holds parsed PR data for the browser.
type browsePR struct {
	Number     int      `json:"number"`
	Title      string   `json:"title"`
	State      string   `json:"state"`
	Author     string   `json:"author"`
	URL        string   `json:"url"`
	Labels     []string `json:"labels"`
	Body       string   `json:"body"`
	IsDraft    bool     `json:"isDraft"`
	HeadBranch string   `json:"headRefName"`
	BaseBranch string   `json:"baseRefName"`
	Mergeable  string   `json:"mergeable"`
}

// prFetchArgs holds the parameters needed to re-fetch PRs in the TUI.
type prFetchArgs struct {
	state  string
	author string
	label  string
	limit  int
}

// buildPRFetchArgs captures the current filter flags for TUI re-fetching.
func buildPRFetchArgs(state, author, label string, limit int) prFetchArgs {
	return prFetchArgs{state: state, author: author, label: label, limit: limit}
}

// fetchMorePRs fetches the next page of PRs for the TUI browser.
func fetchMorePRs(args prFetchArgs, currentCount int) ([]browsePR, error) {
	nextPage := (currentCount / args.limit) + 1
	fetchLimit := args.limit * (nextPage + 1)
	if fetchLimit > maxGHLimit {
		fetchLimit = maxGHLimit
	}
	if fetchLimit <= currentCount {
		return nil, nil
	}

	ghArgs := []string{"pr", "list"}
	ghArgs = append(ghArgs, ghRepoArgs()...)
	ghArgs = append(ghArgs, "--state", args.state, "--limit", fmt.Sprintf("%d", fetchLimit))
	fields := []string{"number", "title", "state", "author", "url", "isDraft", "labels",
		"headRefName", "baseRefName"}
	ghArgs = append(ghArgs, jsonFields(fields, "")...)
	if args.author != "" {
		ghArgs = append(ghArgs, "--author", args.author)
	}
	if args.label != "" {
		ghArgs = append(ghArgs, "--label", args.label)
	}

	output, err := gwexec.GHOutput(ghArgs...)
	if err != nil {
		return nil, err
	}
	return parsePRsToBrowse(output)
}

// prStatus returns a display status string for a PR.
func (pr browsePR) prStatus() string {
	if pr.IsDraft {
		return "draft"
	}
	return strings.ToLower(pr.State)
}

// PR-specific status styles
var (
	prStatusOpen   = lipgloss.NewStyle().Foreground(ui.ForestGreen).Bold(true)
	prStatusDraft  = lipgloss.NewStyle().Foreground(ui.DimGray)
	prStatusMerged = lipgloss.NewStyle().Foreground(lipgloss.Color("#8b5cf6"))
	prStatusClosed = lipgloss.NewStyle().Foreground(lipgloss.Color("#ef4444"))
)

func renderPRStatus(status string) string {
	switch status {
	case "open":
		return prStatusOpen.Render("open")
	case "draft":
		return prStatusDraft.Render("draft")
	case "merged", "MERGED":
		return prStatusMerged.Render("merged")
	case "closed", "CLOSED":
		return prStatusClosed.Render("closed")
	default:
		return status
	}
}

// runPRBrowse launches the interactive PR browser using the shared framework.
func runPRBrowse(prs []browsePR, pageSize int, fetchArgs prFetchArgs) error {
	items := prsToItems(prs)
	allLoaded := len(prs) < fetchArgs.limit

	return RunBrowser(items, pageSize, browseConfig{
		Title:      "PR Browser",
		CountLabel: "pull requests",
		AllLoaded:  allLoaded,

		RenderRow: func(data any, width int) string {
			pr := data.(browsePR)
			num := fmt.Sprintf("#%-5d", pr.Number)
			status := renderPRStatus(pr.prStatus())
			title := TruncateStr(pr.Title, width-35)
			labels := ""
			if len(pr.Labels) > 0 {
				labels = " " + browseLabelStyle.Render("["+strings.Join(pr.Labels, ", ")+"]")
			}
			return fmt.Sprintf("%s %s %s%s", num, status, title, labels)
		},

		RenderDetail: func(data any) string {
			pr := data.(browsePR)
			var b strings.Builder
			b.WriteString(browseHeaderStyle.Render(fmt.Sprintf("PR #%d: %s", pr.Number, pr.Title)) + "\n\n")
			b.WriteString(fmt.Sprintf("  State:     %s\n", renderPRStatus(pr.prStatus())))
			b.WriteString(fmt.Sprintf("  Branch:    %s → %s\n", pr.HeadBranch, pr.BaseBranch))
			b.WriteString(fmt.Sprintf("  Author:    %s\n", pr.Author))
			if len(pr.Labels) > 0 {
				b.WriteString(fmt.Sprintf("  Labels:    %s\n", browseLabelStyle.Render(strings.Join(pr.Labels, ", "))))
			}
			if pr.Mergeable != "" {
				b.WriteString(fmt.Sprintf("  Mergeable: %s\n", pr.Mergeable))
			}
			b.WriteString(fmt.Sprintf("  URL:       %s\n", pr.URL))
			if pr.Body != "" {
				b.WriteString("\n")
				for _, line := range strings.Split(pr.Body, "\n") {
					b.WriteString("  " + line + "\n")
				}
			}
			return b.String()
		},

		FetchDetail: func(data any) any {
			pr := data.(browsePR)
			ghArgs := []string{"pr", "view", fmt.Sprintf("%d", pr.Number)}
			ghArgs = append(ghArgs, ghRepoArgs()...)
			ghArgs = append(ghArgs, "--json", "body,isDraft,mergeable,headRefName,baseRefName")
			output, err := gwexec.GHOutput(ghArgs...)
			if err == nil {
				var d map[string]interface{}
				if json.Unmarshal([]byte(output), &d) == nil {
					if body, ok := d["body"].(string); ok {
						pr.Body = body
					}
					if draft, ok := d["isDraft"].(bool); ok {
						pr.IsDraft = draft
					}
					if mergeable, ok := d["mergeable"].(string); ok {
						pr.Mergeable = mergeable
					}
					if head, ok := d["headRefName"].(string); ok {
						pr.HeadBranch = head
					}
					if base, ok := d["baseRefName"].(string); ok {
						pr.BaseBranch = base
					}
				}
			}
			return pr
		},

		Actions: []browseAction{
			{Key: "O", Hint: "O open", Inline: true, Handler: func(data any) error {
				pr := data.(browsePR)
				ghArgs := []string{"pr", "view", fmt.Sprintf("%d", pr.Number), "--web"}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				gwexec.GH(ghArgs...)
				return nil
			}},
			{Key: "C", Hint: "C checks", Handler: func(data any) error {
				pr := data.(browsePR)
				num := fmt.Sprintf("%d", pr.Number)
				checksCmd := prChecksCmd
				checksCmd.SetArgs([]string{num})
				return checksCmd.RunE(checksCmd, []string{num})
			}},
			{Key: "D", Hint: "D diff", Handler: func(data any) error {
				pr := data.(browsePR)
				num := fmt.Sprintf("%d", pr.Number)
				diffCmd := prDiffCmd
				diffCmd.Flags().Set("stat", "true")
				diffCmd.SetArgs([]string{num})
				return diffCmd.RunE(diffCmd, []string{num})
			}},
			{Key: "M", Hint: "M merge", Handler: func(data any) error {
				pr := data.(browsePR)
				num := fmt.Sprintf("%d", pr.Number)
				ui.Warning(fmt.Sprintf("Merging PR #%d requires --write flag", pr.Number))
				ui.Info("Run: gw gh pr merge " + num + " --write")
				return nil
			}},
		},

		FetchMore: func(currentCount int) ([]browseItem, error) {
			prs, err := fetchMorePRs(fetchArgs, currentCount)
			if err != nil {
				return nil, err
			}
			return prsToItems(prs), nil
		},

		OnSkill: func(skillName string, data any) error {
			pr := data.(browsePR)
			headBranch := pr.HeadBranch
			if headBranch == "" {
				headBranch = fetchPRHeadBranch(pr.Number)
			}
			return launchSkillForPR(skillName, pr.Number, headBranch)
		},
		OnBoardSkill: launchBoardSkill,
	})
}

// prsToItems converts domain PRs to generic browse items.
func prsToItems(prs []browsePR) []browseItem {
	items := make([]browseItem, len(prs))
	for i, pr := range prs {
		items[i] = browseItem{Labels: pr.Labels, Data: pr}
	}
	return items
}

// fetchPRHeadBranch fetches the head branch name for a PR.
func fetchPRHeadBranch(number int) string {
	ghArgs := []string{"pr", "view", fmt.Sprintf("%d", number)}
	ghArgs = append(ghArgs, ghRepoArgs()...)
	ghArgs = append(ghArgs, "--json", "headRefName", "--jq", ".headRefName")
	output, err := gwexec.GHOutput(ghArgs...)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(output)
}

// parsePRsToBrowse converts raw JSON PR data to browsePR structs.
func parsePRsToBrowse(raw string) ([]browsePR, error) {
	var prs []map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &prs); err != nil {
		return nil, err
	}

	result := make([]browsePR, 0, len(prs))
	for _, pr := range prs {
		bp := browsePR{
			Title: fmt.Sprintf("%v", pr["title"]),
			State: fmt.Sprintf("%v", pr["state"]),
			URL:   fmt.Sprintf("%v", pr["url"]),
		}
		if num, ok := pr["number"].(float64); ok {
			bp.Number = int(num)
		}
		if author, ok := pr["author"].(map[string]interface{}); ok {
			bp.Author = fmt.Sprintf("%v", author["login"])
		}
		if draft, ok := pr["isDraft"].(bool); ok {
			bp.IsDraft = draft
		}
		if head, ok := pr["headRefName"].(string); ok {
			bp.HeadBranch = head
		}
		if base, ok := pr["baseRefName"].(string); ok {
			bp.BaseBranch = base
		}
		if labels, ok := pr["labels"].([]interface{}); ok {
			for _, l := range labels {
				if m, ok := l.(map[string]interface{}); ok {
					bp.Labels = append(bp.Labels, fmt.Sprintf("%v", m["name"]))
				}
			}
		}
		result = append(result, bp)
	}
	return result, nil
}
