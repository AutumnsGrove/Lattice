package cmd

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// deployCmd deploys a Cloudflare Worker.
var deployCmd = &cobra.Command{
	Use:   "deploy [worker]",
	Short: "Deploy a Cloudflare Worker",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		worker := "grove-lattice"
		if len(args) > 0 {
			worker = args[0]
			if err := validateCFName(worker, "worker"); err != nil {
				return err
			}
		}
		env, _ := cmd.Flags().GetString("env")
		if env != "" {
			if err := validateCFName(env, "environment"); err != nil {
				return err
			}
		}
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		minify, _ := cmd.Flags().GetBool("minify")
		keepVars, _ := cmd.Flags().GetBool("keep-vars")

		// Dry-run doesn't need --write
		if !dryRun {
			if err := requireCFSafety("deploy"); err != nil {
				return err
			}
		}

		wranglerArgs := []string{"deploy"}
		if env != "" {
			wranglerArgs = append(wranglerArgs, "--env", env)
		}
		if dryRun {
			wranglerArgs = append(wranglerArgs, "--dry-run")
		}
		if !minify {
			wranglerArgs = append(wranglerArgs, "--no-minify")
		}
		if keepVars {
			wranglerArgs = append(wranglerArgs, "--keep-vars")
		}

		result, err := exec.Wrangler(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("deploy failed: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"deployed": !dryRun,
				"worker":   worker,
				"env":      env,
				"dry_run":  dryRun,
				"output":   strings.TrimSpace(result.Stdout),
			})
			fmt.Println(string(data))
		} else {
			if dryRun {
				ui.Info("Dry-run deployment preview:")
				fmt.Println(result.Stdout)
			} else {
				ui.Success(fmt.Sprintf("Deployed: %s", worker))
				if env != "" {
					ui.Muted(fmt.Sprintf("Environment: %s", env))
				}
			}
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(deployCmd)

	deployCmd.Flags().StringP("env", "e", "", "Environment to deploy to")
	deployCmd.Flags().Bool("dry-run", false, "Preview deployment without deploying")
	deployCmd.Flags().Bool("minify", true, "Minify output")
	deployCmd.Flags().Bool("keep-vars", false, "Keep existing environment variables")
}
