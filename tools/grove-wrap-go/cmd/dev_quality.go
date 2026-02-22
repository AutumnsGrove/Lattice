package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// detectPackageRunner returns the package manager command prefix for pnpm scripts.
func detectPackageRunner() string {
	return "pnpm"
}

// packageHasScript checks if a package.json in the given dir has a script.
func packageHasScript(dir, script string) bool {
	path := filepath.Join(dir, "package.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	var pkg map[string]interface{}
	if json.Unmarshal(data, &pkg) != nil {
		return false
	}
	scripts, ok := pkg["scripts"].(map[string]interface{})
	if !ok {
		return false
	}
	_, exists := scripts[script]
	return exists
}

// resolvePackageDir resolves a package name to its directory, or returns cwd.
func resolvePackageDir(pkg string) (string, error) {
	if pkg == "" {
		return os.Getwd()
	}
	cfg := config.Get()
	root := cfg.GroveRoot
	for _, prefix := range []string{"packages", "apps", "services", "workers", "libs", "tools"} {
		dir := filepath.Join(root, prefix, pkg)
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir, nil
		}
	}
	return "", fmt.Errorf("package %q not found in monorepo", pkg)
}

// --- gw test ---

var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Run tests for a package",
	Long: `Run tests for a package. Auto-detects test runner.

Node packages: uses vitest via pnpm run test
Python packages: uses pytest via uv run pytest`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		watch, _ := cmd.Flags().GetBool("watch")
		coverage, _ := cmd.Flags().GetBool("coverage")
		filter, _ := cmd.Flags().GetString("filter")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			runArgs := []string{"pnpm", "-r", "run", "test:run"}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Testing all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		// Determine test command
		var runArgs []string
		if packageHasScript(dir, "test") && watch {
			runArgs = []string{"pnpm", "run", "test"}
		} else if packageHasScript(dir, "test:run") && !watch {
			runArgs = []string{"pnpm", "run", "test:run"}
		} else {
			runArgs = []string{"pnpm", "exec", "vitest"}
			if !watch {
				runArgs = append(runArgs, "run")
			}
		}

		if coverage {
			runArgs = append(runArgs, "--", "--coverage")
		}
		if filter != "" {
			runArgs = append(runArgs, "--", "-t", filter)
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Testing", pkgName, dir, runArgs)
	},
}

// --- gw build ---

var buildCmd = &cobra.Command{
	Use:   "build",
	Short: "Build a package",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		clean, _ := cmd.Flags().GetBool("clean")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			runArgs := []string{"pnpm", "-r", "run", "build"}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Building all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		if clean {
			// Clean build artifacts
			for _, artifact := range []string{"dist", ".svelte-kit", "build", filepath.Join("node_modules", ".cache")} {
				os.RemoveAll(filepath.Join(dir, artifact))
			}
			if !cfg.JSONMode {
				ui.Step(true, "Cleaned build artifacts")
			}
		}

		runArgs := []string{"pnpm", "run", "build"}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Building", pkgName, dir, runArgs)
	},
}

// --- gw check ---

var checkCmd = &cobra.Command{
	Use:   "check",
	Short: "Type-check a package",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		watch, _ := cmd.Flags().GetBool("watch")
		strict, _ := cmd.Flags().GetBool("strict")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			runArgs := []string{"pnpm", "-r", "run", "check"}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Type checking all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		var runArgs []string
		if packageHasScript(dir, "check") {
			runArgs = []string{"pnpm", "run", "check"}
		} else {
			runArgs = []string{"pnpm", "exec", "svelte-check", "--tsconfig", "./tsconfig.json"}
		}

		if watch {
			runArgs = append(runArgs, "--", "--watch")
		}
		if strict {
			runArgs = append(runArgs, "--", "--fail-on-warnings")
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Type checking", pkgName, dir, runArgs)
	},
}

// --- gw lint ---

var lintCmd = &cobra.Command{
	Use:   "lint",
	Short: "Lint a package",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		fix, _ := cmd.Flags().GetBool("fix")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			script := "lint"
			if fix {
				script = "lint:fix"
			}
			runArgs := []string{"pnpm", "-r", "run", script}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Linting all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		var runArgs []string
		if fix {
			if packageHasScript(dir, "lint:fix") {
				runArgs = []string{"pnpm", "run", "lint:fix"}
			} else {
				runArgs = []string{"pnpm", "exec", "eslint", "src", "--fix"}
			}
		} else {
			if packageHasScript(dir, "lint") {
				runArgs = []string{"pnpm", "run", "lint"}
			} else {
				runArgs = []string{"pnpm", "exec", "eslint", "src"}
			}
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Linting", pkgName, dir, runArgs)
	},
}

