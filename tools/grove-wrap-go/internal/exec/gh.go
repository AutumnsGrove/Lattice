package exec

import "fmt"

// GH runs a GitHub CLI (gh) command and returns the result.
func GH(args ...string) (*Result, error) {
	return Run("gh", args...)
}

// GHOutput runs a gh command and returns stdout, or an error.
func GHOutput(args ...string) (string, error) {
	result, err := GH(args...)
	if err != nil {
		return "", err
	}
	if !result.OK() {
		return "", fmt.Errorf("gh %s: %s", args[0], result.Stderr)
	}
	return result.Stdout, nil
}

// GHStreaming runs a gh command with real-time output to the terminal.
// Use for long-running or interactive commands like `gh run watch`.
func GHStreaming(args ...string) (int, error) {
	return RunStreaming("gh", args...)
}

// IsGHAvailable returns true if the GitHub CLI is installed.
func IsGHAvailable() bool {
	_, ok := Which("gh")
	return ok
}
