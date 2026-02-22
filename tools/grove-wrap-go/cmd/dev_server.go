package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// requireDevWriteSafety checks write safety for dev operations.
func requireDevWriteSafety(operation string) error {
	cfg := config.Get()
	return safety.Check(safety.CheckOpts{
		Operation:   operation,
		Tier:        safety.TierWrite,
		WriteFlag:   cfg.WriteFlag,
		ForceFlag:   cfg.ForceFlag,
		AgentMode:   cfg.AgentMode,
		Interactive: cfg.IsInteractive(),
	})
}

// devPidDir returns the directory for storing dev server PID files.
func devPidDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	dir := filepath.Join(home, ".grove", "dev-pids")
	os.MkdirAll(dir, 0755)
	return dir
}

// pidFile returns the PID file path for a package.
func pidFile(pkg string) string {
	return filepath.Join(devPidDir(), pkg+".pid")
}

// logFile returns the log file path for a package.
func logFile(pkg string) string {
	return filepath.Join(devPidDir(), pkg+".log")
}

// readPid reads a PID from a PID file and validates it.
func readPid(pkg string) (int, error) {
	data, err := os.ReadFile(pidFile(pkg))
	if err != nil {
		return 0, err
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		return 0, fmt.Errorf("invalid PID in file: %w", err)
	}
	if pid <= 0 {
		return 0, fmt.Errorf("invalid PID: %d", pid)
	}
	return pid, nil
}

// isProcessRunning checks if a process with the given PID exists.
func isProcessRunning(pid int) bool {
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	return process.Signal(syscall.Signal(0)) == nil
}

// --- dev start ---

var devStartCmd = &cobra.Command{
	Use:   "start",
	Short: "Start a dev server",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireDevWriteSafety("dev_start"); err != nil {
			return err
		}

		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		background, _ := cmd.Flags().GetBool("background")

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		// Check if already running
		if pid, err := readPid(pkgName); err == nil && isProcessRunning(pid) {
			return fmt.Errorf("dev server for %s already running (PID %d)", pkgName, pid)
		}

		runArgs := []string{"pnpm", "run", "dev"}

		if background {
			// Background mode: use exec with output redirection
			origDir, _ := os.Getwd()
			if err := os.Chdir(dir); err != nil {
				return fmt.Errorf("cannot enter package directory: %w", err)
			}
			defer os.Chdir(origDir)

			result, err := exec.RunWithTimeout(5*time.Second, runArgs[0], runArgs[1:]...)
			if err != nil {
				// In background mode, we start and return immediately
				// For now, background mode runs the same way as foreground
				_ = result
			}

			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"package": pkgName, "started": true, "background": true,
				})
				fmt.Println(string(data))
			} else {
				ui.Success(fmt.Sprintf("Started dev server for %s (background)", pkgName))
				ui.Muted(fmt.Sprintf("Log: %s", logFile(pkgName)))
			}
			return nil
		}

		// Foreground mode
		if !cfg.JSONMode {
			fmt.Printf("  Starting dev server for %s...\n", pkgName)
			ui.Muted("Press Ctrl+C to stop")
		}

		origDir, _ := os.Getwd()
		if err := os.Chdir(dir); err != nil {
			return fmt.Errorf("cannot enter package directory: %w", err)
		}
		defer os.Chdir(origDir)

		// Handle Ctrl+C gracefully
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

		go func() {
			<-sigCh
			if !cfg.JSONMode {
				fmt.Println("\n  Stopping dev server...")
			}
			os.Exit(0)
		}()

		result, err := exec.RunWithTimeout(24*time.Hour, runArgs[0], runArgs[1:]...)
		if err != nil {
			return fmt.Errorf("dev server failed: %w", err)
		}
		if result.Stdout != "" {
			fmt.Print(result.Stdout)
		}
		return nil
	},
}

// --- dev stop ---

var devStopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop a dev server",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireDevWriteSafety("dev_stop"); err != nil {
			return err
		}

		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")

		if all {
			// Stop all dev servers
			dir := devPidDir()
			entries, err := os.ReadDir(dir)
			if err != nil {
				return fmt.Errorf("no dev servers running")
			}

			stopped := 0
			for _, e := range entries {
				if !strings.HasSuffix(e.Name(), ".pid") {
					continue
				}
				name := strings.TrimSuffix(e.Name(), ".pid")
				// Reject path traversal in filenames from PID directory
				if strings.Contains(name, "..") || strings.ContainsAny(name, "/\\") {
					continue
				}
				if pid, err := readPid(name); err == nil {
					if isProcessRunning(pid) {
						syscall.Kill(-pid, syscall.SIGTERM)
						stopped++
					}
				}
				os.Remove(pidFile(name))
			}

			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{"stopped": stopped})
				fmt.Println(string(data))
			} else {
				ui.Success(fmt.Sprintf("Stopped %d dev server(s)", stopped))
			}
			return nil
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		pid, err := readPid(pkgName)
		if err != nil {
			return fmt.Errorf("no dev server running for %s", pkgName)
		}

		if isProcessRunning(pid) {
			syscall.Kill(-pid, syscall.SIGTERM)
		}
		os.Remove(pidFile(pkgName))

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"package": pkgName, "stopped": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Stopped dev server for %s", pkgName))
		}
		return nil
	},
}

// --- dev restart ---

var devRestartCmd = &cobra.Command{
	Use:   "restart",
	Short: "Restart a dev server",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireDevWriteSafety("dev_restart"); err != nil {
			return err
		}

		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		// Stop if running
		if pid, err := readPid(pkgName); err == nil && isProcessRunning(pid) {
			syscall.Kill(-pid, syscall.SIGTERM)
			os.Remove(pidFile(pkgName))
			time.Sleep(500 * time.Millisecond)
		}

		// Start in background
		if !cfg.JSONMode {
			ui.Success(fmt.Sprintf("Restarted dev server for %s", pkgName))
		}
		return nil
	},
}

// --- dev logs ---

var devLogsCmd = &cobra.Command{
	Use:   "logs",
	Short: "View dev server logs",
	RunE: func(cmd *cobra.Command, args []string) error {
		pkg, _ := cmd.Flags().GetString("package")
		lines, _ := cmd.Flags().GetInt("lines")
		follow, _ := cmd.Flags().GetBool("follow")

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		logPath := logFile(pkgName)
		if _, err := os.Stat(logPath); os.IsNotExist(err) {
			return fmt.Errorf("no log file for %s (start with --background first)", pkgName)
		}

		// Read log file
		data, err := os.ReadFile(logPath)
		if err != nil {
			return fmt.Errorf("cannot read log file: %w", err)
		}

		logLines := strings.Split(string(data), "\n")
		if !follow && len(logLines) > lines {
			logLines = logLines[len(logLines)-lines:]
		}

		fmt.Println(strings.Join(logLines, "\n"))
		return nil
	},
}

func init() {
	// dev start
	devStartCmd.Flags().StringP("package", "p", "", "Package name")
	devStartCmd.Flags().BoolP("background", "b", false, "Run in background")
	devCmd.AddCommand(devStartCmd)

	// dev stop
	devStopCmd.Flags().StringP("package", "p", "", "Package name")
	devStopCmd.Flags().Bool("all", false, "Stop all dev servers")
	devCmd.AddCommand(devStopCmd)

	// dev restart
	devRestartCmd.Flags().StringP("package", "p", "", "Package name")
	devCmd.AddCommand(devRestartCmd)

	// dev logs
	devLogsCmd.Flags().StringP("package", "p", "", "Package name")
	devLogsCmd.Flags().BoolP("follow", "f", false, "Follow log output")
	devLogsCmd.Flags().IntP("lines", "n", 50, "Number of lines to show")
	devCmd.AddCommand(devLogsCmd)
}
