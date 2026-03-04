package ui

import (
	"os"

	"golang.org/x/term"
)

// TermWidth returns the current terminal width, falling back to 80.
func TermWidth() int {
	w, _, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil || w <= 0 {
		return 80
	}
	return w
}
