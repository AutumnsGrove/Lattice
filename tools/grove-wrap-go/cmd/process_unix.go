//go:build !windows

package cmd

import (
	"os"
	"syscall"
)

// killProcessGroup sends SIGTERM to the process group led by pid.
func killProcessGroup(pid int) {
	syscall.Kill(-pid, syscall.SIGTERM)
}

// isProcessRunning checks if a process with the given PID exists.
func isProcessRunning(pid int) bool {
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	return process.Signal(syscall.Signal(0)) == nil
}
