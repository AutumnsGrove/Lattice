package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/term"

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

// prStatus returns a display status string for a PR.
func (pr browsePR) prStatus() string {
	if pr.IsDraft {
		return "draft"
	}
	return strings.ToLower(pr.State)
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

// prsFetchedMsg carries the result of an async "load more" PR fetch.
type prsFetchedMsg struct {
	prs []browsePR
	err error
}

// prBrowseModel is the Bubble Tea model for the interactive PR browser.
type prBrowseModel struct {
	prs         []browsePR
	filtered    []browsePR // subset after filter
	cursor      int
	offset      int
	pageSize    int
	filter      string // active label filter
	filterBuf   string // filter input buffer
	filtering   bool   // in filter-input mode
	detail      *browsePR
	showHelp    bool // help overlay visible
	width       int
	height      int
	err         error
	quitting    bool
	action      string // post-quit action: "skill", "merge", "checks", "diff"
	actionSkill string // skill name for "skill" action
	actionPR    *browsePR
	fetchArgs   *prFetchArgs // args for loading more PRs
	loading     bool         // true while fetching next page
	allLoaded   bool         // true when no more pages available
}

func newPRBrowseModel(prs []browsePR, pageSize int, fetchArgs *prFetchArgs) prBrowseModel {
	w, h, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		w, h = 80, 24
	}
	allLoaded := fetchArgs == nil || len(prs) < fetchArgs.limit
	m := prBrowseModel{
		prs:       prs,
		filtered:  prs,
		pageSize:  pageSize,
		width:     w,
		height:    h,
		fetchArgs: fetchArgs,
		allLoaded: allLoaded,
	}
	return m
}

func (m prBrowseModel) Init() tea.Cmd {
	return nil
}

func (m prBrowseModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case prsFetchedMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		if len(msg.prs) <= len(m.prs) {
			m.allLoaded = true
			return m, nil
		}
		m.prs = msg.prs
		m.applyFilter()
		return m, nil

	case tea.KeyMsg:
		// Help overlay — any key dismisses
		if m.showHelp {
			m.showHelp = false
			return m, nil
		}

		// Detail view mode
		if m.detail != nil {
			switch msg.String() {
			case "q", "esc":
				m.detail = nil
			}
			return m, nil
		}

		// Filter input mode
		if m.filtering {
			switch msg.String() {
			case "enter":
				m.filter = m.filterBuf
				m.applyFilter()
				m.filtering = false
			case "esc":
				m.filterBuf = ""
				m.filtering = false
			case "backspace":
				if len(m.filterBuf) > 0 {
					m.filterBuf = m.filterBuf[:len(m.filterBuf)-1]
				}
			default:
				if len(msg.String()) == 1 {
					m.filterBuf += msg.String()
				}
			}
			return m, nil
		}

		// Normal list mode
		key := msg.String()

		switch key {
		case "q", "ctrl+c":
			m.quitting = true
			return m, tea.Quit

		case "j", "down":
			if m.cursor < len(m.filtered)-1 {
				m.cursor++
				if m.cursor >= m.offset+m.pageSize {
					m.offset++
				}
			}

		case "k", "up":
			if m.cursor > 0 {
				m.cursor--
				if m.cursor < m.offset {
					m.offset = m.cursor
				}
			}

		case "pgdown":
			m.cursor += m.pageSize
			if m.cursor >= len(m.filtered) {
				m.cursor = len(m.filtered) - 1
			}
			m.offset = m.cursor - m.pageSize + 1
			if m.offset < 0 {
				m.offset = 0
			}

		case "pgup":
			m.cursor -= m.pageSize
			if m.cursor < 0 {
				m.cursor = 0
			}
			m.offset = m.cursor

		case "v":
			if len(m.filtered) > 0 {
				pr := m.filtered[m.cursor]
				// Fetch full details
				ghArgs := []string{"pr", "view", fmt.Sprintf("%d", pr.Number)}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				ghArgs = append(ghArgs, "--json", "body,isDraft,mergeable,headRefName,baseRefName")
				output, err := gwexec.GHOutput(ghArgs...)
				if err == nil {
					var data map[string]interface{}
					if json.Unmarshal([]byte(output), &data) == nil {
						if body, ok := data["body"].(string); ok {
							pr.Body = body
						}
						if draft, ok := data["isDraft"].(bool); ok {
							pr.IsDraft = draft
						}
						if mergeable, ok := data["mergeable"].(string); ok {
							pr.Mergeable = mergeable
						}
						if head, ok := data["headRefName"].(string); ok {
							pr.HeadBranch = head
						}
						if base, ok := data["baseRefName"].(string); ok {
							pr.BaseBranch = base
						}
					}
				}
				m.detail = &pr
			}

		case "O": // Open in browser (shift+o)
			if len(m.filtered) > 0 {
				pr := m.filtered[m.cursor]
				ghArgs := []string{"pr", "view", fmt.Sprintf("%d", pr.Number), "--web"}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				gwexec.GH(ghArgs...)
			}

		case "C": // View checks
			if len(m.filtered) > 0 {
				pr := m.filtered[m.cursor]
				m.action = "checks"
				m.actionPR = &pr
				m.quitting = true
				return m, tea.Quit
			}

		case "D": // View diff stat
			if len(m.filtered) > 0 {
				pr := m.filtered[m.cursor]
				m.action = "diff"
				m.actionPR = &pr
				m.quitting = true
				return m, tea.Quit
			}

		case "M": // Merge (with --write safety)
			if len(m.filtered) > 0 {
				pr := m.filtered[m.cursor]
				m.action = "merge"
				m.actionPR = &pr
				m.quitting = true
				return m, tea.Quit
			}

		case "N": // Load more PRs (shift+n)
			if !m.loading && !m.allLoaded && m.fetchArgs != nil {
				m.loading = true
				args := *m.fetchArgs
				count := len(m.prs)
				return m, func() tea.Msg {
					prs, err := fetchMorePRs(args, count)
					return prsFetchedMsg{prs: prs, err: err}
				}
			}

		case "/":
			m.filtering = true
			m.filterBuf = m.filter

		case "?":
			m.showHelp = true

		case "esc":
			if m.filter != "" {
				m.filter = ""
				m.filterBuf = ""
				m.applyFilter()
			}

		default:
			// Check skill hotkeys
			if skill, ok := skillByKey[key]; ok {
				if len(m.filtered) > 0 {
					pr := m.filtered[m.cursor]
					m.action = "skill"
					m.actionSkill = skill.Name
					m.actionPR = &pr
					m.quitting = true
					return m, tea.Quit
				}
			}
		}
	}
	return m, nil
}

