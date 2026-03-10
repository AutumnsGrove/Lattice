// Package asktui provides an interactive Bubble Tea TUI for gf ask -i.
// It shows a spinner during search, live tool-call status, and a scrollable
// answer viewport with post-answer actions.
package asktui

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/nlp"
)

// ---------- Styles ----------

var (
	colorForest = lipgloss.Color("#2d5a27")
	colorMoss   = lipgloss.Color("#4a7c59")
	colorAmber  = lipgloss.Color("#e8a838")
	colorDim    = lipgloss.Color("#666666")
	colorRed    = lipgloss.Color("#ff4444")

	titleStyle   = lipgloss.NewStyle().Bold(true).Foreground(colorForest)
	toolStyle    = lipgloss.NewStyle().Foreground(colorMoss)
	resultStyle  = lipgloss.NewStyle().Foreground(colorDim)
	fileStyle    = lipgloss.NewStyle().Foreground(colorAmber)
	errorStyle   = lipgloss.NewStyle().Foreground(colorRed)
	dimStyle     = lipgloss.NewStyle().Foreground(colorDim)
	successStyle = lipgloss.NewStyle().Bold(true).Foreground(colorForest)
	footerStyle  = lipgloss.NewStyle().Foreground(colorDim)
)

// ---------- State ----------

type state int

const (
	stateConnecting state = iota
	stateSearching
	stateAnswer
	stateGiveUp
	stateFailed
)

// ---------- Messages ----------

type connectResultMsg struct {
	client *nlp.Client
	err    error
}

type agentStatusMsg struct {
	round    int
	maxRound int
	status   string
}

type agentResultMsg struct {
	result *nlp.AgentResult
	err    error
}

// ---------- Model ----------

// Options configures the TUI.
type Options struct {
	Query       string
	Autostart   bool
	MaxRounds   int
}

type model struct {
	opts Options

	state    state
	spinner  spinner.Model
	viewport viewport.Model

	client     *nlp.Client
	result     *nlp.AgentResult
	err        error
	toolLog    []string // live tool call display
	statusText string

	width  int
	height int
	ready  bool
}

// Run launches the interactive TUI.
func Run(opts Options) error {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(colorMoss)

	m := model{
		opts:    opts,
		state:   stateConnecting,
		spinner: s,
	}

	p := tea.NewProgram(m, tea.WithAltScreen())
	_, err := p.Run()
	return err
}

func (m model) Init() tea.Cmd {
	return tea.Batch(
		m.spinner.Tick,
		m.connectCmd(),
	)
}

// ---------- Commands ----------

func (m model) connectCmd() tea.Cmd {
	return func() tea.Msg {
		client, err := nlp.EnsureServer(context.Background(), m.opts.Autostart, nil)
		return connectResultMsg{client: client, err: err}
	}
}

func (m model) searchCmd() tea.Cmd {
	client := m.client
	query := m.opts.Query
	maxRounds := m.opts.MaxRounds

	return func() tea.Msg {
		// We can't send intermediate messages from inside RunAgent easily,
		// so we run it synchronously and return the final result.
		// For live status, we'd need a channel-based approach (future enhancement).
		result, err := nlp.RunAgent(context.Background(), client, query, nlp.AgentOptions{
			MaxRounds: maxRounds,
		})
		return agentResultMsg{result: result, err: err}
	}
}

// ---------- Update ----------

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		return m.handleKey(msg)

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		if m.ready {
			m.viewport.Width = msg.Width
			m.viewport.Height = msg.Height - 4
		}
		return m, nil

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd

	case connectResultMsg:
		if msg.err != nil {
			m.state = stateFailed
			m.err = msg.err
			return m, nil
		}
		m.client = msg.client
		m.state = stateSearching
		m.statusText = "Thinking..."
		return m, m.searchCmd()

	case agentResultMsg:
		if msg.err != nil {
			m.state = stateFailed
			m.err = msg.err
			return m, nil
		}
		m.result = msg.result

		if msg.result.GaveUp {
			m.state = stateGiveUp
		} else {
			m.state = stateAnswer
		}

		// Build viewport content
		content := m.buildAnswerContent()
		m.viewport = viewport.New(m.width, m.height-4)
		m.viewport.SetContent(content)
		m.ready = true
		return m, nil
	}

	// Forward to viewport if in answer state
	if m.state == stateAnswer || m.state == stateGiveUp {
		var cmd tea.Cmd
		m.viewport, cmd = m.viewport.Update(msg)
		cmds = append(cmds, cmd)
	}

	return m, tea.Batch(cmds...)
}

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "esc", "ctrl+c":
		return m, tea.Quit

	case "r":
		if m.state == stateFailed || m.state == stateGiveUp || m.state == stateAnswer {
			// Retry with same query
			m.state = stateSearching
			m.statusText = "Retrying..."
			m.result = nil
			m.toolLog = nil
			m.ready = false
			return m, tea.Batch(m.spinner.Tick, m.searchCmd())
		}
	}

	// Forward to viewport
	if m.state == stateAnswer || m.state == stateGiveUp {
		var cmd tea.Cmd
		m.viewport, cmd = m.viewport.Update(msg)
		return m, cmd
	}

	return m, nil
}

