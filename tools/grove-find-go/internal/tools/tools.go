package tools

import (
	"os/exec"
	"sync"
)

// Tools holds discovered paths to external binaries.
type Tools struct {
	Rg  string // ripgrep
	Fd  string // fd-find
	Git string
	Gh  string // GitHub CLI
}

var (
	discovered *Tools
	once       sync.Once
)

// Discover finds external tools and caches the result.
func Discover() *Tools {
	once.Do(func() {
		discovered = &Tools{
			Rg:  findBinary("rg"),
			Fd:  findFd(),
			Git: findBinary("git"),
			Gh:  findBinary("gh"),
		}
	})
	return discovered
}

// HasRg returns true if ripgrep is available.
func (t *Tools) HasRg() bool { return t.Rg != "" }

// HasFd returns true if fd is available.
func (t *Tools) HasFd() bool { return t.Fd != "" }

// HasGit returns true if git is available.
func (t *Tools) HasGit() bool { return t.Git != "" }

// HasGh returns true if GitHub CLI is available.
func (t *Tools) HasGh() bool { return t.Gh != "" }

func findBinary(name string) string {
	path, err := exec.LookPath(name)
	if err != nil {
		return ""
	}
	return path
}

// findFd checks for fd (some distros install it as fdfind).
func findFd() string {
	if p := findBinary("fd"); p != "" {
		return p
	}
	return findBinary("fdfind")
}
