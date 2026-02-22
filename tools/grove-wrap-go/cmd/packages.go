package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// packageDirs are the top-level directories scanned for packages.
var packageDirs = []string{"packages", "apps", "services", "workers", "libs", "tools"}

// packageInfo holds discovered metadata for a single monorepo package.
type packageInfo struct {
	Name    string            `json:"name"`
	Path    string            `json:"path"`
	Type    string            `json:"type"`
	Scripts map[string]string `json:"scripts,omitempty"`
}

var packagesCmd = &cobra.Command{
	Use:   "packages",
	Short: "List monorepo packages",
	Long:  "Discover and list all packages in the monorepo by type.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		typeFilter, _ := cmd.Flags().GetString("type")

		root := cfg.GroveRoot
		pkgs := discoverPackages(root)

		// Apply type filter
		if typeFilter != "" {
			filtered := make([]packageInfo, 0)
			for _, p := range pkgs {
				if strings.EqualFold(p.Type, typeFilter) {
					filtered = append(filtered, p)
				}
			}
			pkgs = filtered
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"root":     root,
				"count":    len(pkgs),
				"packages": pkgs,
			})
		}

		// Rich output
		fmt.Println(ui.TitleStyle.Render("gw packages"))
		fmt.Println()

		if len(pkgs) == 0 {
			fmt.Println("  No packages found.")
			fmt.Println()
			return nil
		}

		// Group by type
		grouped := map[string][]packageInfo{}
		typeOrder := []string{}
		for _, p := range pkgs {
			if _, exists := grouped[p.Type]; !exists {
				typeOrder = append(typeOrder, p.Type)
			}
			grouped[p.Type] = append(grouped[p.Type], p)
		}
		sort.Strings(typeOrder)

		for _, t := range typeOrder {
			group := grouped[t]
			fmt.Printf("  %s (%d)\n", ui.SubtitleStyle.Render(t), len(group))
			for _, p := range group {
				scripts := availableScripts(p.Scripts)
				if scripts != "" {
					fmt.Printf("    %-30s %s\n", p.Name, ui.HintStyle.Render(scripts))
				} else {
					fmt.Printf("    %s\n", p.Name)
				}
			}
			fmt.Println()
		}

		fmt.Printf("  Total: %d packages\n", len(pkgs))
		fmt.Println()
		return nil
	},
}

var packagesCurrentCmd = &cobra.Command{
	Use:   "current",
	Short: "Detect which package the current directory is in",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		root := cfg.GroveRoot
		cwd, _ := os.Getwd()

		pkg := detectCurrentPackage(root, cwd)

		if cfg.JSONMode {
			if pkg != nil {
				return printJSON(map[string]any{
					"in_package": true,
					"package":    pkg,
				})
			}
			return printJSON(map[string]any{
				"in_package": false,
			})
		}

		if pkg != nil {
			fmt.Printf("  Package: %s (%s)\n", ui.CommandStyle.Render(pkg.Name), pkg.Type)
			fmt.Printf("  Path:    %s\n", pkg.Path)
		} else {
			fmt.Println("  Not inside a package directory.")
		}
		return nil
	},
}

// discoverPackages scans the monorepo for packages under known directories.
func discoverPackages(root string) []packageInfo {
	var pkgs []packageInfo

	for _, dir := range packageDirs {
		base := filepath.Join(root, dir)
		entries, err := os.ReadDir(base)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") || strings.HasPrefix(entry.Name(), "_") {
				continue
			}
			pkgPath := filepath.Join(base, entry.Name())
			pkgType := detectPackageType(pkgPath)
			if pkgType == "" {
				continue
			}

			info := packageInfo{
				Name: dir + "/" + entry.Name(),
				Path: pkgPath,
				Type: pkgType,
			}

			// Read scripts from package.json if it exists
			info.Scripts = readPackageScripts(pkgPath)

			pkgs = append(pkgs, info)
		}
	}

	sort.Slice(pkgs, func(i, j int) bool {
		return pkgs[i].Name < pkgs[j].Name
	})
	return pkgs
}

// detectPackageType identifies the package type by checking marker files.
func detectPackageType(dir string) string {
	if fileExists(filepath.Join(dir, "build.zig")) {
		return "zig"
	}
	if fileExists(filepath.Join(dir, "pyproject.toml")) {
		return "python"
	}
	if fileExists(filepath.Join(dir, "go.mod")) {
		return "go"
	}
	if fileExists(filepath.Join(dir, "package.json")) {
		if fileExists(filepath.Join(dir, "svelte.config.js")) {
			return "sveltekit"
		}
		if fileExists(filepath.Join(dir, "wrangler.toml")) || fileExists(filepath.Join(dir, "wrangler.jsonc")) {
			return "worker"
		}
		return "library"
	}
	return ""
}

// detectCurrentPackage finds which package the given path is inside.
func detectCurrentPackage(root, cwd string) *packageInfo {
	pkgs := discoverPackages(root)
	for _, p := range pkgs {
		if strings.HasPrefix(cwd, p.Path) {
			return &p
		}
	}
	return nil
}

// readPackageScripts reads the "scripts" field from package.json.
func readPackageScripts(dir string) map[string]string {
	data, err := os.ReadFile(filepath.Join(dir, "package.json"))
	if err != nil {
		return nil
	}
	var pkg struct {
		Scripts map[string]string `json:"scripts"`
	}
	if json.Unmarshal(data, &pkg) != nil {
		return nil
	}
	return pkg.Scripts
}

// availableScripts returns a summary of key scripts present.
func availableScripts(scripts map[string]string) string {
	if len(scripts) == 0 {
		return ""
	}
	var found []string
	for _, key := range []string{"dev", "build", "test", "check", "lint"} {
		if _, ok := scripts[key]; ok {
			found = append(found, key)
		}
	}
	if len(found) == 0 {
		return ""
	}
	return "[" + strings.Join(found, ", ") + "]"
}

// fileExists returns true if the path exists and is not a directory.
func fileExists(path string) bool {
	fi, err := os.Stat(path)
	return err == nil && !fi.IsDir()
}

func init() {
	packagesCmd.Flags().StringP("type", "t", "", "Filter by package type (sveltekit, worker, library, python, go, zig)")
	packagesCmd.AddCommand(packagesCurrentCmd)
	rootCmd.AddCommand(packagesCmd)
}
