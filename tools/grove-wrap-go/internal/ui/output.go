package ui

import "fmt"

// Success prints a success message with a green checkmark.
func Success(msg string) {
	fmt.Println(SuccessStyle.Render("✓") + " " + msg)
}

// Error prints an error message with a red cross.
func Error(msg string) {
	fmt.Println(ErrorStyle.Render("✗") + " " + msg)
}

// Warning prints a warning message with a yellow indicator.
func Warning(msg string) {
	fmt.Println(WarningStyle.Render("⚠") + " " + msg)
}

// Info prints an info message with a blue indicator.
func Info(msg string) {
	fmt.Println(InfoStyle.Render("ℹ") + " " + msg)
}

// Hint prints a dim hint or suggestion.
func Hint(msg string) {
	fmt.Println(HintStyle.Render(msg))
}

// Action prints a verb + detail pair (e.g., "Committed: abc123").
func Action(verb, detail string) {
	fmt.Println(SuccessStyle.Render(verb+":") + " " + detail)
}

// Step prints a pass/fail step line.
func Step(ok bool, msg string) {
	if ok {
		fmt.Println("  " + SuccessStyle.Render("✓") + " " + msg)
	} else {
		fmt.Println("  " + ErrorStyle.Render("✗") + " " + msg)
	}
}

// Muted prints a dim, low-emphasis message.
func Muted(msg string) {
	fmt.Println(HintStyle.Render(msg))
}

// PrintHeader prints a bold section header.
func PrintHeader(title string) {
	fmt.Println(TitleStyle.Render(title))
}

// PrintKeyValue prints a key-value pair with styled formatting.
func PrintKeyValue(key, value string) {
	fmt.Printf("  %s  %s\n", CommandStyle.Render(key), value)
}

// SafetyError prints a safety check failure with an optional suggestion.
func SafetyError(msg string, suggestion string) {
	Error("Safety check failed: " + msg)
	if suggestion != "" {
		Hint(suggestion)
	}
}
