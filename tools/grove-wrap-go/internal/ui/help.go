package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// HelpCategory defines a group of commands for cozy help rendering.
type HelpCategory struct {
	Title    string          // e.g. "Read (Always Safe)"
	Icon     string          // e.g. "📖"
	Style    lipgloss.Style  // Style for the category
	Commands []HelpCommand   // Commands in this category
}

// HelpCommand is a single command entry in the help display.
type HelpCommand struct {
	Name string // e.g. "status"
	Desc string // e.g. "Show working tree status"
}

// RenderCozyHelp renders categorized help output with Grove styling.
// This replaces Python's CozyGroup with Lip Gloss panels.
func RenderCozyHelp(cmdPath, subtitle string, categories []HelpCategory, showSafety bool) string {
	var b strings.Builder

	// Header
	header := TitleStyle.Render(cmdPath)
	if subtitle != "" {
		header += " " + SubtitleStyle.Render("— "+subtitle)
	}
	b.WriteString(header + "\n\n")

	// Category panels
	for _, cat := range categories {
		// Category title with icon
		title := cat.Style.Bold(true).Render(cat.Icon + " " + cat.Title)
		b.WriteString(title + "\n")

		// Commands
		for _, cmd := range cat.Commands {
			name := CommandStyle.Render(fmt.Sprintf("  %-16s", cmd.Name))
			desc := DescStyle.Render(cmd.Desc)
			b.WriteString(name + desc + "\n")
		}
		b.WriteString("\n")
	}

	// Safety tiers footer
	if showSafety {
		b.WriteString(renderSafetyFooter())
	}

	return b.String()
}

// renderSafetyFooter renders the safety tiers reference panel.
func renderSafetyFooter() string {
	var b strings.Builder

	titleLine := WarningStyle.Bold(true).Render("Safety Tiers:")
	b.WriteString(titleLine + "\n")

	b.WriteString("  " + SafeReadStyle.Bold(true).Render("READ    ") + "  ")
	b.WriteString(DescStyle.Render("Always safe — no flags needed") + "\n")

	b.WriteString("  " + SafeWriteStyle.Bold(true).Render("WRITE   ") + "  ")
	b.WriteString(DescStyle.Render("Requires "))
	b.WriteString(SafeWriteStyle.Bold(true).Render("--write"))
	b.WriteString(DescStyle.Render(" flag") + "\n")

	b.WriteString("  " + DangerStyle.Render("DANGER  ") + "  ")
	b.WriteString(DescStyle.Render("Requires "))
	b.WriteString(DangerStyle.Render("--write --force"))
	b.WriteString("\n\n")

	return b.String()
}
