package cmd

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// ── Flag variables ────────────────────────────────────────────────────

var (
	gitBisectBadRef  string
	gitBisectGoodRef string
)

// ── Regex patterns for parsing git bisect output ──────────────────────

var (
	// "Bisecting: 3 revisions left to test after this (roughly 2 steps)"
	reBisecting = regexp.MustCompile(`Bisecting: (\d+) revisions? left to test.*\(roughly (\d+) steps?\)`)
	// "abc1234def5678... is the first bad commit"
	reFirstBad = regexp.MustCompile(`^([0-9a-f]+)\s+is the first bad commit`)
)

// ── Parent command ────────────────────────────────────────────────────

var gitBisectCmd = &cobra.Command{
	Use:   "bisect",
	Short: "Find the commit that introduced a bug",
	Long: `Binary search through commits to find which one introduced a bug.

Interactive mode (humans): gw git bisect --write
  Guided loop that walks you through the bisect process.

Discrete subcommands (agents): start, good, bad, skip, reset, status, log, run`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		// Non-interactive: show status
		if !cfg.IsInteractive() {
			return bisectShowStatus()
		}

		// Interactive: guided bisect loop
		if err := requireSafety("bisect_start"); err != nil {
			return err
		}
		return bisectInteractiveLoop()
	},
}

// ── bisect start ──────────────────────────────────────────────────────

var gitBisectStartCmd = &cobra.Command{
	Use:   "start [bad] [good]",
	Short: "Start bisect with bad and good refs",
	Long:  "Start a bisect session. Defaults: bad=HEAD, good must be provided.",
	Args:  cobra.MaximumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("bisect_start"); err != nil {
			return err
		}

		bad := "HEAD"
		good := ""

		// Flags take priority over positional args
		if gitBisectBadRef != "" {
			bad = gitBisectBadRef
		} else if len(args) >= 1 {
			bad = args[0]
		}
		if gitBisectGoodRef != "" {
			good = gitBisectGoodRef
		} else if len(args) >= 2 {
			good = args[1]
		}

		if good == "" {
			return fmt.Errorf("a good ref is required: gw git bisect start <bad> <good>")
		}

		gitArgs := []string{"bisect", "start", bad, good}
		result, err := gwexec.Git(gitArgs...)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("bisect start: %s", strings.TrimSpace(result.Stderr))
		}

		cfg := config.Get()
		if cfg.JSONMode {
			return printBisectJSON(result.Stdout)
		}

		// Show info panel with range
		info, hash, msg := bisectCurrentInfo()
		pairs := [][2]string{
			{"status", "active"},
			{"bad", bad},
			{"good", good},
		}
		if hash != "" {
			pairs = append(pairs, [2]string{"commit", hash + " " + msg})
		}
		if info != "" {
			pairs = append(pairs, [2]string{"info", info})
		}
		fmt.Print(ui.RenderInfoPanel("gw git bisect", pairs))
		ui.Hint("  Test this commit, then run: gw git bisect good/bad --write")
		return nil
	},
}

// ── bisect good / bad / skip ──────────────────────────────────────────

var gitBisectGoodCmd = &cobra.Command{
	Use:   "good [ref]",
	Short: "Mark current or given commit as good",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("bisect_good"); err != nil {
			return err
		}
		ref := ""
		if len(args) > 0 {
			ref = args[0]
		}
		return runBisectMark("good", ref)
	},
}

var gitBisectBadCmd = &cobra.Command{
	Use:   "bad [ref]",
	Short: "Mark current or given commit as bad",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("bisect_bad"); err != nil {
			return err
		}
		ref := ""
		if len(args) > 0 {
			ref = args[0]
		}
		return runBisectMark("bad", ref)
	},
}

var gitBisectSkipCmd = &cobra.Command{
	Use:   "skip [ref]",
	Short: "Skip untestable commit",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("bisect_skip"); err != nil {
			return err
		}
		ref := ""
		if len(args) > 0 {
			ref = args[0]
		}
		return runBisectMark("skip", ref)
	},
}

// ── bisect reset ──────────────────────────────────────────────────────

