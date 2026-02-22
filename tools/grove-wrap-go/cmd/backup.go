package cmd

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// backupCmd is the parent command for D1 backup operations.
var backupCmd = &cobra.Command{
	Use:   "backup",
	Short: "D1 database backup operations",
	Long:  "D1 database backup operations wrapped with Grove's safety-tiered interface.",
}

// --- backup list ---

var backupListCmd = &cobra.Command{
	Use:   "list",
	Short: "List database backups",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName := resolveDatabase(dbAlias)

		output, err := exec.WranglerOutput("d1", "backup", "list", dbName, "--json")
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		var backups []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &backups); err != nil {
			// Try array wrapper
			var wrapper []map[string]interface{}
			if json.Unmarshal([]byte(output), &wrapper) == nil && len(wrapper) > 0 {
				if results, ok := wrapper[0]["results"].([]interface{}); ok {
					backups = interfaceToMaps(results)
				}
			}
		}

		if cfg.JSONMode {
			result := map[string]interface{}{
				"database": dbName,
				"backups":  backups,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		if len(backups) == 0 {
			ui.Muted("No backups found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Backups for %s (%d)", dbName, len(backups)))
		for _, b := range backups {
			id := fmt.Sprintf("%v", b["id"])
			if len(id) > 12 {
				id = id[:12] + "..."
			}
			created := ""
			if c, ok := b["created_at"].(string); ok {
				if len(c) > 19 {
					c = c[:19]
				}
				created = strings.ReplaceAll(c, "T", " ")
			}
			state := fmt.Sprintf("%v", b["state"])

			ui.PrintKeyValue(
				fmt.Sprintf("  %-16s", id),
				fmt.Sprintf("%-20s %s", created, state),
			)
		}

		return nil
	},
}

// --- backup create ---

var backupCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a database backup",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("backup_create"); err != nil {
			return err
		}

		cfg := config.Get()
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName := resolveDatabase(dbAlias)

		if !cfg.JSONMode {
			ui.Info(fmt.Sprintf("Creating backup of %s...", dbName))
		}

		output, err := exec.WranglerOutput("d1", "backup", "create", dbName, "--json")
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			var backupData json.RawMessage
			json.Unmarshal([]byte(output), &backupData)
			result := map[string]interface{}{
				"database": dbName,
				"backup":   backupData,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Backup created for %s", dbName))
		}
		return nil
	},
}

// --- backup download ---

var backupDownloadCmd = &cobra.Command{
	Use:   "download <backup_id>",
	Short: "Download a database backup",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		backupID := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")
		outputFile, _ := cmd.Flags().GetString("output")
		dbName := resolveDatabase(dbAlias)

		if outputFile == "" {
			short := backupID
			if len(short) > 8 {
				short = short[:8]
			}
			outputFile = fmt.Sprintf("%s-%s.sql", dbName, short)
		}

		wranglerArgs := []string{"d1", "backup", "download", dbName, backupID, "--output", outputFile}

		result, err := exec.Wrangler(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		absPath, _ := filepath.Abs(outputFile)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"database":  dbName,
				"backup_id": backupID,
				"file":      absPath,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Downloaded backup: %s → %s", backupID, absPath))
		}
		return nil
	},
}

// --- backup restore ---

var backupRestoreCmd = &cobra.Command{
	Use:   "restore <backup_id>",
	Short: "Restore a database from backup",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("backup_restore"); err != nil {
			return err
		}

		cfg := config.Get()
		backupID := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName := resolveDatabase(dbAlias)

		if !cfg.JSONMode {
			ui.Warning(fmt.Sprintf("Restoring %s from backup %s", dbName, backupID))
			ui.Warning("All current data will be replaced!")
		}

		result, err := exec.Wrangler("d1", "backup", "restore", dbName, backupID)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("restore failed: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"database":  dbName,
				"backup_id": backupID,
				"restored":  true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Restored %s from backup %s", dbName, backupID))
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(backupCmd)

	// backup list
	backupListCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	backupCmd.AddCommand(backupListCmd)

	// backup create
	backupCreateCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	backupCmd.AddCommand(backupCreateCmd)

	// backup download
	backupDownloadCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	backupDownloadCmd.Flags().StringP("output", "o", "", "Output file path")
	backupCmd.AddCommand(backupDownloadCmd)

	// backup restore
	backupRestoreCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	backupCmd.AddCommand(backupRestoreCmd)
}
