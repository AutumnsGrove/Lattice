package ui

import (
	"fmt"
	"os"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/term"
)

// RunWithSpinner runs fn with an animated spinner. On non-TTY, it prints
// the message and runs fn directly without animation.
func RunWithSpinner(msg string, fn func() error) error {
	// Non-TTY fallback: just print and run
	if !term.IsTerminal(int(os.Stdout.Fd())) {
		fmt.Printf("  %s...\n", msg)
		err := fn()
		if err != nil {
			fmt.Printf("  %s %s\n", ErrorStyle.Render("✗"), msg)
		} else {
			fmt.Printf("  %s %s\n", SuccessStyle.Render("✓"), msg)
		}
		return err
	}

	m := spinnerModel{
		spinner: spinner.New(
			spinner.WithSpinner(spinner.Dot),
			spinner.WithStyle(lipgloss.NewStyle().Foreground(ForestGreen)),
		),
		msg: msg,
		fn:  fn,
	}

	p := tea.NewProgram(m)
	result, err := p.Run()
	if err != nil {
		return fmt.Errorf("spinner error: %w", err)
	}

	final := result.(spinnerModel)
	return final.err
}

// spinnerModel is the Bubble Tea model for the spinner.
type spinnerModel struct {
	spinner spinner.Model
	msg     string
	fn      func() error
	done    bool
	err     error
}

// doneMsg signals that the task function has completed.
type doneMsg struct{ err error }

func (m spinnerModel) Init() tea.Cmd {
	return tea.Batch(
		m.spinner.Tick,
		func() tea.Msg {
			err := m.fn()
			return doneMsg{err: err}
		},
	)
}

func (m spinnerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case doneMsg:
		m.done = true
		m.err = msg.err
		return m, tea.Quit
	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	case tea.KeyMsg:
		if msg.String() == "ctrl+c" {
			return m, tea.Quit
		}
	}
	return m, nil
}

func (m spinnerModel) View() string {
	if m.done {
		if m.err != nil {
			return fmt.Sprintf("  %s %s\n", ErrorStyle.Render("✗"), m.msg)
		}
		return fmt.Sprintf("  %s %s\n", SuccessStyle.Render("✓"), m.msg)
	}
	return fmt.Sprintf("  %s %s\n", m.spinner.View(), m.msg)
}