var gitBisectResetCmd = &cobra.Command{
	Use:   "reset",
	Short: "End bisect and return to original branch",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("bisect_reset"); err != nil {
			return err
		}

		result, err := gwexec.Git("bisect", "reset")
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("bisect reset: %s", strings.TrimSpace(result.Stderr))
		}

		cfg := config.Get()
		if cfg.JSONMode {
			return printJSON(map[string]any{"active": false, "reset": true})
		}

		ui.Success("Bisect session ended")
		return nil
	},
}

// ── bisect status (READ) ─────────────────────────────────────────────

var gitBisectStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current bisect state",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		// READ tier — no safety check needed
		return bisectShowStatus()
	},
}

// ── bisect log (READ) ────────────────────────────────────────────────

var gitBisectLogCmd = &cobra.Command{
	Use:   "log",
	Short: "Show bisect decision log",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		// READ tier — no safety check needed
		result, err := gwexec.Git("bisect", "log")
		if err != nil {
			return err
		}

		cfg := config.Get()
		if cfg.JSONMode {
			return printJSON(map[string]any{
				"active": result.OK(),
				"log":    strings.TrimSpace(result.Stdout),
			})
		}

		if !result.OK() {
			ui.Info("No bisect session active")
			return nil
		}

		fmt.Print(ui.RenderPanel("Bisect Log", strings.TrimSpace(result.Stdout)))
		return nil
	},
}

// ── bisect run (DANGEROUS) ───────────────────────────────────────────

var gitBisectRunCmd = &cobra.Command{
	Use:   "run -- <command>",
	Short: "Automated bisect with a test command",
	Long: `Run a command for each bisect step automatically.
The command after -- is executed by git bisect run.
Requires --write --force (DANGEROUS tier, blocked in agent mode).

Example: gw git bisect run --write --force --good v1.0 -- bun test`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		if err := requireSafety("bisect_run"); err != nil {
			return err
		}

		if len(args) == 0 {
			return fmt.Errorf("a test command is required after --\nExample: gw git bisect run --write --force -- bun test")
		}

		// Auto-start bisect if --good/--bad provided and no active session
		if !isBisectActive() && gitBisectGoodRef != "" {
			bad := gitBisectBadRef
			if bad == "" {
				bad = "HEAD"
			}
			startResult, err := gwexec.Git("bisect", "start", bad, gitBisectGoodRef)
			if err != nil {
				return err
			}
			if !startResult.OK() {
				return fmt.Errorf("bisect start: %s", strings.TrimSpace(startResult.Stderr))
			}
		} else if !isBisectActive() {
			return fmt.Errorf("no active bisect session — run gw git bisect start first, or pass --good and --bad")
		}

		// Stream: git bisect run <args...>
		gitArgs := append([]string{"bisect", "run"}, args...)
		exitCode, err := gwexec.RunStreaming("git", gitArgs...)
		if err != nil {
			return err
		}
		if exitCode != 0 {
			return fmt.Errorf("bisect run exited with code %d", exitCode)
		}

		ui.Success("Bisect run complete")
		return nil
	},
}

// ── Helpers ───────────────────────────────────────────────────────────

// isBisectActive checks if a bisect session is active by running git bisect log.
func isBisectActive() bool {
	result, err := gwexec.Git("bisect", "log")
	return err == nil && result.OK() && strings.TrimSpace(result.Stdout) != ""
}

// parseBisectOutput extracts steps remaining and "first bad commit" from git output.
func parseBisectOutput(stdout string) (stepsLeft string, found bool, foundHash string) {
	// Check for completion: "<hash> is the first bad commit"
	for _, line := range strings.Split(stdout, "\n") {
		if m := reFirstBad.FindStringSubmatch(strings.TrimSpace(line)); len(m) > 1 {
			return "", true, m[1]
		}
	}

	// Check for bisecting progress
	if m := reBisecting.FindStringSubmatch(stdout); len(m) > 2 {
		return fmt.Sprintf("~%s steps remaining", m[2]), false, ""
	}

	return "", false, ""
}

// bisectCurrentInfo returns info about the current bisect commit.
// Returns (bisectInfo, hash, message).
func bisectCurrentInfo() (info string, hash string, message string) {
	// Get the current HEAD info
	result, err := gwexec.Git("log", "-1", "--format=%h %s")
	if err != nil || !result.OK() {
		return "", "", ""
	}
	line := strings.TrimSpace(result.Stdout)
	parts := strings.SplitN(line, " ", 2)
	if len(parts) == 2 {
		hash = parts[0]
		message = parts[1]
	} else if len(parts) == 1 {
		hash = parts[0]
	}

	// Try to get bisect progress from log
	logResult, err := gwexec.Git("bisect", "log")
	if err == nil && logResult.OK() {
		info, _, _ = parseBisectOutput(logResult.Stdout)
	}

	return info, hash, message
}

