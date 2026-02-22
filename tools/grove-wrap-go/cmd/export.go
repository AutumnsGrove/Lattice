package cmd

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// exportCmd is the parent command for storage export operations.
var exportCmd = &cobra.Command{
	Use:   "export",
	Short: "Storage export management",
	Long:  "Manage storage exports for Grove tenants.",
}

// generateExportUUID generates a UUID v4.
func generateExportUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate UUID: %w", err)
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16],
	), nil
}

// --- export list ---

var exportListCmd = &cobra.Command{
	Use:   "list [SUBDOMAIN]",
	Short: "List storage exports",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("export_list"); err != nil {
			return err
		}

		cfg := config.Get()
		limit, _ := cmd.Flags().GetInt("limit")
		dbAlias, _ := cmd.Flags().GetString("db")

		limit = clampD1Limit(limit)
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		var sql string
		if len(args) == 1 {
			sub := sanitizeSQL(args[0])
			sql = fmt.Sprintf(
				"SELECT e.id, e.status, e.progress, e.file_size_bytes, e.created_at, e.completed_at, e.expires_at, e.delivery_method, t.subdomain "+
					"FROM storage_exports e JOIN tenants t ON e.tenant_id = t.id "+
					"WHERE t.subdomain = '%s' ORDER BY e.created_at DESC LIMIT %d",
				sub, limit,
			)
		} else {
			sql = fmt.Sprintf(
				"SELECT e.id, e.status, e.progress, e.file_size_bytes, e.created_at, e.completed_at, e.expires_at, e.delivery_method, t.subdomain "+
					"FROM storage_exports e JOIN tenants t ON e.tenant_id = t.id "+
					"ORDER BY e.created_at DESC LIMIT %d",
				limit,
			)
		}

		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"exports": rows,
				"count":   len(rows),
			})
			fmt.Println(string(data))
			return nil
		}

		if len(rows) == 0 {
			ui.Muted("No exports found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Storage Exports (%d)", len(rows)))
		for _, row := range rows {
			id := formatD1Value(row["id"])
			if len(id) > 8 {
				id = id[:8] + "..."
			}
			status := formatD1Value(row["status"])
			subdomain := formatD1Value(row["subdomain"])
			created := formatD1Value(row["created_at"])

			ui.PrintKeyValue(
				fmt.Sprintf("%-14s", id),
				fmt.Sprintf("%-12s  subdomain: %-20s  created: %s", status, subdomain, truncDate(created)),
			)
		}

		return nil
	},
}

// --- export status ---

var exportStatusCmd = &cobra.Command{
	Use:   "status <export_id>",
	Short: "Check the status of an export",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("export_status"); err != nil {
			return err
		}

		cfg := config.Get()
		exportID := sanitizeSQL(args[0])
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		sql := fmt.Sprintf(
			"SELECT e.*, t.subdomain FROM storage_exports e JOIN tenants t ON e.tenant_id = t.id WHERE e.id = '%s'",
			exportID,
		)

		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"export": firstOrNil(rows),
				"found":  len(rows) > 0,
			})
			fmt.Println(string(data))
			return nil
		}

		if len(rows) == 0 {
			ui.Warning(fmt.Sprintf("Export not found: %s", args[0]))
			return nil
		}

		row := rows[0]
		ui.PrintHeader(fmt.Sprintf("Export: %s", args[0]))
		displayOrder := []string{
			"id", "status", "progress", "file_size_bytes",
			"delivery_method", "subdomain",
			"created_at", "completed_at", "expires_at",
		}
		for _, key := range displayOrder {
			if v, ok := row[key]; ok {
				ui.PrintKeyValue(fmt.Sprintf("%-20s", key), formatD1Value(v))
			}
		}

		return nil
	},
}

// --- export start ---