// --- gw fmt ---

var fmtCmd = &cobra.Command{
	Use:   "fmt",
	Short: "Format code",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		checkOnly, _ := cmd.Flags().GetBool("check")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			script := "format"
			if checkOnly {
				script = "format:check"
			}
			runArgs := []string{"pnpm", "-r", "run", script}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			label := "Formatting all packages"
			if checkOnly {
				label = "Checking format for all packages"
			}
			return runMonorepoCommand(cfg, label, runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		var runArgs []string
		if checkOnly {
			if packageHasScript(dir, "format:check") {
				runArgs = []string{"pnpm", "run", "format:check"}
			} else {
				runArgs = []string{"pnpm", "exec", "prettier", "--check",
					"src/**/*.{ts,js,svelte,css,json}", "*.{ts,js,json}"}
			}
		} else {
			if packageHasScript(dir, "format") {
				runArgs = []string{"pnpm", "run", "format"}
			} else {
				runArgs = []string{"pnpm", "exec", "prettier", "--write",
					"src/**/*.{ts,js,svelte,css,json}", "*.{ts,js,json}"}
			}
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		label := "Formatting"
		if checkOnly {
			label = "Checking format for"
		}
		return runInPackage(cfg, label, pkgName, dir, runArgs)
	},
}

// --- gw ci ---

// ciStep represents a single CI pipeline step.
type ciStep struct {
	Name     string  `json:"name"`
	Passed   bool    `json:"passed"`
	Duration float64 `json:"duration"`
	Skipped  bool    `json:"skipped,omitempty"`
}

var ciCmd = &cobra.Command{
	Use:   "ci",
	Short: "Run full CI pipeline",
	Long: `Run full CI pipeline: lint → check → test → build.

Supports --affected to only run CI for packages with uncommitted changes.
Supports --skip-* flags to skip individual steps.
Supports --diagnose for structured error output.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		affected, _ := cmd.Flags().GetBool("affected")
		skipLint, _ := cmd.Flags().GetBool("skip-lint")
		skipCheck, _ := cmd.Flags().GetBool("skip-check")
		skipTest, _ := cmd.Flags().GetBool("skip-test")
		skipBuild, _ := cmd.Flags().GetBool("skip-build")
		failFast, _ := cmd.Flags().GetBool("fail-fast")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		root := cfg.GroveRoot

		// Determine scope
		var scope string
		var filterArgs []string
		if pkg != "" {
			scope = pkg
			filterArgs = []string{"--filter", pkg}
		} else if affected {
			affectedPkgs := detectAffectedCIPackages(root)
			if len(affectedPkgs) == 0 {
				if cfg.JSONMode {
					data, _ := json.Marshal(map[string]interface{}{
						"passed": true, "steps": []ciStep{}, "affected_packages": []string{},
					})
					fmt.Println(string(data))
				} else {
					ui.Success("No affected packages — nothing to check")
				}
				return nil
			}
			scope = strings.Join(affectedPkgs, ", ")
			for _, p := range affectedPkgs {
				filterArgs = append(filterArgs, "--filter", p)
			}
		} else {
			scope = "all"
		}

		// Define pipeline steps
		type stepDef struct {
			name string
			skip bool
			args []string
		}

		steps := []stepDef{
			{"lint", skipLint, append([]string{"pnpm"}, append(filterArgs, "run", "lint")...)},
			{"check", skipCheck, append([]string{"pnpm"}, append(filterArgs, "run", "check")...)},
			{"test", skipTest, append([]string{"pnpm"}, append(filterArgs, "run", "test:run")...)},
			{"build", skipBuild, append([]string{"pnpm"}, append(filterArgs, "run", "build")...)},
		}

		// For "all" scope with no filters, use -r
		if len(filterArgs) == 0 {
			for i := range steps {
				steps[i].args = []string{"pnpm", "-r", "run", steps[i].name}
				if steps[i].name == "test" {
					steps[i].args = []string{"pnpm", "-r", "run", "test:run"}
				}
			}
		}

		if dryRun {
			var drySteps []map[string]interface{}
			for _, s := range steps {
				if s.skip {
					continue
				}
				drySteps = append(drySteps, map[string]interface{}{
					"name":    s.name,
					"command": s.args,
				})
			}
			data, _ := json.MarshalIndent(map[string]interface{}{
				"dry_run": true, "scope": scope, "steps": drySteps,
			}, "", "  ")
			fmt.Println(string(data))
			return nil
		}

		if !cfg.JSONMode {
			ui.PrintHeader(fmt.Sprintf("Grove CI Pipeline (%s)", scope))
		}

		var results []ciStep
		allPassed := true
		totalStart := time.Now()

		for _, s := range steps {
			if s.skip {
				results = append(results, ciStep{Name: s.name, Passed: true, Skipped: true})
				continue
			}

			if !cfg.JSONMode {
				fmt.Printf("  > %s...\n", capitalizeFirst(s.name))
			}

			start := time.Now()
			result, err := exec.RunWithTimeout(5*time.Minute, s.args[0], s.args[1:]...)
			duration := time.Since(start).Seconds()

			passed := err == nil && result != nil && result.OK()
			results = append(results, ciStep{
				Name: s.name, Passed: passed, Duration: duration,
			})

			if !cfg.JSONMode {
				ui.Step(passed, fmt.Sprintf("%s (%.1fs)", capitalizeFirst(s.name), duration))
			}

			if !passed {
				allPassed = false
				if failFast {
					break
				}
			}
		}

		totalDuration := time.Since(totalStart).Seconds()

		if cfg.JSONMode {
			data, _ := json.MarshalIndent(map[string]interface{}{
				"passed":   allPassed,
				"duration": totalDuration,
				"scope":    scope,
				"steps":    results,
			}, "", "  ")
			fmt.Println(string(data))
		} else {
			fmt.Println()
			if allPassed {
				ui.Success(fmt.Sprintf("CI passed in %.1fs", totalDuration))
			} else {
				var failed []string
				for _, r := range results {
					if !r.Passed && !r.Skipped {
						failed = append(failed, r.Name)
					}
				}
				ui.Error(fmt.Sprintf("CI failed: %s", strings.Join(failed, ", ")))
			}
		}

		if !allPassed {
			os.Exit(1)
		}
		return nil
	},
}

// detectAffectedCIPackages returns package names affected by uncommitted changes.
func detectAffectedCIPackages(root string) []string {
	result, err := exec.Git("status", "--porcelain")
	if err != nil || !result.OK() {
		return nil
	}

	affected := map[string]bool{}
	for _, line := range result.Lines() {
		if len(line) < 4 {
			continue
		}
		file := strings.TrimSpace(line[3:])
		// Map file path to package
		for _, prefix := range []string{"packages/", "apps/", "services/", "workers/", "libs/"} {
			if strings.HasPrefix(file, prefix) {
				parts := strings.SplitN(strings.TrimPrefix(file, prefix), "/", 2)
				if len(parts) > 0 {
					affected[parts[0]] = true
				}
			}
		}
	}

	var pkgs []string
	for pkg := range affected {
		pkgs = append(pkgs, pkg)
	}
	return pkgs
}

// runInPackage runs a command in a specific package directory.
func runInPackage(cfg *config.Config, label, pkgName, dir string, cmdArgs []string) error {
	if !cfg.JSONMode {
		fmt.Printf("  %s %s...\n", label, pkgName)
	}

	// Save cwd and change to package dir
	origDir, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		return fmt.Errorf("cannot enter package directory: %w", err)
	}
	defer os.Chdir(origDir)

	result, err := exec.RunWithTimeout(5*time.Minute, cmdArgs[0], cmdArgs[1:]...)
	if err != nil {
		return fmt.Errorf("%s failed: %w", label, err)
	}

	if cfg.JSONMode {
		data, _ := json.Marshal(map[string]interface{}{
			"package": pkgName,
			"passed":  result.OK(),
		})
		fmt.Println(string(data))
	} else {
		if result.OK() {
			ui.Step(true, fmt.Sprintf("%s %s", label, pkgName))
		} else {
			ui.Step(false, fmt.Sprintf("%s %s", label, pkgName))
			if result.Stderr != "" {
				fmt.Println(result.Stderr)
			}
			if result.Stdout != "" {
				fmt.Println(result.Stdout)
			}
			os.Exit(1)
		}
	}
	return nil
}

// runMonorepoCommand runs a monorepo-wide command from root.
func runMonorepoCommand(cfg *config.Config, label string, cmdArgs []string) error {
	root := cfg.GroveRoot

	if !cfg.JSONMode {
		fmt.Printf("  %s...\n", label)
	}

	origDir, _ := os.Getwd()
	if err := os.Chdir(root); err != nil {
		return fmt.Errorf("cannot enter monorepo root: %w", err)
	}
	defer os.Chdir(origDir)

	result, err := exec.RunWithTimeout(10*time.Minute, cmdArgs[0], cmdArgs[1:]...)
	if err != nil {
		return fmt.Errorf("%s failed: %w", label, err)
	}

	if cfg.JSONMode {
		data, _ := json.Marshal(map[string]interface{}{
			"passed": result.OK(),
		})
		fmt.Println(string(data))
	} else {
		ui.Step(result.OK(), label)
		if !result.OK() {
			if result.Stderr != "" {
				fmt.Println(result.Stderr)
			}
			os.Exit(1)
		}
	}
	return nil
}

// printDryRun outputs a dry-run JSON summary.
func printDryRun(cfg *config.Config, pkg string, cmdArgs []string) error {
	data, _ := json.MarshalIndent(map[string]interface{}{
		"dry_run": true,
		"package": pkg,
		"command": cmdArgs,
	}, "", "  ")
	fmt.Println(string(data))
	return nil
}

// capitalizeFirst capitalizes the first letter of a string.
func capitalizeFirst(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// aliasCmd creates a top-level alias that shares RunE and flags with the original.
func aliasCmd(use, short string, original *cobra.Command) *cobra.Command {
	alias := &cobra.Command{
		Use:   use,
		Short: short,
		RunE:  original.RunE,
	}
	original.Flags().VisitAll(func(f *pflag.Flag) {
		alias.Flags().AddFlag(f)
	})
	return alias
}

func init() {
	// --- Register flags FIRST (before aliases copy them) ---

	// test flags
	testCmd.Flags().StringP("package", "p", "", "Package name")
	testCmd.Flags().Bool("all", false, "Run tests for all packages")
	testCmd.Flags().BoolP("watch", "w", false, "Watch mode")
	testCmd.Flags().BoolP("coverage", "c", false, "Generate coverage report")
	testCmd.Flags().StringP("filter", "k", "", "Filter tests by name")
	testCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// build flags
	buildCmd.Flags().StringP("package", "p", "", "Package name")
	buildCmd.Flags().Bool("all", false, "Build all packages")
	buildCmd.Flags().Bool("clean", false, "Clean build artifacts first")
	buildCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// check flags
	checkCmd.Flags().StringP("package", "p", "", "Package name")
	checkCmd.Flags().Bool("all", false, "Check all packages")
	checkCmd.Flags().BoolP("watch", "w", false, "Watch mode")
	checkCmd.Flags().Bool("strict", false, "Strict mode (fail on warnings)")
	checkCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// lint flags
	lintCmd.Flags().StringP("package", "p", "", "Package name")
	lintCmd.Flags().Bool("all", false, "Lint all packages")
	lintCmd.Flags().Bool("fix", false, "Auto-fix issues where possible")
	lintCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// fmt flags
	fmtCmd.Flags().StringP("package", "p", "", "Package name")
	fmtCmd.Flags().Bool("all", false, "Format all packages")
	fmtCmd.Flags().Bool("check", false, "Check only (don't write changes)")
	fmtCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// ci flags
	ciCmd.Flags().StringP("package", "p", "", "Run CI for specific package")
	ciCmd.Flags().Bool("affected", false, "Only run CI for affected packages")
	ciCmd.Flags().Bool("skip-lint", false, "Skip linting step")
	ciCmd.Flags().Bool("skip-check", false, "Skip type checking step")
	ciCmd.Flags().Bool("skip-test", false, "Skip testing step")
	ciCmd.Flags().Bool("skip-build", false, "Skip build step")
	ciCmd.Flags().Bool("fail-fast", false, "Stop on first failure")
	ciCmd.Flags().Bool("diagnose", false, "Show structured error diagnostics")
	ciCmd.Flags().Bool("dry-run", false, "Preview all steps without execution")

	// --- dev subcommands ---
	devCmd.AddCommand(testCmd)
	devCmd.AddCommand(buildCmd)
	devCmd.AddCommand(checkCmd)
	devCmd.AddCommand(lintCmd)
	devCmd.AddCommand(fmtCmd)
	devCmd.AddCommand(ciCmd)

	// --- top-level aliases (flags already registered, safe to copy) ---
	rootCmd.AddCommand(aliasCmd("test", "Run tests (alias for dev test)", testCmd))
	rootCmd.AddCommand(aliasCmd("build", "Build a package (alias for dev build)", buildCmd))
	rootCmd.AddCommand(aliasCmd("check", "Type-check a package (alias for dev check)", checkCmd))
	rootCmd.AddCommand(aliasCmd("lint", "Lint a package (alias for dev lint)", lintCmd))
	rootCmd.AddCommand(aliasCmd("ci", "Run full CI pipeline (alias for dev ci)", ciCmd))
}