// ---------- View ----------

func (m model) View() string {
	switch m.state {
	case stateConnecting:
		return m.viewConnecting()
	case stateSearching:
		return m.viewSearching()
	case stateAnswer:
		return m.viewAnswer()
	case stateGiveUp:
		return m.viewGiveUp()
	case stateFailed:
		return m.viewFailed()
	}
	return ""
}

func (m model) viewConnecting() string {
	return fmt.Sprintf("\n  %s Connecting to LM Studio...\n", m.spinner.View())
}

func (m model) viewSearching() string {
	var b strings.Builder
	b.WriteString("\n")
	b.WriteString(titleStyle.Render(fmt.Sprintf("  Searching: %q", m.opts.Query)))
	b.WriteString("\n\n")

	// Show tool log
	for _, entry := range m.toolLog {
		b.WriteString(toolStyle.Render("  ▸ "))
		b.WriteString(entry)
		b.WriteString("\n")
	}

	b.WriteString(fmt.Sprintf("  %s %s\n", m.spinner.View(), m.statusText))
	return b.String()
}

func (m model) viewAnswer() string {
	var b strings.Builder
	b.WriteString(titleStyle.Render(fmt.Sprintf("  Searching: %q", m.opts.Query)))
	b.WriteString("\n")

	// Tool call summary
	if m.result != nil && len(m.result.ToolCalls) > 0 {
		for _, tc := range m.result.ToolCalls {
			icon := toolStyle.Render("  ▸ ")
			detail := dimStyle.Render(fmt.Sprintf("%s → %d results", tc.Tool, tc.ResultCount))
			b.WriteString(icon + detail + "\n")
		}
		b.WriteString("\n")
	}

	if m.ready {
		b.WriteString(m.viewport.View())
		b.WriteString("\n")
	}

	footer := footerStyle.Render("  ↑↓/jk scroll  r retry  q quit")
	b.WriteString(footer)
	return b.String()
}

func (m model) viewGiveUp() string {
	var b strings.Builder
	b.WriteString(titleStyle.Render(fmt.Sprintf("  Searching: %q", m.opts.Query)))
	b.WriteString("\n\n")

	if m.ready {
		b.WriteString(m.viewport.View())
		b.WriteString("\n")
	}

	footer := footerStyle.Render("  r retry with same query  q quit")
	b.WriteString(footer)
	return b.String()
}

func (m model) viewFailed() string {
	var b strings.Builder
	b.WriteString("\n")
	b.WriteString(errorStyle.Render("  Error: " + m.err.Error()))
	b.WriteString("\n\n")
	b.WriteString(footerStyle.Render("  r retry  q quit"))
	return b.String()
}

// ---------- Content builders ----------

func (m model) buildAnswerContent() string {
	if m.result == nil {
		return ""
	}

	var b strings.Builder

	if m.result.GaveUp {
		b.WriteString(errorStyle.Render("  Could not find what you described."))
		b.WriteString("\n\n")

		if m.result.GiveUp != nil {
			if m.result.GiveUp.Reason != "" {
				b.WriteString(dimStyle.Render("  " + m.result.GiveUp.Reason))
				b.WriteString("\n\n")
			}
			if len(m.result.GiveUp.Tried) > 0 {
				b.WriteString(dimStyle.Render("  Tried:"))
				b.WriteString("\n")
				for _, t := range m.result.GiveUp.Tried {
					b.WriteString(dimStyle.Render("    " + t))
					b.WriteString("\n")
				}
				b.WriteString("\n")
			}
			if len(m.result.GiveUp.Suggestions) > 0 {
				b.WriteString(toolStyle.Render("  You could try:"))
				b.WriteString("\n")
				for _, s := range m.result.GiveUp.Suggestions {
					b.WriteString("    " + s + "\n")
				}
			}
		}
		return b.String()
	}

	// Success
	if len(m.result.Files) > 0 {
		b.WriteString(successStyle.Render("  Found it!"))
		b.WriteString("\n\n")
		for _, f := range m.result.Files {
			b.WriteString(fileStyle.Render("  " + f))
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	if m.result.Answer != "" {
		for _, line := range strings.Split(m.result.Answer, "\n") {
			trimmed := strings.TrimSpace(line)
			if trimmed != "" && !isInFileList(trimmed, m.result.Files) {
				b.WriteString("  " + line + "\n")
			}
		}
	}

	return b.String()
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