var exportStartCmd = &cobra.Command{
	Use:   "start <subdomain>",
	Short: "Start a new storage export for a tenant",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("export_start"); err != nil {
			return err
		}

		cfg := config.Get()
		subdomain := args[0]
		if err := validateCFName(subdomain, "subdomain"); err != nil {
			return err
		}
		includeImages, _ := cmd.Flags().GetBool("images")
		method, _ := cmd.Flags().GetString("method")
		session, _ := cmd.Flags().GetString("session")
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		if method != "email" && method != "download" {
			return fmt.Errorf("--method must be 'email' or 'download', got: %s", method)
		}

		// Check for active exports
		subSafe := sanitizeSQL(subdomain)
		checkSQL := fmt.Sprintf(
			"SELECT id, status FROM storage_exports WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = '%s') "+
				"AND status IN ('pending', 'querying', 'assembling', 'uploading', 'notifying')",
			subSafe,
		)
		checkOutput, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", checkSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		activeRows := parseD1Results(checkOutput)
		if len(activeRows) > 0 {
			activeID := formatD1Value(activeRows[0]["id"])
			activeStatus := formatD1Value(activeRows[0]["status"])
			return fmt.Errorf("active export already exists: %s (status: %s)", activeID, activeStatus)
		}

		// Session-based path: POST to the live API
		if session != "" {
			return exportStartViaAPI(cfg, subdomain, method, includeImages, session)
		}

		// Direct D1 insert
		exportID, err := generateExportUUID()
		if err != nil {
			return err
		}

		nowUnix := time.Now().Unix()
		expiresUnix := nowUnix + 604800 // 7 days

		includeImagesVal := "0"
		if includeImages {
			includeImagesVal = "1"
		}

		insertSQL := fmt.Sprintf(
			"INSERT INTO storage_exports (id, tenant_id, status, progress, delivery_method, include_images, created_at, expires_at) "+
				"SELECT '%s', id, 'pending', 0, '%s', %s, datetime(%d, 'unixepoch'), datetime(%d, 'unixepoch') "+
				"FROM tenants WHERE subdomain = '%s'",
			sanitizeSQL(exportID),
			sanitizeSQL(method),
			includeImagesVal,
			nowUnix,
			expiresUnix,
			subSafe,
		)

		_, err = exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", insertSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"export_id":      exportID,
				"subdomain":      subdomain,
				"status":         "pending",
				"delivery_method": method,
				"include_images": includeImages,
				"expires_at":     expiresUnix,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Export started for %s", subdomain))
			ui.PrintKeyValue("Export ID", exportID)
			ui.PrintKeyValue("Method", method)
		}

		return nil
	},
}

// exportStartViaAPI posts to the tenant's export API endpoint.
func exportStartViaAPI(cfg *config.Config, subdomain, method string, includeImages bool, session string) error {
	apiURL := fmt.Sprintf("https://%s.grove.place/api/export/start", subdomain)

	body := map[string]interface{}{
		"delivery_method": method,
		"include_images":  includeImages,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Cookie", session)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("export API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("export API returned HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	if cfg.JSONMode {
		var result json.RawMessage
		if json.Unmarshal(respBody, &result) != nil {
			result = json.RawMessage(`{}`)
		}
		data, _ := json.Marshal(map[string]interface{}{
			"subdomain": subdomain,
			"started":   true,
			"response":  result,
		})
		fmt.Println(string(data))
	} else {
		ui.Success(fmt.Sprintf("Export started via API for %s", subdomain))
	}

	return nil
}

// --- export download ---

var exportDownloadCmd = &cobra.Command{
	Use:   "download <export_id>",
	Short: "Download a completed export",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("export_download"); err != nil {
			return err
		}

		cfg := config.Get()
		exportID := args[0]
		outputFile, _ := cmd.Flags().GetString("output")
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		// Check status and get r2_key
		idSafe := sanitizeSQL(exportID)
		nowUnix := time.Now().Unix()
		checkSQL := fmt.Sprintf(
			"SELECT status, r2_key, expires_at FROM storage_exports WHERE id = '%s'",
			idSafe,
		)
		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", checkSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)
		if len(rows) == 0 {
			return fmt.Errorf("export not found: %s", exportID)
		}

		row := rows[0]
		status := fmt.Sprintf("%v", row["status"])
		if status != "complete" {
			return fmt.Errorf("export is not complete (status: %s)", status)
		}

		// Check expiry
		if expiresAtRaw, ok := row["expires_at"]; ok {
			expiresStr := fmt.Sprintf("%v", expiresAtRaw)
			// Simple check: compare Unix seconds if stored as integer
			if expiresUnix, ok := expiresAtRaw.(float64); ok {
				if int64(expiresUnix) < nowUnix {
					return fmt.Errorf("export has expired")
				}
			} else if expiresStr != "" && expiresStr != "<nil>" {
				// Datetime string — if it looks old, warn but proceed
				_ = expiresStr
			}
		}

		r2Key := fmt.Sprintf("%v", row["r2_key"])
		if r2Key == "" || r2Key == "<nil>" {
			return fmt.Errorf("export has no R2 key — may not be downloadable")
		}

		if outputFile == "" {
			short := exportID
			if len(short) > 8 {
				short = short[:8]
			}
			outputFile = fmt.Sprintf("export-%s.zip", short)
		}
		if strings.Contains(outputFile, "..") {
			return fmt.Errorf("output path must not contain '..': %s", outputFile)
		}

		result, err := exec.Wrangler("r2", "object", "get", "grove-exports", r2Key, "--file", outputFile)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("download failed: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"export_id":  exportID,
				"r2_key":     r2Key,
				"downloaded": outputFile,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Downloaded export: %s → %s", exportID, outputFile))
		}

		return nil
	},
}

