package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var (
	updateFlagSource  bool
	updateFlagRelease bool
	updateFlagTool    string
)

func init() {
	updateCmd.Flags().BoolVar(&updateFlagSource, "source", false, "Force build from local source (requires Go)")
	updateCmd.Flags().BoolVar(&updateFlagRelease, "release", false, "Force download from GitHub Releases")
	updateCmd.Flags().StringVar(&updateFlagTool, "tool", "", "Tool to update: gw (default) or gf")
	rootCmd.AddCommand(updateCmd)
}

// toolConfig holds the configuration for each updatable tool.
type toolConfig struct {
	name      string
	module    string
	sourceDir string // relative to grove root
	tagPrefix string
	aliases   []string
}

var tools = map[string]toolConfig{
	"gw": {
		name:      "gw",
		module:    "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go",
		sourceDir: "tools/grove-wrap-go",
		tagPrefix: "gw/v",
		aliases:   []string{"grove", "mycel", "mycelium"},
	},
	"gf": {
		name:      "gf",
		module:    "github.com/AutumnsGrove/Lattice/tools/grove-find-go",
		sourceDir: "tools/grove-find-go",
		tagPrefix: "gf/v",
		aliases:   nil,
	},
}

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Rebuild or reinstall gw (or gf) from source or GitHub Releases",
	Long: `Update rebuilds the tool from local source when run inside the Lattice
monorepo, or downloads the latest release from GitHub otherwise.

Use --source to force a source build, or --release to force a download.
Use --tool gf to update gf instead of gw.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		// Determine which tool to update
		toolName := "gw"
		if updateFlagTool != "" {
			toolName = updateFlagTool
		}
		tc, ok := tools[toolName]
		if !ok {
			return fmt.Errorf("unknown tool %q — use gw or gf", toolName)
		}

		// Validate mutually exclusive flags
		if updateFlagSource && updateFlagRelease {
			return fmt.Errorf("--source and --release are mutually exclusive")
		}

		installDir := filepath.Join(os.Getenv("HOME"), ".local", "bin")
		binaryPath := filepath.Join(installDir, tc.name)

		// Capture before-version
		beforeVersion := getToolVersion(binaryPath)

		// Determine update strategy
		strategy := detectStrategy(cfg, tc)
		if updateFlagSource {
			strategy = "source"
		}
		if updateFlagRelease {
			strategy = "release"
		}

		if cfg.JSONMode {
			return runUpdateJSON(tc, strategy, installDir, binaryPath, beforeVersion)
		}

		ui.PrintHeader(fmt.Sprintf("Updating %s", tc.name))
		ui.Info(fmt.Sprintf("Strategy: %s", strategy))
		fmt.Println()

		// Ensure install dir exists
		if err := os.MkdirAll(installDir, 0o755); err != nil {
			return fmt.Errorf("failed to create install directory: %w", err)
		}

		var err error
		switch strategy {
		case "source":
			err = updateFromSource(cfg, tc, installDir)
		case "release":
			err = updateFromRelease(tc, installDir)
		default:
			return fmt.Errorf("unknown strategy: %s", strategy)
		}

		if err != nil {
			ui.Error(fmt.Sprintf("Update failed: %s", err))
			return err
		}

		// Update aliases
		if len(tc.aliases) > 0 {
			for _, alias := range tc.aliases {
				aliasPath := filepath.Join(installDir, alias)
				_ = os.Remove(aliasPath)
				if err := os.Symlink(binaryPath, aliasPath); err != nil {
					ui.Warning(fmt.Sprintf("Failed to create alias %s: %s", alias, err))
				}
			}
			ui.Step(true, fmt.Sprintf("Aliases: %s", strings.Join(tc.aliases, ", ")))
		}

		// Capture after-version
		afterVersion := getToolVersion(binaryPath)

		// Show before/after
		fmt.Println()
		fmt.Print(ui.RenderInfoPanel(fmt.Sprintf("%s updated", tc.name), [][2]string{
			{"before", beforeVersion},
			{"after", afterVersion},
			{"path", binaryPath},
			{"strategy", strategy},
		}))

		return nil
	},
}

// detectStrategy decides whether to build from source or download a release.
func detectStrategy(cfg *config.Config, tc toolConfig) string {
	sourceDir := filepath.Join(cfg.GroveRoot, tc.sourceDir)
	if _, err := os.Stat(filepath.Join(sourceDir, "go.mod")); err == nil {
		return "source"
	}
	return "release"
}

// updateFromSource builds the tool from local source using go build with ldflags.
func updateFromSource(cfg *config.Config, tc toolConfig, installDir string) error {
	sourceDir := filepath.Join(cfg.GroveRoot, tc.sourceDir)

	// Check that source dir exists
	if _, err := os.Stat(filepath.Join(sourceDir, "go.mod")); err != nil {
		return fmt.Errorf("source directory not found: %s", sourceDir)
	}

	// Check that Go is available
	if _, ok := gwexec.Which("go"); !ok {
		return fmt.Errorf("Go not found — install Go or use --release to download a pre-built binary")
	}

	ui.Info("Building from source...")

	// Compute version from git tags
	version := computeVersion(cfg.GroveRoot, tc.tagPrefix)
	commitHash := computeCommitHash(cfg.GroveRoot)
	buildTime := time.Now().UTC().Format(time.RFC3339)

	// Build ldflags
	ldflags := fmt.Sprintf("-s -w -X %s/cmd.Version=%s -X %s/cmd.CommitHash=%s -X %s/cmd.BuildTime=%s",
		tc.module, version,
		tc.module, commitHash,
		tc.module, buildTime,
	)

	outputPath := filepath.Join(installDir, tc.name)

	// Run go build
	result, err := gwexec.RunInDirWithTimeout(
		2*time.Minute,
		sourceDir,
		"go", "build", "-ldflags", ldflags, "-o", outputPath, ".",
	)
	if err != nil {
		return fmt.Errorf("go build failed: %w", err)
	}
	if !result.OK() {
		return fmt.Errorf("go build failed:\n%s", result.Stderr)
	}

	ui.Step(true, fmt.Sprintf("Built %s (%s)", tc.name, version))
	return nil
}

// updateFromRelease downloads the latest release from GitHub.
func updateFromRelease(tc toolConfig, installDir string) error {
	// Check that gh is available
	if _, ok := gwexec.Which("gh"); !ok {
		return fmt.Errorf("gh CLI not found — install it or use --source to build from source")
	}

	ui.Info("Checking GitHub Releases...")

	// Find latest release tag
	result, err := gwexec.RunWithTimeout(15*time.Second, "gh", "release", "list",
		"--repo", "AutumnsGrove/Lattice",
		"--limit", "20",
	)
	if err != nil {
		return fmt.Errorf("failed to list releases: %w", err)
	}
	if !result.OK() {
		return fmt.Errorf("failed to list releases: %s", result.Stderr)
	}

	// Find the latest tag matching our prefix
	var tag string
	for _, line := range result.Lines() {
		fields := strings.Split(line, "\t")
		for _, field := range fields {
			if strings.HasPrefix(field, tc.tagPrefix) {
				tag = field
				break
			}
		}
		if tag != "" {
			break
		}
	}

	if tag == "" {
		return fmt.Errorf("no releases found matching %s*", tc.tagPrefix)
	}

	// Determine platform asset name
	asset := platformAsset(tc.name)
	ui.Info(fmt.Sprintf("Downloading %s from %s...", asset, tag))

	// Download to temp location
	tmpPath := filepath.Join(installDir, tc.name+".tmp")
	dlResult, err := gwexec.RunWithTimeout(60*time.Second, "gh", "release", "download", tag,
		"--repo", "AutumnsGrove/Lattice",
		"--pattern", asset,
		"--output", tmpPath,
		"--clobber",
	)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	if !dlResult.OK() {
		return fmt.Errorf("download failed: %s", dlResult.Stderr)
	}

	// Move into place
	destPath := filepath.Join(installDir, tc.name)
	if err := os.Rename(tmpPath, destPath); err != nil {
		return fmt.Errorf("failed to install binary: %w", err)
	}
	if err := os.Chmod(destPath, 0o755); err != nil {
		return fmt.Errorf("failed to set permissions: %w", err)
	}

	ui.Step(true, fmt.Sprintf("Downloaded %s (%s)", tc.name, tag))
	return nil
}

// platformAsset returns the platform-specific asset name for GitHub Releases.
func platformAsset(toolName string) string {
	osName := runtime.GOOS
	archName := runtime.GOARCH

	// Map Go arch names to our release naming convention
	switch archName {
	case "amd64":
		archName = "x86_64"
	}

	if osName == "windows" {
		return fmt.Sprintf("%s-%s-%s.exe", toolName, osName, archName)
	}
	return fmt.Sprintf("%s-%s-%s", toolName, osName, archName)
}

// computeVersion gets the version string from git tags.
func computeVersion(groveRoot, tagPrefix string) string {
	result, err := gwexec.RunInDir(groveRoot, "git", "describe", "--tags", "--match", tagPrefix+"*", "--always", "--dirty")
	if err != nil {
		return "dev"
	}
	if !result.OK() {
		return "dev"
	}
	return strings.TrimSpace(result.Stdout)
}

// computeCommitHash gets the current short commit hash.
func computeCommitHash(groveRoot string) string {
	result, err := gwexec.RunInDir(groveRoot, "git", "rev-parse", "--short", "HEAD")
	if err != nil {
		return "unknown"
	}
	if !result.OK() {
		return "unknown"
	}
	return strings.TrimSpace(result.Stdout)
}

// getToolVersion runs the tool's version command and returns the version string.
func getToolVersion(binaryPath string) string {
	if _, err := os.Stat(binaryPath); err != nil {
		return "(not installed)"
	}

	// Run the binary directly (outside allowlist — it's our own tool)
	result, err := gwexec.Run(filepath.Base(binaryPath), "version", "--json")
	if err != nil {
		return "(unknown)"
	}
	if !result.OK() {
		return "(unknown)"
	}

	// Extract version from JSON output: {"version":"...","runtime":"go"}
	out := strings.TrimSpace(result.Stdout)
	// Simple parse — avoid importing encoding/json for one field
	if idx := strings.Index(out, `"version":"`); idx != -1 {
		start := idx + len(`"version":"`)
		if end := strings.Index(out[start:], `"`); end != -1 {
			return out[start : start+end]
		}
	}
	return strings.TrimSpace(result.Stdout)
}

