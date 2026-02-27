//go:build windows

package cmd

import (
	"os"
	"os/exec"
	"strconv"
)

// killProcessGroup terminates the process tree rooted at pid on Windows.
func killProcessGroup(pid int) {
	// Windows has no process groups like Unix. Use taskkill /T to kill
	// the process tree. Errors are ignored (process may have already exited).
	exec.Command("taskkill", "/F", "/T", "/PID", strconv.Itoa(pid)).Run()
}

// isProcessRunning checks if a process with the given PID exists.
func isProcessRunning(pid int) bool {
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	// On Windows, FindProcess always succeeds. Signal(0) doesn't work the
	// same way, so we check if we can open the process handle instead.
	err = process.Signal(os.Signal(nil))
	// If the error is "not supported" or nil, the process likely exists.
	// If it's "process already finished", it doesn't.
	return err == nil || err.Error() == "not supported by windows"
}
