package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// Registry URLs for the npm publish workflow.
const (
	githubRegistry = "https://npm.pkg.github.com"
	npmRegistry    = "https://registry.npmjs.org"
)

// publishCmd is the parent command for package publishing.
var publishCmd = &cobra.Command{
	Use:   "publish",
	Short: "Publish packages and tools",
	Long:  "Publish npm packages, create GitHub Releases, or release gw/gf tool binaries.",
}

// --- publish lattice ---

// publishLatticeCmd is the parent for Lattice package publishing.
var publishLatticeCmd = &cobra.Command{
	Use:   "lattice",
	Short: "Publish @autumnsgrove/lattice (npm, GitHub Release, or both)",
	Long: `Publish the Lattice engine package. Subcommands:
  npm    — Publish to npm registry
  github — Create a GitHub Release with LLM-generated summary
  both   — Publish to npm AND create GitHub Release in one flow`,
}

// publishNpmCmd publishes the package to npm with registry swap.
var publishNpmCmd = &cobra.Command{
	Use:   "npm",
	Short: "Publish a package to npm with registry swap",
	Long: `Automate the npm publish workflow:
  1. Bump version in package.json
  2. Swap publishConfig to npm registry
  3. Build the package
  4. Publish to npm
  5. Swap publishConfig BACK to GitHub Packages
  6. Commit version bump and push`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		bump, _ := cmd.Flags().GetString("bump")
		explicitVersion, _ := cmd.Flags().GetString("version")
		packageName, _ := cmd.Flags().GetString("package")
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		skipBuild, _ := cmd.Flags().GetBool("skip-build")
		skipCommit, _ := cmd.Flags().GetBool("skip-commit")
		tokenFlag, _ := cmd.Flags().GetString("token")
		tagFlag, _ := cmd.Flags().GetString("tag")

		// Resolve npm auth token: --token flag → NPM_TOKEN env → none
		npmToken, tokenSource := resolveNpmToken(tokenFlag)

		// Dry-run doesn't require --write, but actual publish does
		if !dryRun {
			if err := requireCFSafety("publish_npm"); err != nil {
				return err
			}
		}

		// Resolve version
		resolved, err := latticeResolveVersion(cfg.GroveRoot, packageName, bump, explicitVersion)
		if err != nil {
			return err
		}

		// Resolve auth label for plan output
		authLabel := npmAuthLabel(tokenSource)

		// Show the plan
		if cfg.JSONMode && dryRun {
			steps := []string{
				"Bump version",
				"Swap registry to npm",
			}
			if skipBuild {
				steps = append(steps, "(skip build)")
			} else {
				steps = append(steps, "Build package")
			}
			steps = append(steps, "Publish to npm", "Swap registry back to GitHub")
			if skipCommit {
				steps = append(steps, "(skip commit)", "(skip push)")
			} else {
				steps = append(steps, "Commit version bump", "Push to remote")
			}
			result := map[string]interface{}{
				"dry_run":         true,
				"package":         resolved.name,
				"current_version": resolved.currentVersion,
				"new_version":     resolved.newVersion,
				"auth":            authLabel,
				"steps":           steps,
			}
			if tagFlag != "" {
				result["tag"] = tagFlag
			}
			return printJSON(result)
		}

		if !cfg.JSONMode {
			pairs := [][2]string{
				{"Package", resolved.name},
				{"Version", fmt.Sprintf("%s → %s", resolved.currentVersion, resolved.newVersion)},
				{"Registry", npmRegistry},
				{"Auth", authLabel},
			}
			if tagFlag != "" {
				pairs = append(pairs, [2]string{"Tag", tagFlag})
			}
			buildLabel := "pnpm run package"
			if skipBuild {
				buildLabel = "Skip"
			}
			pairs = append(pairs, [2]string{"Build", buildLabel})
			commitLabel := fmt.Sprintf("chore: bump version to %s", resolved.newVersion)
			if skipCommit {
				commitLabel = "Skip"
			}
			pairs = append(pairs, [2]string{"Commit", commitLabel})
			fmt.Print(ui.RenderInfoPanel("npm Publish Plan", pairs))
		}

		if dryRun {
			ui.Info("DRY RUN — No changes made")
			return nil
		}

		// Bump version and run npm publish core
		if err := latticeNpmPublish(cfg.GroveRoot, resolved, npmToken, tagFlag, skipBuild); err != nil {
			return err
		}

		// Commit and push
		if !skipCommit {
			if err := latticeCommitPush(cfg.GroveRoot, resolved); err != nil {
				return err
			}
		} else {
			ui.Info("Skipping commit and push")
		}

		// Final summary
		if cfg.JSONMode {
			return printJSON(map[string]interface{}{
				"published": true,
				"package":   resolved.name,
				"version":   resolved.newVersion,
				"registry":  npmRegistry,
			})
		}

		fmt.Println()
		ui.Success(fmt.Sprintf("Successfully published %s@%s to npm", resolved.name, resolved.newVersion))
		ui.Muted(fmt.Sprintf("Verify: npm view %s version", resolved.name))
		fmt.Println()

		return nil
	},
}