// runBisectMark runs git bisect good/bad/skip and formats the output.
func runBisectMark(markType, ref string) error {
	gitArgs := []string{"bisect", markType}
	if ref != "" {
		gitArgs = append(gitArgs, ref)
	}

	result, err := gwexec.Git(gitArgs...)
	if err != nil {
		return err
	}
	if !result.OK() {
		return fmt.Errorf("bisect %s: %s", markType, strings.TrimSpace(result.Stderr))
	}

	cfg := config.Get()
	stdout := result.Stdout

	// Check if bisect found the culprit
	stepsLeft, found, foundHash := parseBisectOutput(stdout)

	if cfg.JSONMode {
		return printBisectJSON(stdout)
	}

	if found {
		// Get details of the bad commit
		showResult, _ := gwexec.Git("log", "-1", "--format=%h %s%n%an <%ae>", foundHash)
		showLines := strings.Split(strings.TrimSpace(showResult.Stdout), "\n")
		body := foundHash
		if len(showLines) >= 1 {
			body = showLines[0]
		}
		if len(showLines) >= 2 {
			body += "\nAuthor: " + showLines[1]
		}
		body += "\nRun: gw git show " + foundHash
		fmt.Print(ui.RenderSuccessPanel("Bisect Complete", body))

		// Auto-reset
		gwexec.Git("bisect", "reset")
		ui.Hint("  Bisect session has been reset.")
		return nil
	}

	// Normal mark
	hash := ""
	if ref != "" {
		hash = ref
	} else {
		// Get current HEAD hash
		r, _ := gwexec.Git("rev-parse", "--short", "HEAD")
		if r != nil && r.OK() {
			hash = strings.TrimSpace(r.Stdout)
		}
	}

	label := fmt.Sprintf("Marked %s: %s", markType, hash)
	ui.Action("Marked "+markType, hash)
	if stepsLeft != "" {
		ui.Hint("  " + stepsLeft)
	}
	ui.Hint("  Next: test this commit, then run gw git bisect good/bad --write")
	_ = label // suppress unused

	return nil
}

// bisectShowStatus shows the current bisect state.
func bisectShowStatus() error {
	cfg := config.Get()

	if !isBisectActive() {
		if cfg.JSONMode {
			return printJSON(map[string]any{"active": false})
		}
		ui.Info("No bisect session active")
		ui.Hint("  Start one: gw git bisect start <bad> <good> --write")
		return nil
	}

	_, hash, msg := bisectCurrentInfo()
	stepsLeft, found, foundHash := "", false, ""

	logResult, _ := gwexec.Git("bisect", "log")
	if logResult != nil && logResult.OK() {
		stepsLeft, found, foundHash = parseBisectOutput(logResult.Stdout)
	}

	if cfg.JSONMode {
		data := map[string]any{
			"active":         true,
			"current_commit": hash,
		}
		if stepsLeft != "" {
			data["steps_remaining"] = stepsLeft
		}
		if found {
			data["found"] = true
			data["first_bad_commit"] = foundHash
		}
		return printJSON(data)
	}

	pairs := [][2]string{
		{"status", "active"},
	}
	if hash != "" {
		commitStr := hash
		if msg != "" {
			commitStr = hash + " " + msg
		}
		pairs = append(pairs, [2]string{"commit", commitStr})
	}
	if stepsLeft != "" {
		pairs = append(pairs, [2]string{"step", stepsLeft})
	}
	if found {
		pairs = append(pairs, [2]string{"found", foundHash})
	}

	fmt.Print(ui.RenderInfoPanel("gw git bisect", pairs))
	return nil
}

// printBisectJSON outputs bisect state as JSON for agent consumers.
func printBisectJSON(stdout string) error {
	stepsLeft, found, foundHash := parseBisectOutput(stdout)
	_, hash, _ := bisectCurrentInfo()

	data := map[string]any{
		"active":         true,
		"current_commit": hash,
	}
	if stepsLeft != "" {
		data["steps_remaining"] = stepsLeft
	}
	if found {
		data["found"] = true
		data["first_bad_commit"] = foundHash
	}
	return printJSON(data)
}

