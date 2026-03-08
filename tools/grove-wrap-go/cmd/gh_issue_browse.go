package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/term"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
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

// issueBrowseModel is the Bubble Tea model for the interactive issue browser.
type issueBrowseModel struct {
	issues    []browseIssue
	filtered  []browseIssue // subset after filter
	cursor    int
	offset    int
	pageSize  int
	filter    string // active label filter
	filterBuf string // filter input buffer
	filtering bool   // in filter-input mode
	detail    *browseIssue
	width     int
	height    int
	err       error
	quitting  bool
	action    string // post-quit action: "worktree", "panther"
	actionNum int    // issue number for action
}

func newIssueBrowseModel(issues []browseIssue, pageSize int) issueBrowseModel {
	w, h, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		w, h = 80, 24
	}
	m := issueBrowseModel{
		issues:   issues,
		filtered: issues,
		pageSize: pageSize,
		width:    w,
		height:   h,
	}
	return m
}

func (m issueBrowseModel) Init() tea.Cmd {
	return nil
}

func (m issueBrowseModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
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
		switch msg.String() {
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
				issue := m.filtered[m.cursor]
				// Fetch full body
				ghArgs := []string{"issue", "view", fmt.Sprintf("%d", issue.Number)}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				ghArgs = append(ghArgs, "--json", "body")
				output, err := exec.GHOutput(ghArgs...)
				if err == nil {
					var data map[string]interface{}
					if json.Unmarshal([]byte(output), &data) == nil {
						if body, ok := data["body"].(string); ok {
							issue.Body = body
						}
					}
				}
				m.detail = &issue
			}

		case "o":
			if len(m.filtered) > 0 {
				issue := m.filtered[m.cursor]
				ghArgs := []string{"issue", "view", fmt.Sprintf("%d", issue.Number), "--web"}
				ghArgs = append(ghArgs, ghRepoArgs()...)
				exec.GH(ghArgs...)
			}

		case "p":
			if len(m.filtered) > 0 {
				m.action = "panther"
				m.actionNum = m.filtered[m.cursor].Number
				m.quitting = true
				return m, tea.Quit
			}

		case "w":
			if len(m.filtered) > 0 {
				m.action = "worktree"
				m.actionNum = m.filtered[m.cursor].Number
				m.quitting = true
				return m, tea.Quit
			}

		case "/":
			m.filtering = true
			m.filterBuf = m.filter

		case "esc":
			if m.filter != "" {
				m.filter = ""
				m.filterBuf = ""
				m.applyFilter()
			}
		}
	}
	return m, nil
}

func (m *issueBrowseModel) applyFilter() {
	if m.filter == "" {
		m.filtered = m.issues
	} else {
		lower := strings.ToLower(m.filter)
		var result []browseIssue
		for _, issue := range m.issues {
			for _, label := range issue.Labels {
				if strings.Contains(strings.ToLower(label), lower) {
					result = append(result, issue)
					break
				}
			}
		}
		m.filtered = result
	}
	m.cursor = 0
	m.offset = 0
}

// Styles
var (
	browseHeaderStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(ui.ForestGreen)

	browseSelectedStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#ffffff")).
		Background(ui.ForestGreen).
		Padding(0, 1)

	browseNormalStyle = lipgloss.NewStyle().
		Padding(0, 1)

	browseFilterStyle = lipgloss.NewStyle().
		Foreground(ui.SunsetAmber)

	browseLabelStyle = lipgloss.NewStyle().
		Foreground(ui.RiverCyan)

	browseHintStyle = lipgloss.NewStyle().
		Foreground(ui.DimGray)

	browseDetailStyle = lipgloss.NewStyle().
		Padding(1, 2)
)

