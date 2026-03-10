package cmd

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/output"
)

var (
	updateFlagSource  bool
	updateFlagRelease bool
)

const (
	gfModule    = "github.com/AutumnsGrove/Lattice/tools/grove-find-go"
	gfSourceDir = "tools/grove-find-go"
	gfTagPrefix = "gf/v"
)

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Rebuild or reinstall gf from source or GitHub Releases",
	Long: `Update rebuilds gf from local source when run inside the Lattice
monorepo, or downloads the latest release from GitHub otherwise.

Use --source to force a source build, or --release to force a download.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if updateFlagSource && updateFlagRelease {
			return fmt.Errorf("--source and --release are mutually exclusive")
		}

		installDir := filepath.Join(os.Getenv("HOME"), ".local", "bin")
		binaryPath := filepath.Join(installDir, "gf")

		beforeVersion := getGfVersion(binaryPath)

		strategy := detectUpdateStrategy(cfg)
		if updateFlagSource {
			strategy = "source"
		}
		if updateFlagRelease {
			strategy = "release"
		}

		if cfg.JSONMode {
			return runUpdateJSON(cfg, strategy, installDir, binaryPath, beforeVersion)
		}

		output.PrintMajorHeader("Updating gf")
		output.Print(fmt.Sprintf("  Strategy: %s", strategy))

		if err := os.MkdirAll(installDir, 0o755); err != nil {
			return fmt.Errorf("failed to create install directory: %w", err)
		}

		var err error
		switch strategy {
		case "source":
			err = updateFromSource(cfg, installDir)
		case "release":
			err = updateFromRelease(installDir)
		default:
			return fmt.Errorf("unknown strategy: %s", strategy)
		}

		if err != nil {
			output.PrintError(fmt.Sprintf("Update failed: %s", err))
			return err
		}

		afterVersion := getGfVersion(binaryPath)

		fmt.Println()
		output.PrintSuccess(fmt.Sprintf("gf updated: %s → %s", beforeVersion, afterVersion))
		output.PrintDim(fmt.Sprintf("  path: %s", binaryPath))
		output.PrintDim(fmt.Sprintf("  strategy: %s", strategy))

		return nil
	},
}

func init() {
	updateCmd.Flags().BoolVar(&updateFlagSource, "source", false, "Force build from local source (requires Go)")
	updateCmd.Flags().BoolVar(&updateFlagRelease, "release", false, "Force download from GitHub Releases")
}

// detectUpdateStrategy decides whether to build from source or download a release.
func detectUpdateStrategy(cfg *config.Config) string {
	sourceDir := filepath.Join(cfg.GroveRoot, gfSourceDir)
	if _, err := os.Stat(filepath.Join(sourceDir, "go.mod")); err == nil {
		return "source"
	}
	return "release"
}

// updateFromSource builds gf from local source using go build with ldflags.
func updateFromSource(cfg *config.Config, installDir string) error {
	sourceDir := filepath.Join(cfg.GroveRoot, gfSourceDir)

	if _, err := os.Stat(filepath.Join(sourceDir, "go.mod")); err != nil {
		return fmt.Errorf("source directory not found: %s", sourceDir)
	}

	if _, err := exec.LookPath("go"); err != nil {
		return fmt.Errorf("Go not found — install Go or use --release to download a pre-built binary")
	}

	output.Print("  Building from source...")

	version := computeGfVersion(cfg.GroveRoot)
	commitHash := computeGfCommitHash(cfg.GroveRoot)
	buildTime := time.Now().UTC().Format(time.RFC3339)

	ldflags := fmt.Sprintf("-s -w -X %s/cmd.Version=%s -X %s/cmd.CommitHash=%s -X %s/cmd.BuildTime=%s",
		gfModule, version,
		gfModule, commitHash,
		gfModule, buildTime,
	)

	outputPath := filepath.Join(installDir, "gf")

	cmd := exec.Command("go", "build", "-ldflags", ldflags, "-o", outputPath, ".")
	cmd.Dir = sourceDir
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("go build failed:\n%s", stderr.String())
	}

	output.PrintSuccess(fmt.Sprintf("Built gf (%s)", version))
	return nil
}

// updateFromRelease downloads the latest release from GitHub.
func updateFromRelease(installDir string) error {
	ghPath, err := exec.LookPath("gh")
	if err != nil {
		return fmt.Errorf("gh CLI not found — install it or use --source to build from source")
	}

	output.Print("  Checking GitHub Releases...")

	listCmd := exec.Command(ghPath, "release", "list",
		"--repo", "AutumnsGrove/Lattice",
		"--limit", "20",
	)
	var listOut bytes.Buffer
	listCmd.Stdout = &listOut
	if err := listCmd.Run(); err != nil {
		return fmt.Errorf("failed to list releases: %w", err)
	}

	var tag string
	for _, line := range strings.Split(listOut.String(), "\n") {
		fields := strings.Split(line, "\t")
		for _, field := range fields {
			if strings.HasPrefix(field, gfTagPrefix) {
				tag = field
				break
			}
		}
		if tag != "" {
			break
		}
	}

	if tag == "" {
		return fmt.Errorf("no releases found matching %s*", gfTagPrefix)
	}

	asset := platformAsset("gf")
	output.Print(fmt.Sprintf("  Downloading %s from %s...", asset, tag))

	tmpPath := filepath.Join(installDir, "gf.tmp")
	dlCmd := exec.Command(ghPath, "release", "download", tag,
		"--repo", "AutumnsGrove/Lattice",
		"--pattern", asset,
		"--output", tmpPath,
		"--clobber",
	)
	var dlErr bytes.Buffer
	dlCmd.Stderr = &dlErr
	if err := dlCmd.Run(); err != nil {
		return fmt.Errorf("download failed: %s", dlErr.String())
	}

	destPath := filepath.Join(installDir, "gf")
	if err := os.Rename(tmpPath, destPath); err != nil {
		return fmt.Errorf("failed to install binary: %w", err)
	}
	if err := os.Chmod(destPath, 0o755); err != nil {
		return fmt.Errorf("failed to set permissions: %w", err)
	}

	output.PrintSuccess(fmt.Sprintf("Downloaded gf (%s)", tag))
	return nil
}

// platformAsset returns the platform-specific asset name for GitHub Releases.
func platformAsset(toolName string) string {
	osName := runtime.GOOS
	archName := runtime.GOARCH
	if archName == "amd64" {
		archName = "x86_64"
	}
	if osName == "windows" {
		return fmt.Sprintf("%s-%s-%s.exe", toolName, osName, archName)
	}
	return fmt.Sprintf("%s-%s-%s", toolName, osName, archName)
}

// computeGfVersion gets the version string from git tags.
func computeGfVersion(groveRoot string) string {
	cmd := exec.Command("git", "describe", "--tags", "--match", gfTagPrefix+"*", "--always", "--dirty")
	cmd.Dir = groveRoot
	out, err := cmd.Output()
	if err != nil {
		return "dev"
	}
	return strings.TrimSpace(string(out))
}

// computeGfCommitHash gets the current short commit hash.
func computeGfCommitHash(groveRoot string) string {
	cmd := exec.Command("git", "rev-parse", "--short", "HEAD")
	cmd.Dir = groveRoot
	out, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(out))
}

// getGfVersion runs gf version --json and extracts the version string.
func getGfVersion(binaryPath string) string {
	if _, err := os.Stat(binaryPath); err != nil {
		return "(not installed)"
	}

	cmd := exec.Command(binaryPath, "version", "--json")
	out, err := cmd.Output()
	if err != nil {
		return "(unknown)"
	}

	s := strings.TrimSpace(string(out))
	if idx := strings.Index(s, `"version":"`); idx != -1 {
		start := idx + len(`"version":"`)
		if end := strings.Index(s[start:], `"`); end != -1 {
			return s[start : start+end]
		}
	}
	return s
}

