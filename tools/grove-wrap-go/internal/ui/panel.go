package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// RenderPanel renders a bordered panel with a title.
func RenderPanel(title, content string) string {
	titleLine := PanelTitleStyle.Render(title)
	panel := PanelStyle.Render(content)
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

	content := strings.Join(lines, "\n")
	panel := PanelStyle.Render(content)

	titleLine := PanelTitleStyle.Render(title)
	return titleLine + "\n" + panel + "\n"
}

// RenderWarningPanel renders a yellow-bordered panel with a warning prefix.
func RenderWarningPanel(title, msg string) string {
	prefix := WarningStyle.Render("⚠")
	titleLine := WarningStyle.Bold(true).Render(title)
	content := prefix + " " + msg
	panel := WarningPanelStyle.Render(content)
	return titleLine + "\n" + panel + "\n"
}

// RenderErrorPanel renders a red-bordered panel with error + suggestion.
func RenderErrorPanel(title, msg, suggestion string) string {
	prefix := ErrorStyle.Render("✗")
	titleLine := ErrorStyle.Bold(true).Render(title)

	var lines []string
	lines = append(lines, prefix+" "+msg)
	if suggestion != "" {
		lines = append(lines, "")
		lines = append(lines, HintStyle.Render(suggestion))
	}

	content := strings.Join(lines, "\n")
	panel := ErrorPanelStyle.Render(content)
	return titleLine + "\n" + panel + "\n"
}

// RenderSuccessPanel renders a green-bordered panel with a success prefix.
func RenderSuccessPanel(title, content string) string {
	prefix := SuccessStyle.Render("✓")
	titleLine := SuccessStyle.Bold(true).Render(title)
	body := prefix + " " + content
	panel := SuccessPanelStyle.Render(body)
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

	var style lipgloss.Style
	if allOK {
		style = SuccessPanelStyle
	} else {
		style = WarningPanelStyle
	}

	panel := style.Render(content)
	titleLine := PanelTitleStyle.Render(title)
	return titleLine + "\n" + panel + "\n"
}
