// Package ui provides Grove-themed terminal styling using Lip Gloss.
//
// The theme mirrors the Python gw color palette and provides composable
// styles for headers, safety tiers, panels, and status messages.
package ui

import (
	"github.com/charmbracelet/lipgloss"
)

// Grove color palette — nature-inspired, matching the Python gw theme.
var (
	ForestGreen = lipgloss.Color("#2d5a27")
	LeafYellow  = lipgloss.Color("#b8a924")
	BarkBrown   = lipgloss.Color("#8b6914")
	BlossomPink = lipgloss.Color("#d4547a")
	RiverCyan   = lipgloss.Color("#3a9d9b")
	MossGreen   = lipgloss.Color("#4a7c59")
	SunsetAmber = lipgloss.Color("#e8a838")
	DangerRed   = lipgloss.Color("#ff4444")
	DimGray     = lipgloss.Color("#666666")
)

// Header and title styles.
var (
	HeaderStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(ForestGreen).
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(ForestGreen).
			Padding(0, 1)

	TitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(ForestGreen)

	SubtitleStyle = lipgloss.NewStyle().
			Foreground(DimGray)
)

// Safety tier styles — each tier has a distinct visual identity.
var (
	SafeReadStyle = lipgloss.NewStyle().
			Foreground(ForestGreen)

	SafeWriteStyle = lipgloss.NewStyle().
			Foreground(LeafYellow)

	DangerStyle = lipgloss.NewStyle().
			Foreground(DangerRed).
			Bold(true)

	ProtectedStyle = lipgloss.NewStyle().
			Foreground(DangerRed).
			Bold(true).
			Underline(true)

	ShortcutStyle = lipgloss.NewStyle().
			Foreground(SunsetAmber)
)

// Status message styles.
var (
	SuccessStyle = lipgloss.NewStyle().
			Foreground(ForestGreen)

	ErrorStyle = lipgloss.NewStyle().
			Foreground(DangerRed)

	WarningStyle = lipgloss.NewStyle().
			Foreground(LeafYellow)

	InfoStyle = lipgloss.NewStyle().
			Foreground(RiverCyan)

	HintStyle = lipgloss.NewStyle().
			Foreground(DimGray)
)

// Panel styles.
var (
	PanelStyle = lipgloss.NewStyle().
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(ForestGreen).
			Padding(0, 1)

	SafetyPanelStyle = lipgloss.NewStyle().
				BorderStyle(lipgloss.RoundedBorder()).
				BorderForeground(LeafYellow).
				Padding(0, 1)
)

// Command name style for help output.
var (
	CommandStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(MossGreen)

	DescStyle = lipgloss.NewStyle().
			Foreground(DimGray)
)
