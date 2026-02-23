package output

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/lipgloss"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

// Grove color palette — matches gw for visual consistency.
var (
	colorForestGreen = lipgloss.Color("#2d5a27")
	colorMossGreen   = lipgloss.Color("#4a7c59")
	colorSunsetAmber = lipgloss.Color("#e8a838")
	colorLeafYellow  = lipgloss.Color("#b8a924")
	colorDangerRed   = lipgloss.Color("#ff4444")
	colorDimGray     = lipgloss.Color("#666666")
)

// Lipgloss styles for human-readable output.
var (
	majorHeaderStyle = lipgloss.NewStyle().Bold(true).Foreground(colorForestGreen)
	sectionStyle     = lipgloss.NewStyle().Bold(true).Foreground(colorMossGreen)
	sectionDetailStyle = lipgloss.NewStyle().Foreground(colorDimGray)
	warningStyle     = lipgloss.NewStyle().Foreground(colorLeafYellow)
	errorStyle       = lipgloss.NewStyle().Foreground(colorDangerRed)
	successStyle     = lipgloss.NewStyle().Foreground(colorForestGreen)
	dimStyle         = lipgloss.NewStyle().Foreground(colorDimGray)
	countStyle       = lipgloss.NewStyle().Bold(true).Foreground(colorSunsetAmber)
)

// PrintMajorHeader prints a major section header (e.g. "Daily Briefing").
// Agent mode: === Title ===   Human mode: Lipgloss ForestGreen bold
func PrintMajorHeader(title string) {
	cfg := config.Get()
	if cfg.JSONMode {
		return
	}
	if cfg.AgentMode {
		fmt.Printf("\n=== %s ===\n", title)
	} else {
		fmt.Println()
		fmt.Println(majorHeaderStyle.Render("  " + title))
	}
}

// PrintSection prints a section divider header.
// Agent mode: --- Title ---   Human mode: Lipgloss MossGreen bold, no brackets
func PrintSection(title string) {
	cfg := config.Get()
	if cfg.JSONMode {
		return
	}
	if cfg.AgentMode {
		fmt.Printf("\n--- %s ---\n", title)
	} else {
		fmt.Println()
		fmt.Println(sectionStyle.Render("  " + title))
	}
}

// PrintSectionWithDetail prints a section header with supplementary detail text.
// Agent mode: --- Title (detail) ---   Human mode: title bold + detail dim
func PrintSectionWithDetail(title, detail string) {
	cfg := config.Get()
	if cfg.JSONMode {
		return
	}
	if cfg.AgentMode {
		if detail != "" {
			fmt.Printf("\n--- %s (%s) ---\n", title, detail)
		} else {
			fmt.Printf("\n--- %s ---\n", title)
		}
	} else {
		fmt.Println()
		if detail != "" {
			fmt.Println(sectionStyle.Render("  "+title) + "  " + sectionDetailStyle.Render("("+detail+")"))
		} else {
			fmt.Println(sectionStyle.Render("  " + title))
		}
	}
}

// Print prints a plain message.
func Print(msg string) {
	fmt.Println(msg)
}

// Printf prints a formatted message.
func Printf(format string, args ...any) {
	fmt.Printf(format+"\n", args...)
}

// PrintRaw prints text as-is (for passthrough from rg/git output).
func PrintRaw(text string) {
	fmt.Print(text)
}

// PrintColor prints colored text. In agent/JSON mode prints plain text.
// The color arg is kept for call-site compatibility but ignored in favor of Lipgloss.
func PrintColor(color, text string) {
	cfg := config.Get()
	if cfg.AgentMode || cfg.JSONMode {
		fmt.Println(text)
	} else {
		style := lipgloss.NewStyle().Foreground(lipgloss.Color(color))
		fmt.Println(style.Render(text))
	}
}

// PrintWarning prints a warning message.
func PrintWarning(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("WARNING: %s\n", msg)
	} else if !cfg.JSONMode {
		fmt.Println(warningStyle.Render("  Warning: " + msg))
	}
}

// PrintError prints an error message to stderr.
func PrintError(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Fprintf(os.Stderr, "ERROR: %s\n", msg)
	} else {
		fmt.Fprintln(os.Stderr, errorStyle.Render("  Error: "+msg))
	}
}

// PrintSuccess prints a success message.
func PrintSuccess(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("OK: %s\n", msg)
	} else if !cfg.JSONMode {
		fmt.Println(successStyle.Render("  " + msg))
	}
}

// PrintDim prints dim/secondary text.
func PrintDim(msg string) {
	cfg := config.Get()
	if cfg.AgentMode || cfg.JSONMode {
		fmt.Println(msg)
	} else {
		fmt.Println(dimStyle.Render(msg))
	}
}

// PrintNoResults prints a "no results" placeholder.
func PrintNoResults(context string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("(no %s found)\n", context)
	} else if !cfg.JSONMode {
		fmt.Println(dimStyle.Render(fmt.Sprintf("  (no %s found)", context)))
	}
}

// PrintJSON marshals data as JSON and prints it.
func PrintJSON(data any) {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		PrintError(fmt.Sprintf("JSON encoding error: %v", err))
		return
	}
	fmt.Println(string(b))
}

// PrintTip prints a helpful tip in dim style.
func PrintTip(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("Tip: %s\n", msg)
	} else if !cfg.JSONMode {
		fmt.Println(dimStyle.Render("  Tip: " + msg))
	}
}

// PrintCount prints a count summary.
func PrintCount(label string, count int) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("Total %s: %d\n", label, count)
	} else if !cfg.JSONMode {
		fmt.Println(dimStyle.Render("  Total "+label+": ") + countStyle.Render(fmt.Sprintf("%d", count)))
	}
}

// TruncateResults returns a slice with up to max items, plus the overflow count.
func TruncateResults(items []string, max int) ([]string, int) {
	if len(items) <= max {
		return items, 0
	}
	return items[:max], len(items) - max
}

// ColorizeRgOutput is a passthrough — rg is already called with --color=never.
func ColorizeRgOutput(output string) string {
	return output
}

// FilterEmptyLines removes empty lines from a string slice.
func FilterEmptyLines(lines []string) []string {
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			result = append(result, line)
		}
	}
	return result
}
