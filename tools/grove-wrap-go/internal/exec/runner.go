// Package exec provides safe subprocess execution for gw.
//
// All external tool invocations (git, gh, wrangler) go through this package.
// Commands are executed with argument lists (no shell expansion) to prevent
// injection. Output capture and streaming are both supported.
//
// Security: Only allowlisted binaries can be executed. The binary name is
// validated against a known set to prevent path traversal and arbitrary
// command execution.
package exec

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// allowedBinaries is the set of external programs gw is permitted to invoke.
// Any attempt to run a binary not in this list is rejected.
var allowedBinaries = map[string]bool{
	"git":      true,
	"gh":       true,
	"wrangler": true,
	"npx":      true,
	"node":     true,
	"pnpm":     true,
	"bun":      true,
	"npm":      true,
}

// Result holds the output of a completed command.
type Result struct {
	Stdout   string
	Stderr   string
	ExitCode int
}

// OK returns true if the command exited successfully.
func (r *Result) OK() bool {
	return r.ExitCode == 0
}

// Lines returns stdout split into non-empty lines.
func (r *Result) Lines() []string {
	raw := strings.Split(strings.TrimSpace(r.Stdout), "\n")
	lines := make([]string, 0, len(raw))
	for _, l := range raw {
		if l != "" {
			lines = append(lines, l)
		}
	}
	return lines
}

// DefaultTimeout is the maximum time a subprocess can run.
const DefaultTimeout = 30 * time.Second

// Run executes an allowlisted command and captures its output.
// The command is NOT run through a shell — args are passed directly.
// Returns an error if the binary is not in the allowlist.
func Run(name string, args ...string) (*Result, error) {
	return RunWithTimeout(DefaultTimeout, name, args...)
}

// RunWithTimeout executes an allowlisted command with a specific timeout.
func RunWithTimeout(timeout time.Duration, name string, args ...string) (*Result, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return RunContext(ctx, name, args...)
}

// RunContext executes an allowlisted command with the given context.
func RunContext(ctx context.Context, name string, args ...string) (*Result, error) {
	// Validate binary name against allowlist
	if !allowedBinaries[name] {
		return nil, fmt.Errorf("binary %q is not in the gw allowlist", name)
	}

	// Reject names with path separators to prevent traversal
	if strings.ContainsAny(name, "/\\") {
		return nil, fmt.Errorf("binary name must not contain path separators: %q", name)
	}

	cmd := exec.CommandContext(ctx, name, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := &Result{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			return result, nil
		}
		return result, fmt.Errorf("failed to execute %s: %w", name, err)
	}

	return result, nil
}

// RunWithStdin executes an allowlisted command, piping stdinData to its stdin.
// Used for commands like `wrangler secret put` that read secrets from stdin.
func RunWithStdin(stdinData string, name string, args ...string) (*Result, error) {
	ctx, cancel := context.WithTimeout(context.Background(), DefaultTimeout)
	defer cancel()

	if !allowedBinaries[name] {
		return nil, fmt.Errorf("binary %q is not in the gw allowlist", name)
	}
	if strings.ContainsAny(name, "/\\") {
		return nil, fmt.Errorf("binary name must not contain path separators: %q", name)
	}

	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdin = strings.NewReader(stdinData)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := &Result{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			return result, nil
		}
		return result, fmt.Errorf("failed to execute %s: %w", name, err)
	}

	return result, nil
}

// Which checks if a binary exists in PATH.
func Which(name string) (string, bool) {
	path, err := exec.LookPath(name)
	if err != nil {
		return "", false
	}
	return path, true
}
