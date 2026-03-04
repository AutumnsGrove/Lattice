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
	Long:  "Publish npm packages or release gw/gf tool binaries via git tags.",
}

// --- publish npm ---

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
		npmToken := tokenFlag
		tokenSource := ""
		if npmToken != "" {
			tokenSource = "flag"
		} else if envToken := os.Getenv("NPM_TOKEN"); envToken != "" {
			npmToken = envToken
			tokenSource = "env"
		}

		// Dry-run doesn't require --write, but actual publish does
		if !dryRun {
			if err := requireCFSafety("publish_npm"); err != nil {
				return err
			}
		}

		// Require version bump specification
		if bump == "" && explicitVersion == "" {
			return fmt.Errorf("specify version: --bump patch|minor|major or --version X.Y.Z")
		}
		if bump != "" && bump != "patch" && bump != "minor" && bump != "major" {
			return fmt.Errorf("--bump must be patch, minor, or major")
		}

		// Find the package
		root := cfg.GroveRoot
		pkgPath, err := findPackagePath(root, packageName)
		if err != nil {
			return err
		}

		pkgJSONPath := filepath.Join(pkgPath, "package.json")

		// Read current package.json
		pkgData, err := readPackageJSON(pkgJSONPath)
		if err != nil {
			return fmt.Errorf("failed to read package.json: %w", err)
		}

		currentVersion, _ := pkgData["version"].(string)
		if currentVersion == "" {
			currentVersion = "0.0.0"
		}
		resolvedName, _ := pkgData["name"].(string)
		if resolvedName == "" {
			resolvedName = packageName
		}

		// Calculate new version
		var newVersion string
		if explicitVersion != "" {
			newVersion = explicitVersion
		} else {
			newVersion, err = bumpVersion(currentVersion, bump)
			if err != nil {
				return err
			}
		}

		// Resolve auth label for plan output
		authLabel := "existing npm config"
		switch tokenSource {
		case "flag":
			authLabel = "token (--token flag)"
		case "env":
			authLabel = "NPM_TOKEN env"
		}

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
				"package":         resolvedName,
				"current_version": currentVersion,
				"new_version":     newVersion,
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
				{"Package", resolvedName},
				{"Version", fmt.Sprintf("%s → %s", currentVersion, newVersion)},
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
			commitLabel := fmt.Sprintf("chore: bump version to %s", newVersion)
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

		// Step 1: Bump version
		ui.Info(fmt.Sprintf("Step 1/6: Bumping version to %s...", newVersion))
		pkgData["version"] = newVersion
		if err := writePackageJSON(pkgJSONPath, pkgData); err != nil {
			return fmt.Errorf("failed to write version: %w", err)
		}
		ui.Success(fmt.Sprintf("Version bumped to %s", newVersion))

		// Step 2: Swap to npm registry
		ui.Info("Step 2/6: Swapping registry to npm...")
		originalPublishConfig := getPublishConfig(pkgData)
		pkgData["publishConfig"] = map[string]interface{}{
			"registry": npmRegistry,
			"access":   "public",
		}
		if err := writePackageJSON(pkgJSONPath, pkgData); err != nil {
			return fmt.Errorf("failed to swap registry: %w", err)
		}
		ui.Success("Registry swapped to npm")

		// Defer registry restore — ALWAYS runs, even on publish failure
		defer func() {
			ui.Info("Step 5/6: Swapping registry back to GitHub...")
			if originalPublishConfig != nil {
				pkgData["publishConfig"] = originalPublishConfig
			} else {
				pkgData["publishConfig"] = map[string]interface{}{
					"registry": githubRegistry,
				}
			}
			if writeErr := writePackageJSON(pkgJSONPath, pkgData); writeErr != nil {
				ui.Warning(fmt.Sprintf("Failed to restore registry: %s", writeErr))
			} else {
				ui.Success("Registry restored to GitHub Packages")
			}
		}()

		// Step 3: Build
		if !skipBuild {
			ui.Info("Step 3/6: Building package...")
			result, err := exec.RunInDirWithTimeout(5*time.Minute, pkgPath, "pnpm", "run", "package")
			if err != nil {
				return fmt.Errorf("build command failed: %w", err)
			}
			if !result.OK() {
				return fmt.Errorf("build failed:\n%s", result.Stderr)
			}
			ui.Success("Package built")
		} else {
			ui.Info("Step 3/6: Skipping build")
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
		ui.Info("Step 4/6: Publishing to npm...")
		publishArgs := []string{"publish", "--access", "public"}
		if tagFlag != "" {
			publishArgs = append(publishArgs, "--tag", tagFlag)
		}
		result, err := exec.RunInDirWithTimeout(2*time.Minute, pkgPath, "npm", publishArgs...)
		if err != nil {
			return fmt.Errorf("publish command failed: %w", err)
		}
		if !result.OK() {
			// Detect common errors
			if strings.Contains(result.Stderr, "EOTP") {
				ui.Warning("2FA/OTP required — your token doesn't bypass 2FA")
				ui.Info("Fix: Create a Granular Access Token at https://www.npmjs.com/settings/tokens")
				ui.Info("     with \"Read and write\" Packages permission, then re-run with --token <token>")
			} else if strings.Contains(result.Stderr, "403") {
				ui.Warning("403 error — you may have already published this version")
			}
			return fmt.Errorf("publish failed:\n%s", result.Stderr)
		}

		if strings.Contains(result.Stdout, fmt.Sprintf("+ %s@%s", resolvedName, newVersion)) {
			ui.Success(fmt.Sprintf("Published %s@%s to npm!", resolvedName, newVersion))
		} else {
			ui.Success("Published to npm")
			if result.Stdout != "" {
				ui.Muted(result.Stdout)
			}
		}

		// Step 6: Commit and push (step 5 handled by defer above)
		if !skipCommit {
			ui.Info("Step 6/6: Committing and pushing...")
			commitMsg := fmt.Sprintf("chore: bump %s version to %s", resolvedName, newVersion)

			gitAdd, err := exec.RunInDir(root, "git", "add", pkgJSONPath)
			if err != nil {
				ui.Warning(fmt.Sprintf("Git add failed: %s", err))
			} else if !gitAdd.OK() {
				ui.Warning(fmt.Sprintf("Git add failed: %s", gitAdd.Stderr))
			}

			gitCommit, err := exec.RunInDir(root, "git", "commit", "-m", commitMsg)
			if err != nil {
				ui.Warning(fmt.Sprintf("Git commit failed: %s", err))
			} else if gitCommit.OK() {
				ui.Success("Version bump committed")

				gitPush, err := exec.RunInDir(root, "git", "push")
				if err != nil {
					ui.Warning(fmt.Sprintf("Git push failed: %s", err))
				} else if gitPush.OK() {
					ui.Success("Pushed to remote")
				} else {
					ui.Warning(fmt.Sprintf("Push failed: %s", gitPush.Stderr))
				}
			} else {
				ui.Warning(fmt.Sprintf("Commit failed: %s", gitCommit.Stderr))
			}
		} else {
			ui.Info("Step 6/6: Skipping commit and push")
		}

		// Final summary
		if cfg.JSONMode {
			return printJSON(map[string]interface{}{
				"published": true,
				"package":   resolvedName,
				"version":   newVersion,
				"registry":  npmRegistry,
			})
		}

		fmt.Println()
		ui.Success(fmt.Sprintf("Successfully published %s@%s to npm", resolvedName, newVersion))
		ui.Muted(fmt.Sprintf("Verify: npm view %s version", resolvedName))
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

	// Dirty check
	statusResult, err := exec.Git("status", "--porcelain")
	if err != nil {
		return fmt.Errorf("failed to check git status: %w", err)
	}
	if strings.TrimSpace(statusResult.Stdout) != "" {
		return fmt.Errorf("working tree is dirty — commit or stash first")
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

	var args []string
	if currentVersion == "0.0.0" {
		// No previous release — show recent commits
		args = []string{"log", "--oneline", "--no-decorate", "--no-merges", "-20", "--", toolDir}
	} else {
		prevTag := tagPrefix + currentVersion
		args = []string{"log", "--oneline", "--no-decorate", "--no-merges", prevTag + "..HEAD", "--", toolDir}
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

// --- helpers ---

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

	// publish npm
	publishNpmCmd.Flags().String("bump", "", "Version bump type (patch, minor, major)")
	publishNpmCmd.Flags().String("version", "", "Explicit version string (e.g., 1.0.0)")
	publishNpmCmd.Flags().StringP("package", "p", "@autumnsgrove/lattice", "Target package name")
	publishNpmCmd.Flags().Bool("dry-run", false, "Show plan without executing")
	publishNpmCmd.Flags().Bool("skip-build", false, "Skip the build step")
	publishNpmCmd.Flags().Bool("skip-commit", false, "Skip git commit and push")
	publishNpmCmd.Flags().String("token", "", "npm auth token (or set NPM_TOKEN env var)")
	publishNpmCmd.Flags().String("tag", "", "npm dist-tag (e.g., beta, next)")
	publishCmd.AddCommand(publishNpmCmd)

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
