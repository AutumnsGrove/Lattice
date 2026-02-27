package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/cobra"

	cfcloud "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/cloudflare"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/heartwood"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

var contextCmd = &cobra.Command{
	Use:   "context",
	Short: "Session context — start every session here",
	Long:  "Show current git branch, file counts, recent commits, affected packages, and TODOs in changed files.",
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return notARepo()
		}
		cfg := config.Get()

		// Gather context data
		branch, _ := gwexec.CurrentBranch()
		statusOut, _ := gwexec.GitOutput("status", "--porcelain=v1")
		logOut, _ := gwexec.GitOutput("log", "--oneline", "-n5")
		stashOut, _ := gwexec.GitOutput("stash", "list")

		// Count file categories
		staged, unstaged, untracked := 0, 0, 0
		var changedFiles []string
		for _, line := range strings.Split(statusOut, "\n") {
			if len(line) < 3 {
				continue
			}
			x, y := line[0], line[1]
			path := strings.TrimSpace(line[3:])
			if x == '?' {
				untracked++
			} else {
				if x != ' ' {
					staged++
				}
				if y != ' ' {
					unstaged++
				}
			}
			changedFiles = append(changedFiles, path)
		}

		// Detect affected packages from changed files
		packages := detectAffectedPackages(changedFiles)

		// Count stashes
		stashCount := 0
		for _, line := range strings.Split(stashOut, "\n") {
			if strings.TrimSpace(line) != "" {
				stashCount++
			}
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"branch":            branch,
				"staged":            staged,
				"unstaged":          unstaged,
				"untracked":         untracked,
				"stash_count":       stashCount,
				"affected_packages": packages,
				"recent_commits":    strings.Split(strings.TrimSpace(logOut), "\n"),
			})
		}

		// Rich panel output
		pairs := [][2]string{}
		if branch != "" {
			pairs = append(pairs, [2]string{"branch", ui.CommandStyle.Render(branch)})
		}
		pairs = append(pairs,
			[2]string{"staged", fmt.Sprintf("%d", staged)},
			[2]string{"unstaged", fmt.Sprintf("%d", unstaged)},
			[2]string{"untracked", fmt.Sprintf("%d", untracked)},
		)
		if stashCount > 0 {
			pairs = append(pairs, [2]string{"stashes", fmt.Sprintf("%d", stashCount)})
		}
		if len(packages) > 0 {
			sort.Strings(packages)
			pairs = append(pairs, [2]string{"packages", strings.Join(packages, ", ")})
		}
		fmt.Print(ui.RenderInfoPanel("gw context", pairs))

		// Recent commits
		if logOut != "" {
			fmt.Println(ui.SubtitleStyle.Render("  Recent Commits"))
			for _, line := range strings.Split(strings.TrimSpace(logOut), "\n") {
				if line != "" {
					fmt.Println("    " + line)
				}
			}
			fmt.Println()
		}

		return nil
	},
}

// detectAffectedPackages extracts unique package names from changed file paths.
func detectAffectedPackages(files []string) []string {
	seen := map[string]bool{}
	for _, f := range files {
		// Match apps/NAME/ or libs/NAME/ or tools/NAME/ patterns
		parts := strings.SplitN(filepath.ToSlash(f), "/", 3)
		if len(parts) >= 2 {
			prefix := parts[0]
			if prefix == "apps" || prefix == "libs" || prefix == "tools" {
				pkg := prefix + "/" + parts[1]
				seen[pkg] = true
			}
		}
	}
	result := make([]string, 0, len(seen))
	for pkg := range seen {
		result = append(result, pkg)
	}
	return result
}

func init() {
	rootCmd.AddCommand(contextCmd)
}

// ── gw whoami ───────────────────────────────────────────────────────

