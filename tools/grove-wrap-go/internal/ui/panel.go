package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// RenderPanel renders a bordered panel with a title.
func RenderPanel(title, content string) string {
	w := TermWidth()
	titleLine := PanelTitleStyle.Render(title)
	panel := PanelStyle.MaxWidth(w).Render(content)
	return titleLine + "\n" + panel + "\n"
}

// RenderInfoPanel renders a key-value panel with auto-aligned keys.
func RenderInfoPanel(title string, pairs [][2]string) string {
	// Find max key width for alignment
	maxKey := 0
	for _, p := range pairs {
		if len(p[0]) > maxKey {
			maxKey = len(p[0])
		}
	}

	var lines []string
	for _, p := range pairs {
		key := CommandStyle.Render(fmt.Sprintf("%-*s", maxKey, p[0]))
		lines = append(lines, fmt.Sprintf("%s  %s", key, p[1]))
	}

	w := TermWidth()
	content := strings.Join(lines, "\n")
	panel := PanelStyle.MaxWidth(w).Render(content)

	titleLine := PanelTitleStyle.Render(title)
	return titleLine + "\n" + panel + "\n"
}

// RenderDetailView renders an info panel with an optional body section below it.
// This is the standard layout for "view" commands: key-value metadata on top,
// and a description/content panel below when body is non-empty.
func RenderDetailView(title string, pairs [][2]string, body string) string {
	result := RenderInfoPanel(title, pairs)
	if body != "" {
		result += RenderPanel("Description", body)
	}
	return result
}

// RenderWarningPanel renders a yellow-bordered panel with a warning prefix.
func RenderWarningPanel(title, msg string) string {
	w := TermWidth()
	prefix := WarningStyle.Render("⚠")
	titleLine := WarningStyle.Bold(true).Render(title)
	content := prefix + " " + msg
	panel := WarningPanelStyle.MaxWidth(w).Render(content)
	return titleLine + "\n" + panel + "\n"
}

// RenderErrorPanel renders a red-bordered panel with error + suggestion.
func RenderErrorPanel(title, msg, suggestion string) string {
	w := TermWidth()
	prefix := ErrorStyle.Render("✗")
	titleLine := ErrorStyle.Bold(true).Render(title)

	var lines []string
	lines = append(lines, prefix+" "+msg)
	if suggestion != "" {
		lines = append(lines, "")
		lines = append(lines, HintStyle.Render(suggestion))
	}

	content := strings.Join(lines, "\n")
	panel := ErrorPanelStyle.MaxWidth(w).Render(content)
	return titleLine + "\n" + panel + "\n"
}

// RenderSuccessPanel renders a green-bordered panel with a success prefix.
func RenderSuccessPanel(title, content string) string {
	w := TermWidth()
	prefix := SuccessStyle.Render("✓")
	titleLine := SuccessStyle.Bold(true).Render(title)
	body := prefix + " " + content
	panel := SuccessPanelStyle.MaxWidth(w).Render(body)
	return titleLine + "\n" + panel + "\n"
}

// StepItem represents a single pass/fail step in a checklist.
type StepItem struct {
	OK    bool
	Label string
}

// RenderStepList renders a pass/fail checklist inside a bordered panel.
func RenderStepList(title string, steps []StepItem) string {
	var lines []string
	for _, s := range steps {
		if s.OK {
			lines = append(lines, SuccessStyle.Render("✓")+" "+s.Label)
		} else {
			lines = append(lines, ErrorStyle.Render("✗")+" "+s.Label)
		}
	}

	content := strings.Join(lines, "\n")

	// Choose border color based on overall status
	allOK := true
	for _, s := range steps {
		if !s.OK {
			allOK = false
			break
		}
	}

	w := TermWidth()
	var style lipgloss.Style
	if allOK {
		style = SuccessPanelStyle
	} else {
		style = WarningPanelStyle
	}

	panel := style.MaxWidth(w).Render(content)
	titleLine := PanelTitleStyle.Render(title)
	return titleLine + "\n" + panel + "\n"
}