// publishLatticeGithubCmd creates a GitHub Release with LLM-generated summary.
var publishLatticeGithubCmd = &cobra.Command{
	Use:   "github",
	Short: "Create a GitHub Release with LLM-generated summary",
	Long: `Create a GitHub Release for @autumnsgrove/lattice:
  1. Bump version in package.json
  2. Commit and push version bump
  3. Create git tag
  4. Generate release summary via LLM
  5. Create GitHub Release with summary`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		bump, _ := cmd.Flags().GetString("bump")
		explicitVersion, _ := cmd.Flags().GetString("version")
		packageName, _ := cmd.Flags().GetString("package")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if !dryRun {
			if err := requireCFSafety("publish_lattice_github"); err != nil {
				return err
			}
		}

		resolved, err := latticeResolveVersion(cfg.GroveRoot, packageName, bump, explicitVersion)
		if err != nil {
			return err
		}

		tag := "v" + resolved.newVersion

		// Show plan
		if cfg.JSONMode && dryRun {
			return printJSON(map[string]interface{}{
				"dry_run":         true,
				"package":         resolved.name,
				"current_version": resolved.currentVersion,
				"new_version":     resolved.newVersion,
				"tag":             tag,
				"steps": []string{
					"Bump version",
					"Commit and push",
					"Create git tag",
					"Generate release summary (LLM)",
					"Create GitHub Release",
				},
			})
		}

		if !cfg.JSONMode {
			fmt.Print(ui.RenderInfoPanel("GitHub Release Plan", [][2]string{
				{"Package", resolved.name},
				{"Version", fmt.Sprintf("%s → %s", resolved.currentVersion, resolved.newVersion)},
				{"Tag", tag},
				{"Summary", "LLM-generated via generate-release-summary.sh"},
			}))
		}

		if dryRun {
			ui.Info("DRY RUN — No changes made")
			return nil
		}

		// Step 1: Bump version
		ui.Info(fmt.Sprintf("Bumping version to %s...", resolved.newVersion))
		resolved.pkgData["version"] = resolved.newVersion
		if err := writePackageJSON(resolved.pkgJSONPath, resolved.pkgData); err != nil {
			return fmt.Errorf("failed to write version: %w", err)
		}
		ui.Success(fmt.Sprintf("Version bumped to %s", resolved.newVersion))

		// Step 2: Commit and push
		if err := latticeCommitPush(cfg.GroveRoot, resolved); err != nil {
			return err
		}

		// Steps 3-5: Tag, generate summary, create release
		if err := latticeGithubRelease(cfg.GroveRoot, resolved.newVersion); err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(map[string]interface{}{
				"released": true,
				"package":  resolved.name,
				"version":  resolved.newVersion,
				"tag":      tag,
			})
		}

		fmt.Println()
		ui.Success(fmt.Sprintf("Created GitHub Release %s for %s", tag, resolved.name))
		fmt.Println()

		return nil
	},
}