// runUpdateJSON runs the update and outputs JSON result.
func runUpdateJSON(cfg *config.Config, strategy, installDir, binaryPath, beforeVersion string) error {
	if err := os.MkdirAll(installDir, 0o755); err != nil {
		return fmt.Errorf("failed to create install directory: %w", err)
	}

	var err error
	switch strategy {
	case "source":
		err = updateFromSourceQuiet(cfg, installDir)
	case "release":
		err = updateFromReleaseQuiet(installDir)
	}

	afterVersion := getGfVersion(binaryPath)

	if err != nil {
		fmt.Printf(`{"tool":"gf","strategy":"%s","success":false,"error":"%s"}`+"\n",
			strategy, err.Error())
		return err
	}

	fmt.Printf(`{"tool":"gf","strategy":"%s","success":true,"before":"%s","after":"%s"}`+"\n",
		strategy, beforeVersion, afterVersion)
	return nil
}

// updateFromSourceQuiet builds without UI output (for JSON mode).
func updateFromSourceQuiet(cfg *config.Config, installDir string) error {
	sourceDir := filepath.Join(cfg.GroveRoot, gfSourceDir)
	if _, err := os.Stat(filepath.Join(sourceDir, "go.mod")); err != nil {
		return fmt.Errorf("source directory not found: %s", sourceDir)
	}
	if _, err := exec.LookPath("go"); err != nil {
		return fmt.Errorf("Go not found")
	}

	version := computeGfVersion(cfg.GroveRoot)
	commitHash := computeGfCommitHash(cfg.GroveRoot)
	buildTime := time.Now().UTC().Format(time.RFC3339)

	ldflags := fmt.Sprintf("-s -w -X %s/cmd.Version=%s -X %s/cmd.CommitHash=%s -X %s/cmd.BuildTime=%s",
		gfModule, version, gfModule, commitHash, gfModule, buildTime)

	cmd := exec.Command("go", "build", "-ldflags", ldflags, "-o", filepath.Join(installDir, "gf"), ".")
	cmd.Dir = sourceDir
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("build failed: %s", stderr.String())
	}
	return nil
}

// updateFromReleaseQuiet downloads without UI output (for JSON mode).
func updateFromReleaseQuiet(installDir string) error {
	ghPath, err := exec.LookPath("gh")
	if err != nil {
		return fmt.Errorf("gh CLI not found")
	}

	listCmd := exec.Command(ghPath, "release", "list",
		"--repo", "AutumnsGrove/Lattice", "--limit", "20")
	var listOut bytes.Buffer
	listCmd.Stdout = &listOut
	if err := listCmd.Run(); err != nil {
		return fmt.Errorf("failed to list releases: %w", err)
	}

	var tag string
	for _, line := range strings.Split(listOut.String(), "\n") {
		fields := strings.Split(line, "\t")
		for _, field := range fields {
			if strings.HasPrefix(field, gfTagPrefix) {
				tag = field
				break
			}
		}
		if tag != "" {
			break
		}
	}
	if tag == "" {
		return fmt.Errorf("no releases found matching %s*", gfTagPrefix)
	}

	asset := platformAsset("gf")
	tmpPath := filepath.Join(installDir, "gf.tmp")

	dlCmd := exec.Command(ghPath, "release", "download", tag,
		"--repo", "AutumnsGrove/Lattice", "--pattern", asset,
		"--output", tmpPath, "--clobber")
	if err := dlCmd.Run(); err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	destPath := filepath.Join(installDir, "gf")
	if err := os.Rename(tmpPath, destPath); err != nil {
		return err
	}
	return os.Chmod(destPath, 0o755)
}
