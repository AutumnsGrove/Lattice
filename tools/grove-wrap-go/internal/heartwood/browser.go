package heartwood

import (
	"fmt"
	"os/exec"
	"runtime"
)

// OpenBrowser opens the given URL in the user's default browser.
// Fails gracefully in headless environments — returns an error
// instead of panicking so callers can fall back to manual instructions.
func OpenBrowser(url string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to open browser: %w", err)
	}

	// Don't wait for the browser process to exit
	go func() { _ = cmd.Wait() }()

	return nil
}
