package output

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

// ANSI color codes.
const (
	Reset     = "\033[0m"
	Bold      = "\033[1m"
	Dim       = "\033[2m"
	Red       = "\033[31m"
	Green     = "\033[32m"
	Yellow    = "\033[33m"
	Blue      = "\033[34m"
	Magenta   = "\033[35m"
	Cyan      = "\033[36m"
	BoldRed   = "\033[1;31m"
	BoldGreen = "\033[1;32m"
	BoldBlue  = "\033[1;34m"
	BoldCyan  = "\033[1;36m"
)

// PrintMajorHeader prints a major section header.
func PrintMajorHeader(title string) {
	cfg := config.Get()
	if cfg.JSONMode {
		return
	}
	if cfg.AgentMode {
		fmt.Printf("\n=== %s ===\n", title)
	} else {
		fmt.Printf("\n%s%s=== %s ===%s\n", Bold, Magenta, title, Reset)
	}
}

// PrintSection prints a section header.
func PrintSection(title string) {
	cfg := config.Get()
	if cfg.JSONMode {
		return
	}
	if cfg.AgentMode {
		fmt.Printf("\n--- %s ---\n", title)
	} else {
		fmt.Printf("\n%s%s--- %s ---%s\n", Bold, Cyan, title, Reset)
	}
}

// PrintSectionWithDetail prints a section header with additional detail text.
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
		if detail != "" {
			fmt.Printf("\n%s%s--- %s%s (%s) ---%s\n", Bold, Cyan, title, Reset, detail, Reset)
		} else {
			fmt.Printf("\n%s%s--- %s ---%s\n", Bold, Cyan, title, Reset)
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

// PrintColor prints colored text (only in human mode).
func PrintColor(color, text string) {
	cfg := config.Get()
	if cfg.AgentMode || cfg.JSONMode {
		fmt.Println(text)
	} else {
		fmt.Printf("%s%s%s\n", color, text, Reset)
	}
}

// PrintWarning prints a warning message.
func PrintWarning(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("WARNING: %s\n", msg)
	} else if !cfg.JSONMode {
		fmt.Printf("%sWarning: %s%s\n", Yellow, msg, Reset)
	}
}

// PrintError prints an error message.
func PrintError(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Fprintf(os.Stderr, "ERROR: %s\n", msg)
	} else {
		fmt.Fprintf(os.Stderr, "%sError: %s%s\n", BoldRed, msg, Reset)
	}
}

// PrintSuccess prints a success message.
func PrintSuccess(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("OK: %s\n", msg)
	} else if !cfg.JSONMode {
		fmt.Printf("%s%s%s\n", Green, msg, Reset)
	}
}

// PrintDim prints dim/secondary text.
func PrintDim(msg string) {
	cfg := config.Get()
	if cfg.AgentMode || cfg.JSONMode {
		fmt.Println(msg)
	} else {
		fmt.Printf("%s%s%s\n", Dim, msg, Reset)
	}
}

// PrintNoResults prints a "no results" message.
func PrintNoResults(context string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("(no %s found)\n", context)
	} else if !cfg.JSONMode {
		fmt.Printf("%s(no %s found)%s\n", Dim, context, Reset)
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

// PrintTip prints a helpful tip.
func PrintTip(msg string) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("Tip: %s\n", msg)
	} else if !cfg.JSONMode {
		fmt.Printf("%sTip: %s%s\n", Dim, msg, Reset)
	}
}

// PrintCount prints a count summary.
func PrintCount(label string, count int) {
	cfg := config.Get()
	if cfg.AgentMode {
		fmt.Printf("Total %s: %d\n", label, count)
	} else if !cfg.JSONMode {
		fmt.Printf("%sTotal %s: %s%d%s\n", Dim, label, Bold, count, Reset)
	}
}

// TruncateResults returns a slice with up to max items, plus the overflow count.
func TruncateResults(items []string, max int) ([]string, int) {
	if len(items) <= max {
		return items, 0
	}
	return items[:max], len(items) - max
}

// ColorizeRgOutput strips or keeps rg color codes based on mode.
func ColorizeRgOutput(output string) string {
	cfg := config.Get()
	if cfg.AgentMode || cfg.JSONMode {
		// rg was already called with --color=never, so nothing to strip
		return output
	}
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