// runUpdateJSON runs the update and outputs JSON result.
func runUpdateJSON(tc toolConfig, strategy, installDir, binaryPath, beforeVersion string) error {
	cfg := config.Get()

	if err := os.MkdirAll(installDir, 0o755); err != nil {
		return fmt.Errorf("failed to create install directory: %w", err)
	}

	var err error
	switch strategy {
	case "source":
		err = updateFromSourceQuiet(cfg, tc, installDir)
	case "release":
		err = updateFromReleaseQuiet(tc, installDir)
	}

	afterVersion := getToolVersion(binaryPath)

	if err != nil {
		fmt.Printf(`{"tool":"%s","strategy":"%s","success":false,"error":"%s"}`+"\n",
			tc.name, strategy, err.Error())
		return err
	}

	// Update aliases silently
	for _, alias := range tc.aliases {
		aliasPath := filepath.Join(installDir, alias)
		_ = os.Remove(aliasPath)
		_ = os.Symlink(binaryPath, aliasPath)
	}

	fmt.Printf(`{"tool":"%s","strategy":"%s","success":true,"before":"%s","after":"%s"}`+"\n",
		tc.name, strategy, beforeVersion, afterVersion)
	return nil
}

// updateFromSourceQuiet builds without UI output (for JSON mode).
func updateFromSourceQuiet(cfg *config.Config, tc toolConfig, installDir string) error {
	sourceDir := filepath.Join(cfg.GroveRoot, tc.sourceDir)
	if _, err := os.Stat(filepath.Join(sourceDir, "go.mod")); err != nil {
		return fmt.Errorf("source directory not found: %s", sourceDir)
	}
	if _, ok := gwexec.Which("go"); !ok {
		return fmt.Errorf("Go not found")
	}

	version := computeVersion(cfg.GroveRoot, tc.tagPrefix)
	commitHash := computeCommitHash(cfg.GroveRoot)
	buildTime := time.Now().UTC().Format(time.RFC3339)

	ldflags := fmt.Sprintf("-s -w -X %s/cmd.Version=%s -X %s/cmd.CommitHash=%s -X %s/cmd.BuildTime=%s",
		tc.module, version, tc.module, commitHash, tc.module, buildTime)

	result, err := gwexec.RunInDirWithTimeout(2*time.Minute, sourceDir,
		"go", "build", "-ldflags", ldflags, "-o", filepath.Join(installDir, tc.name), ".")
	if err != nil {
		return err
	}
	if !result.OK() {
		return fmt.Errorf("build failed: %s", result.Stderr)
	}
	return nil
}