func (m issueBrowseModel) View() string {
	if m.quitting {
		return ""
	}

	// Detail view
	if m.detail != nil {
		return m.renderDetail()
	}

	var b strings.Builder

	// Header
	title := browseHeaderStyle.Render("🌿 Issue Browser")
	count := browseHintStyle.Render(fmt.Sprintf("(%d issues)", len(m.filtered)))
	b.WriteString(title + " " + count + "\n")

	if m.filter != "" {
		b.WriteString(browseFilterStyle.Render(fmt.Sprintf("  filter: %s", m.filter)) + "\n")
	}
	if m.filtering {
		b.WriteString(browseFilterStyle.Render(fmt.Sprintf("  / %s▌", m.filterBuf)) + "\n")
	}
	b.WriteString("\n")

	// Issue list
	if len(m.filtered) == 0 {
		b.WriteString(browseHintStyle.Render("  No issues match filter\n"))
	} else {
		end := m.offset + m.pageSize
		if end > len(m.filtered) {
			end = len(m.filtered)
		}

		for i := m.offset; i < end; i++ {
			issue := m.filtered[i]
			num := fmt.Sprintf("#%-5d", issue.Number)
			title := TruncateStr(issue.Title, m.width-25)
			labels := ""
			if len(issue.Labels) > 0 {
				labels = " " + browseLabelStyle.Render("["+strings.Join(issue.Labels, ", ")+"]")
			}

			line := fmt.Sprintf("%s %s%s", num, title, labels)

			if i == m.cursor {
				b.WriteString(browseSelectedStyle.Render(line) + "\n")
			} else {
				b.WriteString(browseNormalStyle.Render(line) + "\n")
			}
		}
	}

	// Hints
	b.WriteString("\n")
	hints := []string{
		"j/k navigate", "v view", "o open", "w worktree", "p panther",
		"/ filter", "q quit",
	}
	b.WriteString(browseHintStyle.Render("  " + strings.Join(hints, " • ")))

	return b.String()
}

func (m issueBrowseModel) renderDetail() string {
	var b strings.Builder
	d := m.detail
	b.WriteString(browseHeaderStyle.Render(fmt.Sprintf("Issue #%d: %s", d.Number, d.Title)) + "\n\n")

	b.WriteString(fmt.Sprintf("  State:  %s\n", d.State))
	b.WriteString(fmt.Sprintf("  Author: %s\n", d.Author))
	if len(d.Labels) > 0 {
		b.WriteString(fmt.Sprintf("  Labels: %s\n", browseLabelStyle.Render(strings.Join(d.Labels, ", "))))
	}
	b.WriteString(fmt.Sprintf("  URL:    %s\n", d.URL))

	if d.Body != "" {
		b.WriteString("\n")
		// Wrap body to terminal width
		for _, line := range strings.Split(d.Body, "\n") {
			b.WriteString("  " + line + "\n")
		}
	}

	b.WriteString("\n")
	b.WriteString(browseHintStyle.Render("  q/esc back to list"))
	return browseDetailStyle.Render(b.String())
}

// runIssueBrowse launches the interactive issue browser.
func runIssueBrowse(issues []browseIssue, pageSize int) error {
	m := newIssueBrowseModel(issues, pageSize)
	p := tea.NewProgram(m, tea.WithAltScreen())
	finalModel, err := p.Run()
	if err != nil {
		return err
	}

	final := finalModel.(issueBrowseModel)

	// Handle post-quit actions
	switch final.action {
	case "panther":
		// Print structured context for panther-strike
		issue := findIssueByNumber(final.issues, final.actionNum)
		if issue != nil {
			fmt.Printf("🐾 Panther context for issue #%d\n\n", issue.Number)
			fmt.Printf("Title:  %s\n", issue.Title)
			fmt.Printf("State:  %s\n", issue.State)
			fmt.Printf("URL:    %s\n", issue.URL)
			if len(issue.Labels) > 0 {
				fmt.Printf("Labels: %s\n", strings.Join(issue.Labels, ", "))
			}
		}

	case "worktree":
		// Create worktree for issue
		num := fmt.Sprintf("%d", final.actionNum)
		wtCmd := gitWorktreeCreateCmd
		wtCmd.SetArgs([]string{num})
		return wtCmd.RunE(wtCmd, []string{num})
	}

	return nil
}

func findIssueByNumber(issues []browseIssue, number int) *browseIssue {
	for _, i := range issues {
		if i.Number == number {
			return &i
		}
	}
	return nil
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