var whoamiCmd = &cobra.Command{
	Use:   "whoami",
	Short: "Current context display",
	Long:  "Show who you are: Grove, Cloudflare, GitHub, project, and vault status.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		// Gather identity data
		cwd, _ := os.Getwd()
		branch, _ := gwexec.CurrentBranch()

		// Grove identity (from vault token)
		var groveEmail, groveName, groveRole string
		if token, err := getGroveToken(); err == nil && token != "" {
			hc := heartwood.NewClient(cfg.Grove.AuthBaseURL, token)
			if user, err := hc.GetUserInfo(); err == nil {
				groveEmail = user.Email
				groveName = user.Name
				groveRole = user.Role
			}
		}

		// Cloudflare — cached, skippable with --no-cloud
		var cfOut string
		if !cfg.NoCloud {
			_ = ui.RunWithSpinner("Checking Cloudflare auth", func() error {
				var err error
				cfOut, err = cfcloud.WranglerAuth()
				return err
			})
		}
		cfEmail := extractField(cfOut, "email")

		// GitHub (via gh)
		ghOut, _ := gwexec.GHOutput("auth", "status")

		// Vault
		home, _ := os.UserHomeDir()
		vaultPath := filepath.Join(home, ".grove", "secrets.enc")
		_, vaultErr := os.Stat(vaultPath)
		vaultExists := vaultErr == nil

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"grove": map[string]any{
					"email":         groveEmail,
					"name":          groveName,
					"role":          groveRole,
					"tenant":        cfg.Grove.Tenant,
					"authenticated": groveEmail != "",
				},
				"cloudflare": map[string]any{
					"email":         cfEmail,
					"authenticated": cfEmail != "",
					"skipped":       cfg.NoCloud,
				},
				"project": map[string]any{
					"directory":  cwd,
					"branch":     branch,
					"grove_root": cfg.GroveRoot,
				},
				"vault": map[string]any{
					"initialized": vaultExists,
				},
			})
		}

		fmt.Println(ui.TitleStyle.Render("gw whoami"))
		fmt.Println()

		// Grove
		if groveEmail != "" {
			ui.Step(true, fmt.Sprintf("Grove: %s (%s) [%s]", groveName, groveEmail, groveRole))
			if cfg.Grove.Tenant != "" {
				ui.Step(true, fmt.Sprintf("Tenant: %s", cfg.Grove.Tenant))
			}
		} else {
			ui.Step(false, "Grove: not authenticated (run `gw login`)")
		}

		// Cloudflare
		if cfg.NoCloud {
			ui.Step(false, "Cloudflare: skipped (--no-cloud)")
		} else if cfEmail != "" {
			ui.Step(true, fmt.Sprintf("Cloudflare: %s", cfEmail))
		} else {
			ui.Step(false, "Cloudflare: not authenticated")
		}

		// GitHub
		if ghOut != "" && !strings.Contains(ghOut, "not logged") {
			ui.Step(true, "GitHub: authenticated")
		} else {
			ui.Step(false, "GitHub: not authenticated")
		}

		// Project
		fmt.Println()
		projectPairs := [][2]string{
			{"directory", cwd},
			{"grove root", cfg.GroveRoot},
		}
		if branch != "" {
			projectPairs = append(projectPairs, [2]string{"branch", branch})
		}
		fmt.Print(ui.RenderInfoPanel("project", projectPairs))

		// Vault
		if vaultExists {
			ui.Step(true, "Vault: initialized")
		} else {
			ui.Step(false, "Vault: not initialized")
		}

		fmt.Println()
		return nil
	},
}

// extractField extracts a simple key-value from multiline text.
func extractField(text, key string) string {
	for _, line := range strings.Split(text, "\n") {
		lower := strings.ToLower(line)
		if strings.Contains(lower, key) {
			// Try to extract value after colon or equals
			if idx := strings.Index(line, ":"); idx >= 0 {
				return strings.TrimSpace(line[idx+1:])
			}
			if idx := strings.Index(line, "="); idx >= 0 {
				return strings.TrimSpace(line[idx+1:])
			}
		}
	}
	return ""
}

func init() {
	rootCmd.AddCommand(whoamiCmd)
}
