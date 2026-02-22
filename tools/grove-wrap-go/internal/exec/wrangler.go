package exec

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// Wrangler runs a wrangler command and returns the result.
func Wrangler(args ...string) (*Result, error) {
	// Try npx wrangler first, fall back to direct wrangler
	if _, ok := Which("wrangler"); ok {
		return Run("wrangler", args...)
	}
	return Run("npx", append([]string{"wrangler"}, args...)...)
}

// WranglerOutput runs a wrangler command and returns stdout, or an error.
func WranglerOutput(args ...string) (string, error) {
	result, err := Wrangler(args...)
	if err != nil {
		return "", err
	}
	if !result.OK() {
		return "", fmt.Errorf("wrangler: %s", result.Stderr)
	}
	return result.Stdout, nil
}

// WranglerInteractive runs a wrangler command with stdin/stdout/stderr
// connected directly to the terminal. Used for streaming commands like logs.
func WranglerInteractive(args ...string) (*Result, error) {
	var name string
	var cmdArgs []string

	if _, ok := Which("wrangler"); ok {
		name = "wrangler"
		cmdArgs = args
	} else {
		name = "npx"
		cmdArgs = append([]string{"wrangler"}, args...)
	}

	if !allowedBinaries[name] {
		return nil, fmt.Errorf("binary %q is not in the gw allowlist", name)
	}
	if strings.ContainsAny(name, "/\\") {
		return nil, fmt.Errorf("binary name must not contain path separators: %q", name)
	}

	cmd := exec.Command(name, cmdArgs...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return &Result{ExitCode: exitErr.ExitCode()}, nil
		}
		return nil, err
	}
	return &Result{ExitCode: 0}, nil
}

// WranglerWithStdin runs a wrangler command, piping stdinData to its stdin.
// Used for `wrangler secret put` which reads the secret value from stdin.
func WranglerWithStdin(stdinData string, args ...string) (*Result, error) {
	if _, ok := Which("wrangler"); ok {
		return RunWithStdin(stdinData, "wrangler", args...)
	}
	return RunWithStdin(stdinData, "npx", append([]string{"wrangler"}, args...)...)
}

// IsWranglerAvailable returns true if wrangler is accessible.
func IsWranglerAvailable() bool {
	if _, ok := Which("wrangler"); ok {
		return true
	}
	// Check via npx
	result, err := Run("npx", "wrangler", "--version")
	return err == nil && result.OK()
}