func (m *prBrowseModel) applyFilter() {
	if m.filter == "" {
		m.filtered = m.prs
	} else {
		lower := strings.ToLower(m.filter)
		var result []browsePR
		for _, pr := range m.prs {
			for _, label := range pr.Labels {
				if strings.Contains(strings.ToLower(label), lower) {
					result = append(result, pr)
					break
				}
			}
		}
		m.filtered = result
	}
	m.cursor = 0
	m.offset = 0
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

func (m prBrowseModel) View() string {
	if m.quitting {
		return ""
	}

	// Help overlay
	if m.showHelp {
		return m.renderHelp()
	}

	// Detail view
	if m.detail != nil {
		return m.renderDetail()
	}

	var b strings.Builder

	// Header
	title := browseHeaderStyle.Render("🌿 PR Browser")
	count := browseHintStyle.Render(fmt.Sprintf("(%d pull requests)", len(m.filtered)))
	b.WriteString(title + " " + count + "\n")

	if m.filter != "" {
		b.WriteString(browseFilterStyle.Render(fmt.Sprintf("  filter: %s", m.filter)) + "\n")
	}
	if m.filtering {
		b.WriteString(browseFilterStyle.Render(fmt.Sprintf("  / %s▌", m.filterBuf)) + "\n")
	}
	b.WriteString("\n")

	// PR list
	if len(m.filtered) == 0 {
		b.WriteString(browseHintStyle.Render("  No PRs match filter\n"))
	} else {
		end := m.offset + m.pageSize
		if end > len(m.filtered) {
			end = len(m.filtered)
		}

		for i := m.offset; i < end; i++ {
			pr := m.filtered[i]
			num := fmt.Sprintf("#%-5d", pr.Number)
			status := renderPRStatus(pr.prStatus())
			title := TruncateStr(pr.Title, m.width-35)
			labels := ""
			if len(pr.Labels) > 0 {
				labels = " " + browseLabelStyle.Render("["+strings.Join(pr.Labels, ", ")+"]")
			}

			line := fmt.Sprintf("%s %s %s%s", num, status, title, labels)

			if i == m.cursor {
				b.WriteString(browseSelectedStyle.Render(line) + "\n")
			} else {
				b.WriteString(browseNormalStyle.Render(line) + "\n")
			}
		}
	}

	// Loading indicator
	if m.loading {
		b.WriteString(browseFilterStyle.Render("  Loading more PRs...") + "\n")
	}

	// Footer hints
	b.WriteString("\n")
	hints := []string{
		"j/k nav", "v view", "O open", "C checks", "D diff", "M merge",
		"/ filter", "? skills", "q quit",
	}
	if !m.allLoaded && m.fetchArgs != nil {
		hints = append(hints[:8], append([]string{"N more"}, hints[8:]...)...)
	}
	b.WriteString(browseHintStyle.Render("  " + strings.Join(hints, " • ")))

	// Label-based skill suggestion
	if len(m.filtered) > 0 {
		pr := m.filtered[m.cursor]
		suggestions := suggestSkills(pr.Labels)
		if len(suggestions) > 0 {
			var parts []string
			for _, s := range suggestions {
				if entry, ok := skillByName[s]; ok {
					parts = append(parts, fmt.Sprintf("[%s] %s", entry.Key, entry.Name))
				}
				if len(parts) >= 2 {
					break
				}
			}
			b.WriteString("\n")
			b.WriteString(browseSuggestStyle.Render("  suggested: " + strings.Join(parts, " or ")))
		}
	}

	return b.String()
}

func (m prBrowseModel) renderHelp() string {
	var b strings.Builder
	b.WriteString(browseHeaderStyle.Render("🌿 PR Browser — Hotkey Reference") + "\n\n")

	// Browser controls
	b.WriteString(browseHelpCatStyle.Render("  Browser") + "\n")
	b.WriteString(fmt.Sprintf("    %s  Navigate           %s  View detail\n",
		browseHelpKeyStyle.Render("j/k"), browseHelpKeyStyle.Render("v")))
	b.WriteString(fmt.Sprintf("    %s    Open in browser    %s  View checks\n",
		browseHelpKeyStyle.Render("O"), browseHelpKeyStyle.Render("C")))
	b.WriteString(fmt.Sprintf("    %s    View diff stat     %s  Merge PR\n",
		browseHelpKeyStyle.Render("D"), browseHelpKeyStyle.Render("M")))
	b.WriteString(fmt.Sprintf("    %s    Filter by label    %s  Load more PRs\n",
		browseHelpKeyStyle.Render("/"), browseHelpKeyStyle.Render("N")))
	b.WriteString(fmt.Sprintf("    %s    Quit\n",
		browseHelpKeyStyle.Render("q")))
	b.WriteString("\n")

	// Skills by category
	for _, cat := range skillCategories {
		b.WriteString(browseHelpCatStyle.Render("  "+cat) + "\n")
		for i := range skillRegistry {
			skill := &skillRegistry[i]
			if skill.Category == cat {
				keyDisplay := skill.Key
				if len(keyDisplay) == 1 && keyDisplay[0] >= 'A' && keyDisplay[0] <= 'Z' {
					keyDisplay = "⇧" + strings.ToLower(keyDisplay)
				}
				b.WriteString(fmt.Sprintf("    %s  %-24s %s\n",
					browseHelpKeyStyle.Render(fmt.Sprintf("%-3s", keyDisplay)),
					skill.Name,
					browseHintStyle.Render(skill.Purpose)))
			}
		}
	}

	b.WriteString("\n")
	b.WriteString(browseHintStyle.Render("  Press any key to return"))
	return b.String()
}

func (m prBrowseModel) renderDetail() string {
	var b strings.Builder
	d := m.detail
	b.WriteString(browseHeaderStyle.Render(fmt.Sprintf("PR #%d: %s", d.Number, d.Title)) + "\n\n")

	b.WriteString(fmt.Sprintf("  State:     %s\n", renderPRStatus(d.prStatus())))
	b.WriteString(fmt.Sprintf("  Branch:    %s → %s\n", d.HeadBranch, d.BaseBranch))
	b.WriteString(fmt.Sprintf("  Author:    %s\n", d.Author))
	if len(d.Labels) > 0 {
		b.WriteString(fmt.Sprintf("  Labels:    %s\n", browseLabelStyle.Render(strings.Join(d.Labels, ", "))))
	}
	if d.Mergeable != "" {
		b.WriteString(fmt.Sprintf("  Mergeable: %s\n", d.Mergeable))
	}
	b.WriteString(fmt.Sprintf("  URL:       %s\n", d.URL))

	if d.Body != "" {
		b.WriteString("\n")
		for _, line := range strings.Split(d.Body, "\n") {
			b.WriteString("  " + line + "\n")
		}
	}

	b.WriteString("\n")
	b.WriteString(browseHintStyle.Render("  q/esc back to list"))
	return browseDetailStyle.Render(b.String())
}

// runPRBrowse launches the interactive PR browser.
func runPRBrowse(prs []browsePR, pageSize int, fetchArgs prFetchArgs) error {
	m := newPRBrowseModel(prs, pageSize, &fetchArgs)
	p := tea.NewProgram(m, tea.WithAltScreen())
	finalModel, err := p.Run()
	if err != nil {
		return err
	}

	final := finalModel.(prBrowseModel)

	// Handle post-quit actions
	switch final.action {
	case "skill":
		pr := final.actionPR
		// Need head branch — fetch if not already populated
		headBranch := pr.HeadBranch
		if headBranch == "" {
			headBranch = fetchPRHeadBranch(pr.Number)
		}
		return launchSkillForPR(final.actionSkill, pr.Number, headBranch)

	case "checks":
		pr := final.actionPR
		checksCmd := prChecksCmd
		checksCmd.SetArgs([]string{fmt.Sprintf("%d", pr.Number)})
		return checksCmd.RunE(checksCmd, []string{fmt.Sprintf("%d", pr.Number)})

	case "diff":
		pr := final.actionPR
		diffCmd := prDiffCmd
		// Show stat view for quick overview
		diffCmd.Flags().Set("stat", "true")
		num := fmt.Sprintf("%d", pr.Number)
		diffCmd.SetArgs([]string{num})
		return diffCmd.RunE(diffCmd, []string{num})

	case "merge":
		pr := final.actionPR
		num := fmt.Sprintf("%d", pr.Number)
		ui.Warning(fmt.Sprintf("Merging PR #%d requires --write flag", pr.Number))
		ui.Info("Run: gw gh pr merge " + num + " --write")
	}

	return nil
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
