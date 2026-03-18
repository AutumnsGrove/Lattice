package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// releaseCmd is the parent command for release management operations.
var releaseCmd = &cobra.Command{
	Use:   "release",
	Short: "Release management operations",
	Long:  "Manage Grove release artifacts — summaries, snapshots, and CI dispatch.",
}

// releaseRegenerateCmd regenerates the AI summary for a specific version tag via CI.
var releaseRegenerateCmd = &cobra.Command{
	Use:   "regenerate <tag>",
	Short: "Regenerate a release summary via CI",
	Long: `Regenerate the AI release summary for a specific version tag using GitHub Actions.

Deletes the existing snapshot summary (if present), commits and pushes the deletion,
then dispatches the backfill workflow — which runs with OPENROUTER_API_KEY from GitHub
secrets and commits the new summary back to main automatically.

Requires --write (commits to main and triggers a CI job).`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		tag := args[0]

		// Validate tag format — must be vMAJOR.MINOR.PATCH (or longer semver)
		tagPattern := regexp.MustCompile(`^v\d+\.\d+\.\d+`)
		if !tagPattern.MatchString(tag) {
			return fmt.Errorf("invalid tag %q — expected semver format like v1.2.3", tag)
		}

		// Safety check first — this commits to main and triggers CI
		if err := requireGHSafety("release_regenerate"); err != nil {
			return err
		}

		// Resolve summary file path
		summaryRel := filepath.Join("snapshots", "summaries", tag+".json")
		summaryAbs := filepath.Join(cfg.GroveRoot, summaryRel)
		summaryExists := false
		if _, err := os.Stat(summaryAbs); err == nil {
			summaryExists = true
		}

		steps := []ui.StepItem{}

		// Step 1: remove existing summary so the backfill job doesn't skip this tag
		if summaryExists {
			if !cfg.JSONMode {
				ui.Info(fmt.Sprintf("Removing %s", summaryRel))
			}

			if _, err := exec.GitOutput("rm", summaryAbs); err != nil {
				steps = append(steps, ui.StepItem{OK: false, Label: "git rm " + summaryRel})
				if !cfg.JSONMode {
					fmt.Print(ui.RenderStepList("Release Regenerate", steps))
				}
				return fmt.Errorf("git rm failed: %w", err)
			}
			steps = append(steps, ui.StepItem{OK: true, Label: "removed " + summaryRel})

			commitMsg := fmt.Sprintf("chore(ci): clear %s summary for regeneration", tag)
			if _, err := exec.GitOutput("commit", "-m", commitMsg); err != nil {
				steps = append(steps, ui.StepItem{OK: false, Label: "commit deletion"})
				if !cfg.JSONMode {
					fmt.Print(ui.RenderStepList("Release Regenerate", steps))
				}
				return fmt.Errorf("git commit failed: %w", err)
			}
			steps = append(steps, ui.StepItem{OK: true, Label: "committed deletion"})

			if _, err := exec.GitOutput("push", "origin", "main"); err != nil {
				steps = append(steps, ui.StepItem{OK: false, Label: "push to origin/main"})
				if !cfg.JSONMode {
					fmt.Print(ui.RenderStepList("Release Regenerate", steps))
				}
				return fmt.Errorf("git push failed: %w", err)
			}
			steps = append(steps, ui.StepItem{OK: true, Label: "pushed to origin/main"})
		} else {
			steps = append(steps, ui.StepItem{OK: true, Label: fmt.Sprintf("no existing summary for %s — skipping deletion", tag)})
		}

		// Step 2: dispatch the backfill workflow via GitHub API
		owner := cfg.GitHub.Owner
		repo := cfg.GitHub.Repo
		endpoint := fmt.Sprintf("repos/%s/%s/actions/workflows/auto-tag.yml/dispatches", owner, repo)

		if _, err := exec.GHOutput(
			"api", endpoint,
			"-X", "POST",
			"-f", "ref=main",
			"-f", "inputs[backfill_summaries]=true",
		); err != nil {
			steps = append(steps, ui.StepItem{OK: false, Label: "dispatch backfill workflow"})
			if !cfg.JSONMode {
				fmt.Print(ui.RenderStepList("Release Regenerate", steps))
			}
			return fmt.Errorf("workflow dispatch failed: %w", err)
		}
		steps = append(steps, ui.StepItem{OK: true, Label: "dispatched backfill workflow (auto-tag.yml)"})

		// Output
		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"tag":             tag,
				"summary_existed": summaryExists,
				"workflow":        "auto-tag.yml",
				"dispatched":      true,
			})
			fmt.Println(string(data))
		} else {
			fmt.Print(ui.RenderStepList("Release Regenerate", steps))
			fmt.Printf("\n  Follow progress:  gw gh run list\n\n")
		}

		return nil
	},
}

var releaseHelpCategories = []ui.HelpCategory{
	{
		Title: "Summaries",
		Icon:  "📝",
		Style: lipglossStyle(ui.LeafYellow),
		Commands: []ui.HelpCommand{
			{Name: "regenerate <tag>", Desc: "Regenerate a release summary via CI  [--write]"},
		},
	},
}

func init() {
	rootCmd.AddCommand(releaseCmd)
	releaseCmd.AddCommand(releaseRegenerateCmd)

	releaseCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp(
			"gw release",
			"Release management operations",
			releaseHelpCategories,
			true,
		)
		fmt.Print(output)
	})
}
