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
	Short: "Package publishing to npm",
	Long:  "Automate npm package publishing with GitHub→npm registry swap.",
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
			return printJSON(map[string]interface{}{
				"dry_run":         true,
				"package":         resolvedName,
				"current_version": currentVersion,
				"new_version":     newVersion,
				"steps":           steps,
			})
		}

		if !cfg.JSONMode {
			fmt.Println()
			ui.PrintHeader("npm Publish Plan")
			ui.PrintKeyValue("Package", resolvedName)
			ui.PrintKeyValue("Version", fmt.Sprintf("%s → %s", currentVersion, newVersion))
			ui.PrintKeyValue("Registry", npmRegistry)
			if skipBuild {
				ui.PrintKeyValue("Build", "Skip")
			} else {
				ui.PrintKeyValue("Build", "pnpm run package")
			}
			if skipCommit {
				ui.PrintKeyValue("Commit", "Skip")
			} else {
				ui.PrintKeyValue("Commit", fmt.Sprintf("chore: bump version to %s", newVersion))
			}
			fmt.Println()
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

		// Step 4: Publish to npm
		ui.Info("Step 4/6: Publishing to npm...")
		result, err := exec.RunInDirWithTimeout(2*time.Minute, pkgPath, "npm", "publish", "--access", "public")
		if err != nil {
			return fmt.Errorf("publish command failed: %w", err)
		}
		if !result.OK() {
			// Detect common errors
			if strings.Contains(result.Stderr, "EOTP") {
				ui.Warning("OTP/2FA error — ensure your npm token has 'Bypass 2FA' enabled")
				ui.Info("Or run: npm login --auth-type=web")
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
	publishCmd.AddCommand(publishNpmCmd)
}
