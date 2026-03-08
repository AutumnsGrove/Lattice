package cmd

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// tuiSettings holds the editable TUI preferences.
type tuiSettings struct {
	autoWorktree bool
	itemsPerPage int
	cursor       int // which setting is selected (0-based)
	dirty        bool
	saveErr      error
	saved        bool
}

const (
	settingAutoWorktree = 0
	settingItemsPerPage = 1
	settingCount        = 2

	minItemsPerPage = 10
	maxItemsPerPage = 100
)

// newTUISettings creates settings from the current config.
func newTUISettings() *tuiSettings {
	cfg := config.Get()
	return &tuiSettings{
		autoWorktree: cfg.TUI.AutoWorktree,
		itemsPerPage: cfg.TUI.ItemsPerPage,
	}
}

// handleKey processes a keypress in the settings overlay.
// Returns true if the overlay should close.
func (s *tuiSettings) handleKey(key string) bool {
	switch key {
	case "j", "down":
		if s.cursor < settingCount-1 {
			s.cursor++
		}
	case "k", "up":
		if s.cursor > 0 {
			s.cursor--
		}
	case "enter", " ":
		s.toggle()
	case "h", "left":
		s.adjust(-1)
	case "l", "right":
		s.adjust(1)
	case "s":
		s.save()
	case "q", "esc", ",":
		return true
	}
	return false
}

// toggle flips the current boolean setting or increments numeric ones.
func (s *tuiSettings) toggle() {
	switch s.cursor {
	case settingAutoWorktree:
		s.autoWorktree = !s.autoWorktree
		s.dirty = true
		s.saved = false
	case settingItemsPerPage:
		s.adjust(10)
	}
}

// adjust changes a numeric setting by delta.
func (s *tuiSettings) adjust(delta int) {
	switch s.cursor {
	case settingAutoWorktree:
		// Toggle on any direction press
		s.autoWorktree = !s.autoWorktree
		s.dirty = true
		s.saved = false
	case settingItemsPerPage:
		newVal := s.itemsPerPage + (delta * 5)
		if newVal < minItemsPerPage {
			newVal = minItemsPerPage
		}
		if newVal > maxItemsPerPage {
			newVal = maxItemsPerPage
		}
		if newVal != s.itemsPerPage {
			s.itemsPerPage = newVal
			s.dirty = true
			s.saved = false
		}
	}
}

// save persists settings to ~/.grove/gw.toml and updates the in-memory config.
func (s *tuiSettings) save() {
	// Clamp to valid range before saving
	if s.itemsPerPage < minItemsPerPage {
		s.itemsPerPage = minItemsPerPage
	}
	if s.itemsPerPage > maxItemsPerPage {
		s.itemsPerPage = maxItemsPerPage
	}

	cfg := config.Get()
	cfg.TUI.AutoWorktree = s.autoWorktree
	cfg.TUI.ItemsPerPage = s.itemsPerPage

	if err := cfg.Save(); err != nil {
		s.saveErr = err
		return
	}
	s.saveErr = nil
	s.dirty = false
	s.saved = true
}

// Styles for the settings overlay.
var (
	settingsHeaderStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(ui.ForestGreen)

	settingsLabelStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#e0e0e0"))

	settingsValueOnStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(ui.ForestGreen)

	settingsValueOffStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(ui.DimGray)

	settingsValueNumStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(ui.SunsetAmber)

	settingsCursorStyle = lipgloss.NewStyle().
		Foreground(ui.SunsetAmber).
		Bold(true)

	settingsSavedStyle = lipgloss.NewStyle().
		Foreground(ui.ForestGreen)

	settingsErrStyle = lipgloss.NewStyle().
		Foreground(ui.DangerRed)
)

// render draws the settings overlay.
func (s *tuiSettings) render() string {
	var b strings.Builder

	b.WriteString(settingsHeaderStyle.Render("⚙  TUI Settings") + "\n\n")

	// Auto-worktree toggle
	cursor0 := "  "
	if s.cursor == settingAutoWorktree {
		cursor0 = settingsCursorStyle.Render("▸ ")
	}
	wtValue := settingsValueOffStyle.Render("off")
	if s.autoWorktree {
		wtValue = settingsValueOnStyle.Render("on")
	}
	b.WriteString(fmt.Sprintf("%s%s  %s\n",
		cursor0,
		settingsLabelStyle.Render("Auto-create worktrees"),
		wtValue))
	if s.cursor == settingAutoWorktree {
		b.WriteString(browseHintStyle.Render("    When launching skills, auto-create a worktree for the issue/PR") + "\n")
	}

	// Items per page
	cursor1 := "  "
	if s.cursor == settingItemsPerPage {
		cursor1 = settingsCursorStyle.Render("▸ ")
	}
	b.WriteString(fmt.Sprintf("%s%s  %s\n",
		cursor1,
		settingsLabelStyle.Render("Items per page"),
		settingsValueNumStyle.Render(fmt.Sprintf("%d", s.itemsPerPage))))
	if s.cursor == settingItemsPerPage {
		b.WriteString(browseHintStyle.Render("    Number of issues/PRs to fetch per page (←/→ to adjust by 5)") + "\n")
	}

	b.WriteString("\n")

	// Status line
	if s.saveErr != nil {
		b.WriteString(settingsErrStyle.Render("  Error: "+s.saveErr.Error()) + "\n")
	} else if s.saved {
		b.WriteString(settingsSavedStyle.Render("  ✓ Settings saved to ~/.grove/gw.toml") + "\n")
	} else if s.dirty {
		b.WriteString(browseHintStyle.Render("  Unsaved changes — press s to save") + "\n")
	}

	// Footer
	b.WriteString("\n")
	b.WriteString(browseHintStyle.Render("  j/k navigate • enter/space toggle • ←/→ adjust • s save • esc close"))

	return b.String()
}