// updateFromReleaseQuiet downloads without UI output (for JSON mode).
func updateFromReleaseQuiet(tc toolConfig, installDir string) error {
	if _, ok := gwexec.Which("gh"); !ok {
		return fmt.Errorf("gh CLI not found")
	}

	result, err := gwexec.RunWithTimeout(15*time.Second, "gh", "release", "list",
		"--repo", "AutumnsGrove/Lattice", "--limit", "20")
	if err != nil {
		return err
	}
	if !result.OK() {
		return fmt.Errorf("failed to list releases: %s", result.Stderr)
	}

	var tag string
	for _, line := range result.Lines() {
		fields := strings.Split(line, "\t")
		for _, field := range fields {
			if strings.HasPrefix(field, tc.tagPrefix) {
				tag = field
				break
			}
		}
		if tag != "" {
			break
		}
	}
	if tag == "" {
		return fmt.Errorf("no releases found matching %s*", tc.tagPrefix)
	}

	asset := platformAsset(tc.name)
	tmpPath := filepath.Join(installDir, tc.name+".tmp")

	dlResult, err := gwexec.RunWithTimeout(60*time.Second, "gh", "release", "download", tag,
		"--repo", "AutumnsGrove/Lattice", "--pattern", asset,
		"--output", tmpPath, "--clobber")
	if err != nil {
		return err
	}
	if !dlResult.OK() {
		return fmt.Errorf("download failed: %s", dlResult.Stderr)
	}

	destPath := filepath.Join(installDir, tc.name)
	if err := os.Rename(tmpPath, destPath); err != nil {
		return err
	}
	return os.Chmod(destPath, 0o755)
}
