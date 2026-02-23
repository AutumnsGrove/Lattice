package ui

import (
	"fmt"
	"os"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/term"
)

// RunViewport displays content in a scrollable Bubble Tea viewport.
// Exits on q, Escape, or Ctrl+C.
func RunViewport(title, content string) error {
	width, height, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		width, height = 80, 24
	}

	vp := viewport.New(width, height-3)
	vp.SetContent(content)

	m := viewportModel{
		title:    title,
		viewport: vp,
	}

	p := tea.NewProgram(m, tea.WithAltScreen())
	_, err = p.Run()
	return err
}

// viewportModel is the Bubble Tea model for a scrollable read-only viewport.
type viewportModel struct {
	title    string
	viewport viewport.Model
}

func (m viewportModel) Init() tea.Cmd {
	return nil
}

func (m viewportModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c", "esc":
			return m, tea.Quit
		}
	case tea.WindowSizeMsg:
		m.viewport.Width = msg.Width
		m.viewport.Height = msg.Height - 3
	}
	var cmd tea.Cmd
	m.viewport, cmd = m.viewport.Update(msg)
	return m, cmd
}

func (m viewportModel) View() string {
	titleLine := PanelTitleStyle.Render(m.title)
	hint := lipgloss.NewStyle().
		Foreground(DimGray).
		Render(fmt.Sprintf("  ↑/↓/PgUp/PgDn scroll  •  q quit  •  %d%%", int(m.viewport.ScrollPercent()*100)))
	return titleLine + "\n" + m.viewport.View() + "\n" + hint
}