// publishLatticeBothCmd publishes to npm AND creates a GitHub Release.
var publishLatticeBothCmd = &cobra.Command{
	Use:   "both",
	Short: "Publish to npm and create GitHub Release in one flow",
	Long: `Complete publish workflow for @autumnsgrove/lattice:
  1. Bump version in package.json
  2. Swap registry to npm, build, publish to npm
  3. Swap registry back to GitHub Packages
  4. Commit and push version bump
  5. Create git tag
  6. Generate release summary via LLM
  7. Create GitHub Release with summary`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		bump, _ := cmd.Flags().GetString("bump")
		explicitVersion, _ := cmd.Flags().GetString("version")
		packageName, _ := cmd.Flags().GetString("package")
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		skipBuild, _ := cmd.Flags().GetBool("skip-build")
		tokenFlag, _ := cmd.Flags().GetString("token")
		tagFlag, _ := cmd.Flags().GetString("tag")

		npmToken, tokenSource := resolveNpmToken(tokenFlag)

		if !dryRun {
			if err := requireCFSafety("publish_lattice_both"); err != nil {
				return err
			}
		}

		resolved, err := latticeResolveVersion(cfg.GroveRoot, packageName, bump, explicitVersion)
		if err != nil {
			return err
		}

		tag := "v" + resolved.newVersion
		authLabel := npmAuthLabel(tokenSource)

		// Show plan
		if cfg.JSONMode && dryRun {
			steps := []string{
				"Bump version",
				"Swap registry to npm",
			}
			if skipBuild {
				steps = append(steps, "(skip build)")
			} else {
				steps = append(steps, "Build package")
			}
			steps = append(steps,
				"Publish to npm",
				"Swap registry back to GitHub",
				"Commit and push",
				"Create git tag",
				"Generate release summary (LLM)",
				"Create GitHub Release",
			)
			return printJSON(map[string]interface{}{
				"dry_run":         true,
				"package":         resolved.name,
				"current_version": resolved.currentVersion,
				"new_version":     resolved.newVersion,
				"tag":             tag,
				"auth":            authLabel,
				"steps":           steps,
			})
		}

		if !cfg.JSONMode {
			pairs := [][2]string{
				{"Package", resolved.name},
				{"Version", fmt.Sprintf("%s → %s", resolved.currentVersion, resolved.newVersion)},
				{"npm Registry", npmRegistry},
				{"Auth", authLabel},
				{"Tag", tag},
				{"Summary", "LLM-generated via generate-release-summary.sh"},
			}
			if tagFlag != "" {
				pairs = append(pairs, [2]string{"npm Tag", tagFlag})
			}
			buildLabel := "pnpm run package"
			if skipBuild {
				buildLabel = "Skip"
			}
			pairs = append(pairs, [2]string{"Build", buildLabel})
			fmt.Print(ui.RenderInfoPanel("npm + GitHub Release Plan", pairs))
		}

		if dryRun {
			ui.Info("DRY RUN — No changes made")
			return nil
		}

		// Phase 1: npm publish (bump, swap, build, publish, restore)
		ui.Info("Phase 1: Publishing to npm...")
		if err := latticeNpmPublish(cfg.GroveRoot, resolved, npmToken, tagFlag, skipBuild); err != nil {
			return err
		}
		ui.Success(fmt.Sprintf("Published %s@%s to npm", resolved.name, resolved.newVersion))

		// Phase 2: Commit, push, and create GitHub Release
		ui.Info("Phase 2: Creating GitHub Release...")
		if err := latticeCommitPush(cfg.GroveRoot, resolved); err != nil {
			return err
		}

		if err := latticeGithubRelease(cfg.GroveRoot, resolved.newVersion); err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(map[string]interface{}{
				"published": true,
				"released":  true,
				"package":   resolved.name,
				"version":   resolved.newVersion,
				"tag":       tag,
				"registry":  npmRegistry,
			})
		}

		fmt.Println()
		ui.Success(fmt.Sprintf("Published %s@%s to npm + created GitHub Release %s", resolved.name, resolved.newVersion, tag))
		ui.Muted(fmt.Sprintf("Verify npm: npm view %s version", resolved.name))
		ui.Muted(fmt.Sprintf("Verify release: gh release view %s", tag))
		fmt.Println()

		return nil
	},
}

// --- publish gw / gf ---

var publishGwCmd = &cobra.Command{
	Use:   "gw",
	Short: "Release a new gw version via git tag",
	Long: `Create and push a git tag to release a new gw version.
  1. Find latest gw/v* tag
  2. Calculate new version (--bump or --version)
  3. Show release plan
  4. Create annotated git tag
  5. Push tag (triggers release-tools.yml CI)`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return publishTool("gw", "gw/v", cmd)
	},
}

var publishGfCmd = &cobra.Command{
	Use:   "gf",
	Short: "Release a new gf version via git tag",
	Long: `Create and push a git tag to release a new gf version.
  1. Find latest gf/v* tag
  2. Calculate new version (--bump or --version)
  3. Show release plan
  4. Create annotated git tag
  5. Push tag (triggers release-tools.yml CI)`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return publishTool("gf", "gf/v", cmd)
	},
}