// --- export cleanup ---

var exportCleanupCmd = &cobra.Command{
	Use:   "cleanup",
	Short: "Clean up expired exports",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("export_cleanup"); err != nil {
			return err
		}

		cfg := config.Get()
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		nowUnix := time.Now().Unix()

		// Find expired exports
		findSQL := fmt.Sprintf(
			"SELECT id, r2_key, tenant_id FROM storage_exports WHERE status = 'complete' AND expires_at < datetime(%d, 'unixepoch')",
			nowUnix,
		)

		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", findSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)

		if len(rows) == 0 {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{"cleaned": 0, "dry_run": dryRun})
				fmt.Println(string(data))
			} else {
				ui.Muted("No expired exports to clean up")
			}
			return nil
		}

		if !cfg.JSONMode {
			ui.Info(fmt.Sprintf("Found %d expired export(s) to clean up", len(rows)))
		}

		if dryRun {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"dry_run":  true,
					"would_clean": rows,
					"count":   len(rows),
				})
				fmt.Println(string(data))
			} else {
				ui.PrintHeader("Dry Run — would clean up:")
				for _, row := range rows {
					id := formatD1Value(row["id"])
					key := formatD1Value(row["r2_key"])
					ui.PrintKeyValue(fmt.Sprintf("  %-36s", id), key)
				}
			}
			return nil
		}

		// Delete R2 objects and mark as expired
		cleaned := 0
		var failed []string

		for _, row := range rows {
			exportIDVal := fmt.Sprintf("%v", row["id"])
			r2Key := fmt.Sprintf("%v", row["r2_key"])

			// Delete from R2 (ignore not-found errors)
			if r2Key != "" && r2Key != "<nil>" {
				result, err := exec.Wrangler("r2", "object", "delete", "grove-exports", r2Key)
				if err != nil || (!result.OK() && !strings.Contains(result.Stderr, "not found")) {
					failed = append(failed, exportIDVal)
					continue
				}
			}

			// Mark as expired in D1
			updateSQL := fmt.Sprintf(
				"UPDATE storage_exports SET status = 'expired' WHERE id = '%s'",
				sanitizeSQL(exportIDVal),
			)
			_, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", updateSQL)
			if err != nil {
				failed = append(failed, exportIDVal)
				continue
			}

			cleaned++
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"cleaned": cleaned,
				"failed":  failed,
				"dry_run": false,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Cleaned up %d expired export(s)", cleaned))
			if len(failed) > 0 {
				ui.Warning(fmt.Sprintf("Failed to clean %d export(s)", len(failed)))
			}
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(exportCmd)

	// export list
	exportListCmd.Flags().IntP("limit", "n", 20, "Maximum exports to return")
	exportListCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	exportCmd.AddCommand(exportListCmd)

	// export status
	exportStatusCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	exportCmd.AddCommand(exportStatusCmd)

	// export start
	exportStartCmd.Flags().Bool("images", false, "Include images in export")
	exportStartCmd.Flags().String("method", "download", "Delivery method: email or download")
	exportStartCmd.Flags().String("session", "", "Session cookie for API-based export start")
	exportStartCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	exportCmd.AddCommand(exportStartCmd)

	// export download
	exportDownloadCmd.Flags().StringP("output", "o", "", "Output file path (default: export-{id}.zip)")
	exportDownloadCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	exportCmd.AddCommand(exportDownloadCmd)

	// export cleanup
	exportCleanupCmd.Flags().Bool("dry-run", false, "Show what would be cleaned without deleting")
	exportCleanupCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	exportCmd.AddCommand(exportCleanupCmd)
}
