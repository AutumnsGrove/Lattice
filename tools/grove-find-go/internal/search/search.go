package search

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/tools"
)

// MaxPatternLength is the maximum allowed regex pattern length to prevent resource exhaustion.
const MaxPatternLength = 4096

// Standard glob exclusions applied to all ripgrep calls.
var DefaultExcludes = []string{
	"--glob", "!node_modules",
	"--glob", "!.git",
	"--glob", "!dist",
	"--glob", "!build",
	"--glob", "!*.lock",
	"--glob", "!pnpm-lock.yaml",
}

// Option configures a ripgrep invocation.
type Option func(*rgOpts)

type rgOpts struct {
	ctx       context.Context
	cwd       string
	color     bool
	excludes  []string
	fileTypes []string
	globs     []string
	filesOnly bool
	extraArgs []string
}

func WithContext(ctx context.Context) Option { return func(o *rgOpts) { o.ctx = ctx } }
func WithCwd(cwd string) Option              { return func(o *rgOpts) { o.cwd = cwd } }
func WithColor(enabled bool) Option          { return func(o *rgOpts) { o.color = enabled } }
func WithExcludes(ex []string) Option        { return func(o *rgOpts) { o.excludes = ex } }
func WithType(t string) Option               { return func(o *rgOpts) { o.fileTypes = append(o.fileTypes, t) } }
func WithTypes(ts ...string) Option          { return func(o *rgOpts) { o.fileTypes = append(o.fileTypes, ts...) } }
func WithGlob(g string) Option               { return func(o *rgOpts) { o.globs = append(o.globs, g) } }
func WithGlobs(gs ...string) Option          { return func(o *rgOpts) { o.globs = append(o.globs, gs...) } }
func WithFilesOnly() Option                  { return func(o *rgOpts) { o.filesOnly = true } }
func WithExtraArgs(args ...string) Option    { return func(o *rgOpts) { o.extraArgs = append(o.extraArgs, args...) } }

// RunRg executes ripgrep with the given pattern and options.
// Returns stdout as a string. Non-zero exit with no output is not an error (just no matches).
func RunRg(pattern string, opts ...Option) (string, error) {
	if len(pattern) > MaxPatternLength {
		return "", fmt.Errorf("pattern too long (%d bytes, max %d)", len(pattern), MaxPatternLength)
	}

	t := tools.Discover()
	if !t.HasRg() {
		return "", nil
	}

	cfg := config.Get()
	o := &rgOpts{
		cwd:      cfg.GroveRoot,
		color:    cfg.IsHumanMode(),
		excludes: DefaultExcludes,
	}
	for _, opt := range opts {
		opt(o)
	}

	args := []string{
		"--line-number",
		"--no-heading",
		"--smart-case",
	}

	if o.color {
		args = append(args, "--color=always")
	} else {
		args = append(args, "--color=never")
	}

	args = append(args, o.excludes...)

	for _, ft := range o.fileTypes {
		args = append(args, "--type", ft)
	}
	for _, g := range o.globs {
		args = append(args, "--glob", g)
	}
	if o.filesOnly {
		args = append(args, "-l")
	}

	args = append(args, o.extraArgs...)
	args = append(args, pattern)

	cmd := makeCommand(o.ctx, t.Rg, args...)
	cmd.Dir = o.cwd

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// rg exits 1 when no matches found — that's not an error
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return "", nil
		}
		return "", err
	}

	return stdout.String(), nil
}

// RunRgRaw executes ripgrep with raw args (no pattern pre-processing).
func RunRgRaw(args []string, opts ...Option) (string, error) {
	t := tools.Discover()
	if !t.HasRg() {
		return "", nil
	}

	cfg := config.Get()
	o := &rgOpts{
		cwd:      cfg.GroveRoot,
		color:    cfg.IsHumanMode(),
		excludes: DefaultExcludes,
	}
	for _, opt := range opts {
		opt(o)
	}

	baseArgs := []string{
		"--line-number",
		"--no-heading",
		"--smart-case",
	}

	if o.color {
		baseArgs = append(baseArgs, "--color=always")
	} else {
		baseArgs = append(baseArgs, "--color=never")
	}

	baseArgs = append(baseArgs, o.excludes...)
	baseArgs = append(baseArgs, args...)

	cmd := exec.Command(t.Rg, baseArgs...)
	cmd.Dir = o.cwd

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return "", nil
		}
		return "", err
	}

	return stdout.String(), nil
}