// publishTool is the shared implementation for gw and gf release commands.
func publishTool(toolName, tagPrefix string, cmd *cobra.Command) error {
	dryRun, _ := cmd.Flags().GetBool("dry-run")

	// Safety — require --write for actual publish
	if !dryRun {
		if err := requireCFSafety("publish_" + toolName); err != nil {
			return err
		}
	}

	cfg := config.Get()
	bump, _ := cmd.Flags().GetString("bump")
	explicitVersion, _ := cmd.Flags().GetString("version")

	// Require version specification
	if bump == "" && explicitVersion == "" {
		return fmt.Errorf("specify version: --bump patch|minor|major or --version X.Y.Z")
	}
	if bump != "" && bump != "patch" && bump != "minor" && bump != "major" {
		return fmt.Errorf("--bump must be patch, minor, or major")
	}

	// Find latest tag for this tool
	currentVersion, err := getLatestToolVersion(tagPrefix)
	if err != nil {
		return err
	}

	// Calculate new version
	var newVersion string
	if explicitVersion != "" {
		newVersion = strings.TrimPrefix(explicitVersion, "v")
	} else {
		newVersion, err = bumpVersion(currentVersion, bump)
		if err != nil {
			return err
		}
	}

	tagName := tagPrefix + newVersion // e.g. "gw/v1.2.0"

	// Generate changelog from git log between previous tag and HEAD
	changes := generateChangelog(toolName, tagPrefix, currentVersion)

	// JSON dry-run
	if cfg.JSONMode && dryRun {
		result := map[string]interface{}{
			"dry_run":         true,
			"tool":            toolName,
			"current_version": currentVersion,
			"new_version":     newVersion,
			"tag":             tagName,
			"trigger":         "release-tools.yml",
		}
		if len(changes) > 0 {
			result["changes"] = changes
		}
		return printJSON(result)
	}

	// Show plan
	if !cfg.JSONMode {
		fmt.Print(ui.RenderInfoPanel(toolName+" Release Plan", [][2]string{
			{"Tool", toolName},
			{"Version", fmt.Sprintf("%s → %s", currentVersion, newVersion)},
			{"Tag", tagName},
			{"Trigger", "release-tools.yml → build binaries"},
		}))

		if len(changes) > 0 {
			fmt.Print(ui.RenderPanel(
				fmt.Sprintf("Changes (%d)", len(changes)),
				strings.Join(changes, "\n"),
			))
		}
	}

	if dryRun {
		ui.Info("DRY RUN — No changes made")
		return nil
	}

	// Dirty check — only for the tool's own directory unless --force skips it.
	// Tool publishes create a git tag (no commit), so unrelated dirty files
	// in other parts of the monorepo are irrelevant.
	if !cfg.ForceFlag {
		toolDir := toolDirectory(toolName)
		statusResult, err := exec.Git("status", "--porcelain", "--", ":(top)"+toolDir)
		if err != nil {
			return fmt.Errorf("failed to check git status: %w", err)
		}
		if strings.TrimSpace(statusResult.Stdout) != "" {
			return fmt.Errorf("working tree has uncommitted changes in %s — commit or stash first\n  (use --force --write to skip this check)", toolDir)
		}
	}

	// Build tag message with changelog
	tagMsg := fmt.Sprintf("%s %s", toolName, newVersion)
	if len(changes) > 0 {
		tagMsg += "\n"
		for _, line := range changes {
			// Each line is "hash message" — extract just the message
			if parts := strings.SplitN(line, " ", 2); len(parts) == 2 {
				tagMsg += "\n- " + parts[1]
			}
		}
		tagMsg += "\n"
	}

	// Create annotated tag
	ui.Info(fmt.Sprintf("Creating tag %s...", tagName))
	_, err = exec.Git("tag", "-a", tagName, "-m", tagMsg)
	if err != nil {
		return fmt.Errorf("failed to create tag: %w", err)
	}
	ui.Success(fmt.Sprintf("Created tag %s", tagName))

	// Push tag
	ui.Info(fmt.Sprintf("Pushing %s to origin...", tagName))
	pushResult, err := exec.Git("push", "origin", tagName)
	if err != nil {
		return fmt.Errorf("failed to push tag: %w", err)
	}
	if !pushResult.OK() {
		return fmt.Errorf("push failed:\n%s", pushResult.Stderr)
	}

	// Success output
	if cfg.JSONMode {
		result := map[string]interface{}{
			"published": true,
			"tool":      toolName,
			"version":   newVersion,
			"tag":       tagName,
		}
		if len(changes) > 0 {
			result["changes"] = len(changes)
		}
		return printJSON(result)
	}

	fmt.Println()
	ui.Success(fmt.Sprintf("Tagged and pushed %s", tagName))
	ui.Muted("Release workflow will build binaries automatically")
	fmt.Println()

	return nil
}

// toolDirectory maps a tool name to its monorepo-relative directory.
func toolDirectory(toolName string) string {
	switch toolName {
	case "gw":
		return "tools/grove-wrap-go"
	case "gf":
		return "tools/grove-find-go"
	default:
		return ""
	}
}

// generateChangelog extracts one-line commit summaries between the previous
// tag and HEAD, scoped to the tool's directory. Returns nil if no changes
// are found or on any error (non-fatal).
func generateChangelog(toolName, tagPrefix, currentVersion string) []string {
	toolDir := toolDirectory(toolName)
	if toolDir == "" {
		return nil
	}

	// Use :(top) pathspec magic so the path is always relative to the repo
	// root, regardless of which directory gw was invoked from.
	pathspec := ":(top)" + toolDir

	var args []string
	if currentVersion == "0.0.0" {
		// No previous release — show recent commits
		args = []string{"log", "--oneline", "--no-decorate", "--no-merges", "-20", "--", pathspec}
	} else {
		prevTag := tagPrefix + currentVersion
		args = []string{"log", "--oneline", "--no-decorate", "--no-merges", prevTag + "..HEAD", "--", pathspec}
	}

	result, err := exec.Git(args...)
	if err != nil {
		return nil
	}

	output := strings.TrimSpace(result.Stdout)
	if output == "" {
		return nil
	}

	return strings.Split(output, "\n")
}