// bisectInteractiveLoop runs a guided interactive bisect session.
func bisectInteractiveLoop() error {
	scanner := bufio.NewScanner(os.Stdin)

	// Step 1: Check for existing session
	if isBisectActive() {
		ui.Info("Resuming existing bisect session")
	} else {
		// Step 2: Gather refs
		bad := gitBisectBadRef
		good := gitBisectGoodRef

		if bad == "" {
			bad = "HEAD"
		}

		if good == "" {
			fmt.Print("Good ref (last known working commit): ")
			if !scanner.Scan() {
				return fmt.Errorf("cancelled")
			}
			good = strings.TrimSpace(scanner.Text())
			if good == "" {
				return fmt.Errorf("a good ref is required")
			}
		}

		// Step 3: Start
		result, err := gwexec.Git("bisect", "start", bad, good)
		if err != nil {
			return err
		}
		if !result.OK() {
			return fmt.Errorf("bisect start: %s", strings.TrimSpace(result.Stderr))
		}

		info, hash, msg := bisectCurrentInfo()
		pairs := [][2]string{
			{"status", "active"},
			{"bad", bad},
			{"good", good},
		}
		if hash != "" {
			pairs = append(pairs, [2]string{"commit", hash + " " + msg})
		}
		if info != "" {
			pairs = append(pairs, [2]string{"info", info})
		}
		fmt.Print(ui.RenderInfoPanel("gw git bisect", pairs))
	}

	// Step 4: Loop
	for {
		info, hash, msg := bisectCurrentInfo()
		if hash != "" {
			fmt.Printf("\nCurrent: %s %s\n", hash, msg)
		}
		if info != "" {
			ui.Hint("  " + info)
		}

		fmt.Print("\nType good, bad, skip, or reset: ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(strings.ToLower(scanner.Text()))
		switch input {
		case "good", "bad", "skip":
			err := runBisectMark(input, "")
			if err != nil {
				ui.Error(err.Error())
				continue
			}
			// Check if bisect completed (runBisectMark handles auto-reset)
			if !isBisectActive() {
				return nil
			}
		case "reset":
			result, err := gwexec.Git("bisect", "reset")
			if err != nil {
				return err
			}
			if !result.OK() {
				return fmt.Errorf("bisect reset: %s", strings.TrimSpace(result.Stderr))
			}
			ui.Success("Bisect session ended")
			return nil
		case "":
			continue
		default:
			ui.Warning("Unknown command: " + input)
			ui.Hint("  Valid commands: good, bad, skip, reset")
		}
	}

	return nil
}

// ── Registration ──────────────────────────────────────────────────────

func init() {
	// Flags on start
	gitBisectStartCmd.Flags().StringVar(&gitBisectBadRef, "bad", "", "Bad ref (default HEAD)")
	gitBisectStartCmd.Flags().StringVar(&gitBisectGoodRef, "good", "", "Good ref")

	// Flags on parent (for interactive mode)
	gitBisectCmd.Flags().StringVar(&gitBisectBadRef, "bad", "", "Bad ref (default HEAD)")
	gitBisectCmd.Flags().StringVar(&gitBisectGoodRef, "good", "", "Good ref")

	// Flags on run (for auto-start)
	gitBisectRunCmd.Flags().StringVar(&gitBisectBadRef, "bad", "", "Bad ref (default HEAD)")
	gitBisectRunCmd.Flags().StringVar(&gitBisectGoodRef, "good", "", "Good ref")

	// Add subcommands
	gitBisectCmd.AddCommand(gitBisectStartCmd)
	gitBisectCmd.AddCommand(gitBisectGoodCmd)
	gitBisectCmd.AddCommand(gitBisectBadCmd)
	gitBisectCmd.AddCommand(gitBisectSkipCmd)
	gitBisectCmd.AddCommand(gitBisectResetCmd)
	gitBisectCmd.AddCommand(gitBisectStatusCmd)
	gitBisectCmd.AddCommand(gitBisectLogCmd)
	gitBisectCmd.AddCommand(gitBisectRunCmd)

	gitCmd.AddCommand(gitBisectCmd)
}