// FindFiles uses fd (or falls back to rg --files) to find files matching a pattern.
func FindFiles(pattern string, opts ...Option) ([]string, error) {
	t := tools.Discover()
	cfg := config.Get()

	o := &rgOpts{
		cwd: cfg.GroveRoot,
	}
	for _, opt := range opts {
		opt(o)
	}

	var output string
	var err error

	if t.HasFd() {
		args := []string{
			"--type", "f",
			"--exclude", "node_modules",
			"--exclude", ".git",
			"--exclude", "dist",
			"--exclude", "build",
		}
		if pattern != "" {
			args = append(args, pattern)
		}
		for _, g := range o.globs {
			args = append(args, "--glob", g)
		}

		cmd := exec.Command(t.Fd, args...)
		cmd.Dir = o.cwd
		var stdout bytes.Buffer
		cmd.Stdout = &stdout
		err = cmd.Run()
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
				return nil, nil
			}
			// Fall through to rg fallback
		} else {
			output = stdout.String()
		}
	}

	// Fallback to rg --files if fd not available or failed
	if output == "" && t.HasRg() {
		args := []string{"--files"}
		args = append(args, DefaultExcludes...)
		for _, g := range o.globs {
			args = append(args, "--glob", g)
		}

		cmd := exec.Command(t.Rg, args...)
		cmd.Dir = o.cwd
		var stdout bytes.Buffer
		cmd.Stdout = &stdout
		err = cmd.Run()
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
				return nil, nil
			}
			return nil, err
		}
		output = stdout.String()

		// Filter by pattern if provided (rg --files doesn't filter by name)
		if pattern != "" {
			lines := strings.Split(strings.TrimSpace(output), "\n")
			filtered := make([]string, 0)
			lowerPattern := strings.ToLower(pattern)
			for _, line := range lines {
				if strings.Contains(strings.ToLower(line), lowerPattern) {
					filtered = append(filtered, line)
				}
			}
			return filtered, nil
		}
	}

	if output == "" {
		return nil, nil
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		if line = strings.TrimSpace(line); line != "" {
			result = append(result, line)
		}
	}
	return result, nil
}

// FindFilesByGlob finds files matching glob patterns.
func FindFilesByGlob(globs []string, opts ...Option) ([]string, error) {
	t := tools.Discover()
	cfg := config.Get()

	o := &rgOpts{
		cwd: cfg.GroveRoot,
	}
	for _, opt := range opts {
		opt(o)
	}

	if t.HasFd() {
		args := []string{"--type", "f",
			"--exclude", "node_modules",
			"--exclude", ".git",
			"--exclude", "dist",
			"--exclude", "build",
		}
		for _, g := range globs {
			args = append(args, "--glob", g)
		}

		cmd := exec.Command(t.Fd, args...)
		cmd.Dir = o.cwd
		var stdout bytes.Buffer
		cmd.Stdout = &stdout
		if err := cmd.Run(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
				return nil, nil
			}
			// Fall through to rg
		} else {
			return splitLines(stdout.String()), nil
		}
	}

	// Fallback: rg --files with globs
	if t.HasRg() {
		args := []string{"--files"}
		args = append(args, DefaultExcludes...)
		for _, g := range globs {
			args = append(args, "--glob", g)
		}

		cmd := exec.Command(t.Rg, args...)
		cmd.Dir = o.cwd
		var stdout bytes.Buffer
		cmd.Stdout = &stdout
		if err := cmd.Run(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
				return nil, nil
			}
			return nil, err
		}
		return splitLines(stdout.String()), nil
	}

	return nil, nil
}

// RunGit executes a git command and returns stdout.
func RunGit(args ...string) (string, error) {
	t := tools.Discover()
	if !t.HasGit() {
		return "", nil
	}

	cfg := config.Get()
	cmd := exec.Command(t.Git, args...)
	cmd.Dir = cfg.GroveRoot

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	if err := cmd.Run(); err != nil {
		return "", err
	}
	return stdout.String(), nil
}

// RunGh executes a GitHub CLI command and returns stdout.
func RunGh(args ...string) (string, error) {
	t := tools.Discover()
	if !t.HasGh() {
		return "", nil
	}

	cfg := config.Get()
	cmd := exec.Command(t.Gh, args...)
	cmd.Dir = cfg.GroveRoot

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	if err := cmd.Run(); err != nil {
		return "", err
	}
	return stdout.String(), nil
}

// splitLines splits text into non-empty trimmed lines.
func splitLines(text string) []string {
	lines := strings.Split(strings.TrimSpace(text), "\n")
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		if line = strings.TrimSpace(line); line != "" {
			result = append(result, line)
		}
	}
	return result
}

// SplitLines is the exported version of splitLines.
func SplitLines(text string) []string {
	return splitLines(text)
}

// makeCommand creates an exec.Cmd, using CommandContext if a context is provided.
func makeCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	if ctx != nil {
		return exec.CommandContext(ctx, name, args...)
	}
	return exec.Command(name, args...)
}