// getLatestToolVersion finds the latest version for a tool tag prefix (e.g. "gw/v").
// Returns "0.0.0" if no tags exist yet.
func getLatestToolVersion(tagPrefix string) (string, error) {
	result, err := exec.Git("tag", "-l", tagPrefix+"*", "--sort=-v:refname")
	if err != nil {
		return "", fmt.Errorf("failed to list tags: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(result.Stdout), "\n")
	if len(lines) == 0 || lines[0] == "" {
		return "0.0.0", nil
	}

	// Strip prefix to get bare version: "gw/v1.2.3" → "1.2.3"
	return strings.TrimPrefix(lines[0], tagPrefix), nil
}

// --- lattice publish helpers ---

// latticeResolved holds the resolved version and package metadata for a Lattice publish.
type latticeResolved struct {
	pkgPath        string
	pkgJSONPath    string
	pkgData        map[string]interface{}
	currentVersion string
	newVersion     string
	name           string
}

// latticeResolveVersion reads package.json and resolves the new version.
func latticeResolveVersion(root, packageName, bump, explicitVersion string) (latticeResolved, error) {
	var r latticeResolved

	if bump == "" && explicitVersion == "" {
		return r, fmt.Errorf("specify version: --bump patch|minor|major or --version X.Y.Z")
	}
	if bump != "" && bump != "patch" && bump != "minor" && bump != "major" {
		return r, fmt.Errorf("--bump must be patch, minor, or major")
	}

	pkgPath, err := findPackagePath(root, packageName)
	if err != nil {
		return r, err
	}

	r.pkgPath = pkgPath
	r.pkgJSONPath = filepath.Join(pkgPath, "package.json")

	r.pkgData, err = readPackageJSON(r.pkgJSONPath)
	if err != nil {
		return r, fmt.Errorf("failed to read package.json: %w", err)
	}

	r.currentVersion, _ = r.pkgData["version"].(string)
	if r.currentVersion == "" {
		r.currentVersion = "0.0.0"
	}
	r.name, _ = r.pkgData["name"].(string)
	if r.name == "" {
		r.name = packageName
	}

	if explicitVersion != "" {
		r.newVersion = explicitVersion
	} else {
		r.newVersion, err = bumpVersion(r.currentVersion, bump)
		if err != nil {
			return r, err
		}
	}

	return r, nil
}

// latticeNpmPublish performs the npm publish flow: bump version, swap registry,
// build, publish to npm, restore registry. Does NOT commit or push.
func latticeNpmPublish(root string, r latticeResolved, npmToken, tagFlag string, skipBuild bool) error {
	// Step 1: Bump version
	ui.Info(fmt.Sprintf("Bumping version to %s...", r.newVersion))
	r.pkgData["version"] = r.newVersion
	if err := writePackageJSON(r.pkgJSONPath, r.pkgData); err != nil {
		return fmt.Errorf("failed to write version: %w", err)
	}
	ui.Success(fmt.Sprintf("Version bumped to %s", r.newVersion))

	// Step 2: Swap to npm registry
	ui.Info("Swapping registry to npm...")
	originalPublishConfig := getPublishConfig(r.pkgData)
	r.pkgData["publishConfig"] = map[string]interface{}{
		"registry": npmRegistry,
		"access":   "public",
	}
	if err := writePackageJSON(r.pkgJSONPath, r.pkgData); err != nil {
		return fmt.Errorf("failed to swap registry: %w", err)
	}
	ui.Success("Registry swapped to npm")

	// Defer registry restore — ALWAYS runs, even on publish failure
	defer func() {
		ui.Info("Swapping registry back to GitHub...")
		if originalPublishConfig != nil {
			r.pkgData["publishConfig"] = originalPublishConfig
		} else {
			r.pkgData["publishConfig"] = map[string]interface{}{
				"registry": githubRegistry,
			}
		}
		if writeErr := writePackageJSON(r.pkgJSONPath, r.pkgData); writeErr != nil {
			ui.Warning(fmt.Sprintf("Failed to restore registry: %s", writeErr))
		} else {
			ui.Success("Registry restored to GitHub Packages")
		}
	}()

	// Step 3: Build
	if !skipBuild {
		ui.Info("Building package...")
		result, err := exec.RunInDirWithTimeout(5*time.Minute, r.pkgPath, "pnpm", "run", "package")
		if err != nil {
			return fmt.Errorf("build command failed: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("build failed:\n%s", result.Stderr)
		}
		ui.Success("Package built")
	} else {
		ui.Info("Skipping build")
	}

	// Create temporary .npmrc if a token was resolved
	if npmToken != "" {
		npmrcPath, npmrcErr := writeNpmrc(root, npmToken)
		if npmrcErr != nil {
			return npmrcErr
		}
		defer removeNpmrc(npmrcPath)
		ui.Success("Temporary .npmrc created")
	}

	// Step 4: Publish to npm
	ui.Info("Publishing to npm...")
	publishArgs := []string{"publish", "--access", "public"}
	if tagFlag != "" {
		publishArgs = append(publishArgs, "--tag", tagFlag)
	}
	result, err := exec.RunInDirWithTimeout(2*time.Minute, r.pkgPath, "npm", publishArgs...)
	if err != nil {
		return fmt.Errorf("publish command failed: %w", err)
	}
	if !result.OK() {
		if strings.Contains(result.Stderr, "EOTP") {
			ui.Warning("2FA/OTP required — your token doesn't bypass 2FA")
			ui.Info("Fix: Create a Granular Access Token at https://www.npmjs.com/settings/tokens")
			ui.Info("     with \"Read and write\" Packages permission, then re-run with --token <token>")
		} else if strings.Contains(result.Stderr, "403") {
			ui.Warning("403 error — you may have already published this version")
		}
		return fmt.Errorf("publish failed:\n%s", result.Stderr)
	}

	if strings.Contains(result.Stdout, fmt.Sprintf("+ %s@%s", r.name, r.newVersion)) {
		ui.Success(fmt.Sprintf("Published %s@%s to npm!", r.name, r.newVersion))
	} else {
		ui.Success("Published to npm")
		if result.Stdout != "" {
			ui.Muted(result.Stdout)
		}
	}

	return nil
}

// latticeCommitPush commits the version bump and pushes to remote.
func latticeCommitPush(root string, r latticeResolved) error {
	ui.Info("Committing and pushing...")
	commitMsg := fmt.Sprintf("chore: bump %s version to %s", r.name, r.newVersion)

	gitAdd, err := exec.RunInDir(root, "git", "add", r.pkgJSONPath)
	if err != nil {
		return fmt.Errorf("git add failed: %w", err)
	}
	if !gitAdd.OK() {
		return fmt.Errorf("git add failed: %s", gitAdd.Stderr)
	}

	gitCommit, err := exec.RunInDir(root, "git", "commit", "-m", commitMsg)
	if err != nil {
		return fmt.Errorf("git commit failed: %w", err)
	}
	if !gitCommit.OK() {
		return fmt.Errorf("commit failed: %s", gitCommit.Stderr)
	}
	ui.Success("Version bump committed")

	gitPush, err := exec.RunInDir(root, "git", "push")
	if err != nil {
		return fmt.Errorf("git push failed: %w", err)
	}
	if !gitPush.OK() {
		return fmt.Errorf("push failed: %s", gitPush.Stderr)
	}
	ui.Success("Pushed to remote")

	return nil
}

// latticeGithubRelease creates a git tag, generates a release summary, and
// creates a GitHub Release. Requires gh CLI to be installed and authenticated.
func latticeGithubRelease(root, version string) error {
	tag := "v" + version

	// Create git tag
	ui.Info(fmt.Sprintf("Creating tag %s...", tag))
	_, err := exec.Git("tag", "-a", tag, "-m", fmt.Sprintf("Release %s", tag))
	if err != nil {
		return fmt.Errorf("failed to create tag: %w", err)
	}
	ui.Success(fmt.Sprintf("Created tag %s", tag))

	// Push tag
	ui.Info(fmt.Sprintf("Pushing tag %s...", tag))
	pushResult, err := exec.Git("push", "origin", tag)
	if err != nil {
		return fmt.Errorf("failed to push tag: %w", err)
	}
	if !pushResult.OK() {
		return fmt.Errorf("tag push failed:\n%s", pushResult.Stderr)
	}
	ui.Success("Tag pushed")

	// Generate release summary via LLM
	ui.Info("Generating release summary...")
	scriptPath := filepath.Join(root, "scripts", "generate", "generate-release-summary.sh")
	summaryResult, err := exec.RunInDirWithTimeout(2*time.Minute, root, "bash", scriptPath, tag)
	if err != nil {
		ui.Warning(fmt.Sprintf("Summary generation failed: %s — using basic release notes", err))
	} else if !summaryResult.OK() {
		ui.Warning(fmt.Sprintf("Summary generation failed: %s — using basic release notes", summaryResult.Stderr))
	}

	// Build release body from summary JSON (or fallback)
	body := buildReleaseBody(root, tag, version)

	// Create GitHub Release via gh CLI
	ui.Info("Creating GitHub Release...")
	title := fmt.Sprintf("@autumnsgrove/lattice %s", tag)
	ghResult, err := exec.RunInDirWithTimeout(30*time.Second, root,
		"gh", "release", "create", tag,
		"--title", title,
		"--notes", body,
	)
	if err != nil {
		return fmt.Errorf("gh release create failed: %w", err)
	}
	if !ghResult.OK() {
		return fmt.Errorf("gh release create failed:\n%s", ghResult.Stderr)
	}
	ui.Success(fmt.Sprintf("GitHub Release created: %s", tag))

	return nil
}

// releaseSummary matches the JSON structure produced by generate-release-summary.sh.
type releaseSummary struct {
	Version    string `json:"version"`
	Summary    string `json:"summary"`
	Stats      struct {
		TotalCommits int `json:"totalCommits"`
		Features     int `json:"features"`
		Fixes        int `json:"fixes"`
		Refactoring  int `json:"refactoring"`
		Docs         int `json:"docs"`
		Tests        int `json:"tests"`
		Performance  int `json:"performance"`
	} `json:"stats"`
	Scopes     []string `json:"scopes"`
	Highlights struct {
		Features    []string `json:"features"`
		Fixes       []string `json:"fixes"`
		Refactoring []string `json:"refactoring"`
		Docs        []string `json:"docs"`
		Performance []string `json:"performance"`
		Tests       []string `json:"tests"`
	} `json:"highlights"`
}

// buildReleaseBody constructs the GitHub Release body from the summary JSON.
// Falls back to a basic body if the summary file doesn't exist.
func buildReleaseBody(root, tag, version string) string {
	summaryFile := filepath.Join(root, "snapshots", "summaries", tag+".json")
	data, err := os.ReadFile(summaryFile)
	if err != nil {
		return fmt.Sprintf("## @autumnsgrove/lattice v%s\n\nSee the [roadmap](https://grove.autumn.pub/roadmap) for details.", version)
	}

	var s releaseSummary
	if err := json.Unmarshal(data, &s); err != nil {
		return fmt.Sprintf("## @autumnsgrove/lattice v%s\n\nSee the [roadmap](https://grove.autumn.pub/roadmap) for details.", version)
	}

	var b strings.Builder
	b.WriteString(s.Summary)
	b.WriteString("\n\n### Highlights\n")

	writeSection := func(title string, items []string) {
		if len(items) == 0 {
			return
		}
		b.WriteString(fmt.Sprintf("\n**%s**\n", title))
		for _, item := range items {
			b.WriteString(fmt.Sprintf("- %s\n", item))
		}
	}

	writeSection("Features", s.Highlights.Features)
	writeSection("Fixes", s.Highlights.Fixes)
	writeSection("Refactoring", s.Highlights.Refactoring)
	writeSection("Performance", s.Highlights.Performance)
	writeSection("Docs", s.Highlights.Docs)
	writeSection("Tests", s.Highlights.Tests)

	b.WriteString("\n---\n")

	if len(s.Scopes) > 0 {
		scopeStrs := make([]string, len(s.Scopes))
		for i, scope := range s.Scopes {
			scopeStrs[i] = "`" + scope + "`"
		}
		b.WriteString(fmt.Sprintf("Areas: %s | ", strings.Join(scopeStrs, ", ")))
	}

	b.WriteString(fmt.Sprintf("*%d total commits* | [npm](https://npm.pkg.github.com/package/@autumnsgrove/lattice) | [changelog](https://grove.autumn.pub/roadmap)", s.Stats.TotalCommits))

	return b.String()
}

// resolveNpmToken resolves the npm auth token from flag or environment.
func resolveNpmToken(tokenFlag string) (token, source string) {
	if tokenFlag != "" {
		return tokenFlag, "flag"
	}
	if envToken := os.Getenv("NPM_TOKEN"); envToken != "" {
		return envToken, "env"
	}
	return "", ""
}

// npmAuthLabel returns a human-readable label for the npm auth source.
func npmAuthLabel(tokenSource string) string {
	switch tokenSource {
	case "flag":
		return "token (--token flag)"
	case "env":
		return "NPM_TOKEN env"
	default:
		return "existing npm config"
	}
}

// --- general helpers ---

// readPackageJSON reads and parses a package.json file.
func readPackageJSON(path string) (map[string]interface{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var pkg map[string]interface{}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return nil, err
	}
	return pkg, nil
}

// writePackageJSON writes a package.json file with 2-space indent.
func writePackageJSON(path string, data map[string]interface{}) error {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	// Append trailing newline to match npm/pnpm convention
	b = append(b, '\n')
	return os.WriteFile(path, b, 0o644)
}

// getPublishConfig extracts the current publishConfig as a copy.
func getPublishConfig(pkg map[string]interface{}) map[string]interface{} {
	pc, ok := pkg["publishConfig"].(map[string]interface{})
	if !ok {
		return nil
	}
	// Deep copy
	copy := make(map[string]interface{}, len(pc))
	for k, v := range pc {
		copy[k] = v
	}
	return copy
}

// bumpVersion increments a semver version string.
func bumpVersion(current, bumpType string) (string, error) {
	parts := strings.SplitN(current, ".", 3)
	if len(parts) != 3 {
		return "", fmt.Errorf("invalid version format: %s (expected X.Y.Z)", current)
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return "", fmt.Errorf("invalid major version: %s", parts[0])
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return "", fmt.Errorf("invalid minor version: %s", parts[1])
	}
	patch, err := strconv.Atoi(parts[2])
	if err != nil {
		return "", fmt.Errorf("invalid patch version: %s", parts[2])
	}

	switch bumpType {
	case "patch":
		patch++
	case "minor":
		minor++
		patch = 0
	case "major":
		major++
		minor = 0
		patch = 0
	default:
		return "", fmt.Errorf("unknown bump type: %s", bumpType)
	}

	return fmt.Sprintf("%d.%d.%d", major, minor, patch), nil
}

// writeNpmrc creates a temporary .npmrc at the grove root with the given auth token.
func writeNpmrc(root, token string) (string, error) {
	npmrcPath := filepath.Join(root, ".npmrc")
	content := fmt.Sprintf("//registry.npmjs.org/:_authToken=%s\n", token)
	if err := os.WriteFile(npmrcPath, []byte(content), 0o600); err != nil {
		return "", fmt.Errorf("failed to write .npmrc: %w", err)
	}
	return npmrcPath, nil
}

// removeNpmrc removes a .npmrc file (best-effort, logs warning on failure).
func removeNpmrc(path string) {
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		ui.Warning(fmt.Sprintf("Failed to clean up .npmrc: %s", err))
	}
}

// findPackagePath locates a monorepo package by name using discoverPackages.
func findPackagePath(root, name string) (string, error) {
	pkgs := discoverPackages(root)
	if len(pkgs) == 0 {
		return "", fmt.Errorf("no packages found in monorepo")
	}

	// Try exact match on package.json "name" field first
	for _, p := range pkgs {
		pkgJSON := filepath.Join(p.Path, "package.json")
		data, err := os.ReadFile(pkgJSON)
		if err != nil {
			continue
		}
		var pkg struct {
			Name string `json:"name"`
		}
		if json.Unmarshal(data, &pkg) == nil && pkg.Name == name {
			return p.Path, nil
		}
	}

	// Fallback: match on directory-based name
	for _, p := range pkgs {
		if p.Name == name {
			return p.Path, nil
		}
	}

	// Build available list for error message
	available := make([]string, 0, len(pkgs))
	for _, p := range pkgs {
		available = append(available, p.Name)
	}
	return "", fmt.Errorf("package not found: %s\n  Available: %s", name, strings.Join(available, ", "))
}

func init() {
	rootCmd.AddCommand(publishCmd)

	// publish lattice (parent)
	publishCmd.AddCommand(publishLatticeCmd)

	// publish lattice npm
	publishNpmCmd.Flags().String("bump", "", "Version bump type (patch, minor, major)")
	publishNpmCmd.Flags().String("version", "", "Explicit version string (e.g., 1.0.0)")
	publishNpmCmd.Flags().StringP("package", "p", "@autumnsgrove/lattice", "Target package name")
	publishNpmCmd.Flags().Bool("dry-run", false, "Show plan without executing")
	publishNpmCmd.Flags().Bool("skip-build", false, "Skip the build step")
	publishNpmCmd.Flags().Bool("skip-commit", false, "Skip git commit and push")
	publishNpmCmd.Flags().String("token", "", "npm auth token (or set NPM_TOKEN env var)")
	publishNpmCmd.Flags().String("tag", "", "npm dist-tag (e.g., beta, next)")
	publishLatticeCmd.AddCommand(publishNpmCmd)

	// publish lattice github
	publishLatticeGithubCmd.Flags().String("bump", "", "Version bump type (patch, minor, major)")
	publishLatticeGithubCmd.Flags().String("version", "", "Explicit version string (e.g., 1.0.0)")
	publishLatticeGithubCmd.Flags().StringP("package", "p", "@autumnsgrove/lattice", "Target package name")
	publishLatticeGithubCmd.Flags().Bool("dry-run", false, "Show plan without executing")
	publishLatticeCmd.AddCommand(publishLatticeGithubCmd)

	// publish lattice both
	publishLatticeBothCmd.Flags().String("bump", "", "Version bump type (patch, minor, major)")
	publishLatticeBothCmd.Flags().String("version", "", "Explicit version string (e.g., 1.0.0)")
	publishLatticeBothCmd.Flags().StringP("package", "p", "@autumnsgrove/lattice", "Target package name")
	publishLatticeBothCmd.Flags().Bool("dry-run", false, "Show plan without executing")
	publishLatticeBothCmd.Flags().Bool("skip-build", false, "Skip the build step")
	publishLatticeBothCmd.Flags().String("token", "", "npm auth token (or set NPM_TOKEN env var)")
	publishLatticeBothCmd.Flags().String("tag", "", "npm dist-tag (e.g., beta, next)")
	publishLatticeCmd.AddCommand(publishLatticeBothCmd)

	// publish gw
	publishGwCmd.Flags().String("bump", "", "Version bump type (patch, minor, major)")
	publishGwCmd.Flags().String("version", "", "Explicit version (e.g., 1.2.0)")
	publishGwCmd.Flags().Bool("dry-run", false, "Show plan without executing")
	publishCmd.AddCommand(publishGwCmd)

	// publish gf
	publishGfCmd.Flags().String("bump", "", "Version bump type (patch, minor, major)")
	publishGfCmd.Flags().String("version", "", "Explicit version (e.g., 1.2.0)")
	publishGfCmd.Flags().Bool("dry-run", false, "Show plan without executing")
	publishCmd.AddCommand(publishGfCmd)
}
