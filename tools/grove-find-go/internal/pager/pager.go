// Package pager provides a Bubble Tea scrollable viewport for high-volume gf output.
// It activates only when stdout is a TTY and output exceeds the configured line threshold.
package pager

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/term"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

var footerStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#666666"))

type model struct {
	viewport viewport.Model
	ready    bool
}

// Run displays content in a scrollable alt-screen viewport.
func Run(content string) error {
	width, height, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		width, height = 80, 24
	}

	vp := viewport.New(width, height-2)
	vp.SetContent(content)

	p := tea.NewProgram(model{viewport: vp, ready: true}, tea.WithAltScreen())
	_, err = p.Run()
	return err
}

// MaybePage prints content directly or through the paginator based on config.
// It activates when: stdout is a TTY, not agent/json mode, not --no-pager,
// and line count exceeds PageThreshold.
func MaybePage(content string) error {
	cfg := config.Get()

	// Always dump directly when in agent/JSON mode, or --no-pager is set.
	if cfg.AgentMode || cfg.JSONMode || cfg.NoPager {
		fmt.Print(content)
		return nil
	}

	// Skip paginator when stdout is not a TTY (e.g. piped to grep).
	if !term.IsTerminal(int(os.Stdout.Fd())) {
		fmt.Print(content)
		return nil
	}

	lineCount := strings.Count(content, "\n")
	if lineCount <= cfg.PageThreshold {
		fmt.Print(content)
		return nil
	}

	return Run(content)
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc", "ctrl+c":
			return m, tea.Quit
		}
	case tea.WindowSizeMsg:
		m.viewport.Width = msg.Width
		m.viewport.Height = msg.Height - 2
	}

	var cmd tea.Cmd
	m.viewport, cmd = m.viewport.Update(msg)
	return m, cmd
}

func (m model) View() string {
	if !m.ready {
		return "Loading..."
	}
	pct := int(m.viewport.ScrollPercent() * 100)
	footer := footerStyle.Render(fmt.Sprintf("  %d%%  ↑↓/jk scroll  q quit", pct))
	return m.viewport.View() + "\n" + footer
}
