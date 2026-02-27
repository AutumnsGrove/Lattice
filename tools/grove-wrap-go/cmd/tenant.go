package cmd

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// validTenantPlans contains the accepted plan identifiers.
var validTenantPlans = map[string]bool{
	"seedling":  true,
	"sapling":   true,
	"oak":       true,
	"evergreen": true,
}

// tenantCmd is the parent command for tenant operations.
var tenantCmd = &cobra.Command{
	Use:   "tenant",
	Short: "Tenant management for the Grove platform",
	Long:  "Manage tenants (sites) in the Grove platform via D1.",
}

// generateTenantUUID generates a UUID v4 using crypto/rand.
func generateTenantUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	uuid := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
	return uuid, nil
}

// firstTenantOrNil returns the first row of a result set or nil.
func firstTenantOrNil(rows []map[string]interface{}) interface{} {
	if len(rows) == 0 {
		return nil
	}
	return rows[0]
}

// --- tenant list ---

var tenantListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all tenants",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		dbAlias, _ := cmd.Flags().GetString("db")
		limit, _ := cmd.Flags().GetInt("limit")
		plan, _ := cmd.Flags().GetString("plan")

		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		limit = clampD1Limit(limit)

		if plan != "" && !validTenantPlans[plan] {
			return fmt.Errorf("invalid plan: %s (valid: seedling, sapling, oak, evergreen)", plan)
		}

		sql := "SELECT id, subdomain, display_name, email, plan, created_at FROM tenants"
		if plan != "" {
			escaped := strings.ReplaceAll(plan, "'", "''")
			sql += fmt.Sprintf(" WHERE plan = '%s'", escaped)
		}
		sql += fmt.Sprintf(" ORDER BY created_at DESC LIMIT %d", limit)

		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"tenants": rows,
				"count":   len(rows),
			})
			fmt.Println(string(data))
			return nil
		}

		if len(rows) == 0 {
			ui.Muted("No tenants found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Tenants (%d)", len(rows)))
		for _, row := range rows {
			subdomain := fmt.Sprintf("%v", row["subdomain"])
			name := fmt.Sprintf("%v", row["display_name"])
			rowPlan := fmt.Sprintf("%v", row["plan"])
			email := fmt.Sprintf("%v", row["email"])
			ui.PrintKeyValue(
				fmt.Sprintf("%-20s", subdomain),
				fmt.Sprintf("%-24s  plan: %-10s  email: %s", name, rowPlan, email),
			)
		}
		return nil
	},
}

// --- tenant lookup ---

var tenantLookupCmd = &cobra.Command{
	Use:   "lookup <identifier>",
	Short: "Look up a tenant by subdomain, email, or ID",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		identifier := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")
		email, _ := cmd.Flags().GetString("email")
		tenantID, _ := cmd.Flags().GetString("id")

		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		var sql string
		if tenantID != "" {
			escaped := strings.ReplaceAll(tenantID, "'", "''")
			sql = fmt.Sprintf("SELECT * FROM tenants WHERE id = '%s' LIMIT 1", escaped)
		} else if email != "" {
			escaped := strings.ReplaceAll(email, "'", "''")
			sql = fmt.Sprintf("SELECT * FROM tenants WHERE email = '%s' LIMIT 1", escaped)
		} else {
			escaped := strings.ReplaceAll(identifier, "'", "''")
			sql = fmt.Sprintf("SELECT * FROM tenants WHERE subdomain = '%s' LIMIT 1", escaped)
		}

		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"identifier": identifier,
				"found":      len(rows) > 0,
				"tenant":     firstTenantOrNil(rows),
			})
			fmt.Println(string(data))
			return nil
		}

		if len(rows) == 0 {
			ui.Warning(fmt.Sprintf("Tenant not found: %s", identifier))
			return nil
		}

		row := rows[0]
		ui.PrintHeader("Tenant Details")
		displayOrder := []string{
			"id", "subdomain", "display_name", "email",
			"plan", "is_active", "created_at", "updated_at",
		}
		for _, key := range displayOrder {
			if v, ok := row[key]; ok {
				ui.PrintKeyValue(fmt.Sprintf("%-16s", key), formatD1Value(v))
			}
		}
		// Print any remaining fields not in the display order.
		for k, v := range row {
			inOrder := false
			for _, key := range displayOrder {
				if k == key {
					inOrder = true
					break
				}
			}
			if !inOrder {
				ui.PrintKeyValue(fmt.Sprintf("%-16s", k), formatD1Value(v))
			}
		}
		return nil
	},
}

// --- tenant stats ---

var tenantStatsCmd = &cobra.Command{
	Use:   "stats <subdomain>",
	Short: "Show usage statistics for a tenant",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		subdomain := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")

		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		// Look up tenant to get ID.
		escapedSubdomain := strings.ReplaceAll(subdomain, "'", "''")
		idSQL := fmt.Sprintf("SELECT id FROM tenants WHERE subdomain = '%s' LIMIT 1", escapedSubdomain)
		idOutput, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", idSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		idRows := parseD1Results(idOutput)
		if len(idRows) == 0 {
			return fmt.Errorf("tenant not found: %s", subdomain)
		}

		tenantID := fmt.Sprintf("%v", idRows[0]["id"])
		escapedID := strings.ReplaceAll(tenantID, "'", "''")

		// Aggregate counts across related tables.
		statsSQL := fmt.Sprintf(
			"SELECT "+
				"(SELECT COUNT(*) FROM posts WHERE tenant_id = '%s') AS posts, "+
				"(SELECT COUNT(*) FROM pages WHERE tenant_id = '%s') AS pages, "+
				"(SELECT COUNT(*) FROM gallery_images WHERE tenant_id = '%s') AS gallery_images, "+
				"(SELECT COUNT(*) FROM sessions WHERE tenant_id = '%s') AS sessions",
			escapedID, escapedID, escapedID, escapedID,
		)

		statsOutput, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", statsSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		stats := parseD1Results(statsOutput)

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"tenant_id": tenantID,
				"subdomain": subdomain,
				"stats":     firstTenantOrNil(stats),
			})
			fmt.Println(string(data))
			return nil
		}

		if len(stats) == 0 {
			ui.Muted("No statistics available")
			return nil
		}

		row := stats[0]
		ui.PrintHeader(fmt.Sprintf("Stats: %s", subdomain))
		ui.PrintKeyValue("Posts         ", formatD1Value(row["posts"]))
		ui.PrintKeyValue("Pages         ", formatD1Value(row["pages"]))
		ui.PrintKeyValue("Gallery Images", formatD1Value(row["gallery_images"]))
		ui.PrintKeyValue("Sessions      ", formatD1Value(row["sessions"]))
		return nil
	},
}

// --- tenant create ---

var tenantCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new tenant",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		dbAlias, _ := cmd.Flags().GetString("db")
		subdomain, _ := cmd.Flags().GetString("subdomain")
		displayName, _ := cmd.Flags().GetString("name")
		email, _ := cmd.Flags().GetString("email")
		plan, _ := cmd.Flags().GetString("plan")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		// Validate required fields.
		if subdomain == "" {
			return fmt.Errorf("--subdomain is required")
		}
		if displayName == "" {
			return fmt.Errorf("--name is required")
		}
		if email == "" {
			return fmt.Errorf("--email is required")
		}
		if !validTenantPlans[plan] {
			return fmt.Errorf("invalid plan: %s (valid: seedling, sapling, oak, evergreen)", plan)
		}

		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		tenantID, err := generateTenantUUID()
		if err != nil {
			return fmt.Errorf("failed to generate tenant ID: %w", err)
		}

		now := time.Now().UTC().Format("2006-01-02 15:04:05")
		escapedID := strings.ReplaceAll(tenantID, "'", "''")
		escapedSubdomain := strings.ReplaceAll(subdomain, "'", "''")
		escapedName := strings.ReplaceAll(displayName, "'", "''")
		escapedEmail := strings.ReplaceAll(email, "'", "''")
		escapedPlan := strings.ReplaceAll(plan, "'", "''")

		sql := fmt.Sprintf(
			"INSERT INTO tenants (id, subdomain, display_name, email, plan, created_at, updated_at, is_active) "+
				"VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s', 1)",
			escapedID, escapedSubdomain, escapedName, escapedEmail, escapedPlan, now, now,
		)

		if dryRun {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"dry_run":      true,
					"id":           tenantID,
					"subdomain":    subdomain,
					"display_name": displayName,
					"email":        email,
					"plan":         plan,
					"sql":          sql,
				})
				fmt.Println(string(data))
			} else {
				ui.PrintHeader("Tenant Create (dry-run)")
				ui.PrintKeyValue("ID       ", tenantID)
				ui.PrintKeyValue("Subdomain", subdomain)
				ui.PrintKeyValue("Name     ", displayName)
				ui.PrintKeyValue("Email    ", email)
				ui.PrintKeyValue("Plan     ", plan)
				fmt.Println()
				ui.Muted(sql)
			}
			return nil
		}

		if err := requireCFSafety("tenant_create"); err != nil {
			return err
		}

		_, err = exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"id":           tenantID,
				"subdomain":    subdomain,
				"display_name": displayName,
				"email":        email,
				"plan":         plan,
				"created":      true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Tenant '%s' created (%s plan)", subdomain, plan))
			ui.PrintKeyValue("ID", tenantID)
		}
		return nil
	},
}

// --- tenant delete ---

var tenantDeleteCmd = &cobra.Command{
	Use:   "delete <subdomain>",
	Short: "Delete a tenant and all associated data (destructive)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		subdomain := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		// Safety check up front — dry-run still requires --write (reads remote DB),
		// full delete requires --write --force (TierDangerous).
		if !dryRun {
			if err := requireCFSafety("tenant_delete"); err != nil {
				return err
			}
		} else {
			if err := requireCFSafety("d1_query_read"); err != nil {
				return err
			}
		}

		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		// Look up tenant to get ID.
		escapedSubdomain := strings.ReplaceAll(subdomain, "'", "''")
		idSQL := fmt.Sprintf("SELECT id FROM tenants WHERE subdomain = '%s' LIMIT 1", escapedSubdomain)
		idOutput, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", idSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		idRows := parseD1Results(idOutput)
		if len(idRows) == 0 {
			return fmt.Errorf("tenant not found: %s", subdomain)
		}

		tenantID := fmt.Sprintf("%v", idRows[0]["id"])
		escapedID := strings.ReplaceAll(tenantID, "'", "''")

		// Count associated rows across all tenant-linked tables.
		impactSQL := fmt.Sprintf(
			"SELECT "+
				"(SELECT COUNT(*) FROM posts WHERE tenant_id = '%s') AS posts, "+
				"(SELECT COUNT(*) FROM pages WHERE tenant_id = '%s') AS pages, "+
				"(SELECT COUNT(*) FROM gallery_images WHERE tenant_id = '%s') AS gallery_images, "+
				"(SELECT COUNT(*) FROM sessions WHERE tenant_id = '%s') AS sessions",
			escapedID, escapedID, escapedID, escapedID,
		)

		impactOutput, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", impactSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		impactRows := parseD1Results(impactOutput)
		var impact map[string]interface{}
		if len(impactRows) > 0 {
			impact = impactRows[0]
		}

		if dryRun {
			if cfg.JSONMode {
				data, _ := json.Marshal(map[string]interface{}{
					"dry_run":   true,
					"subdomain": subdomain,
					"tenant_id": tenantID,
					"impact":    impact,
				})
				fmt.Println(string(data))
			} else {
				ui.PrintHeader(fmt.Sprintf("Tenant Delete (dry-run): %s", subdomain))
				ui.PrintKeyValue("Tenant ID     ", tenantID)
				ui.Info("Impact (rows that would be deleted):")
				if impact != nil {
					ui.PrintKeyValue("  Posts         ", formatD1Value(impact["posts"]))
					ui.PrintKeyValue("  Pages         ", formatD1Value(impact["pages"]))
					ui.PrintKeyValue("  Gallery Images", formatD1Value(impact["gallery_images"]))
					ui.PrintKeyValue("  Sessions      ", formatD1Value(impact["sessions"]))
				}
				ui.Hint("Re-run without --dry-run and with --write --force to execute")
			}
			return nil
		}

		deleteSQL := fmt.Sprintf("DELETE FROM tenants WHERE id = '%s'", escapedID)
		_, err = exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", deleteSQL)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"subdomain": subdomain,
				"tenant_id": tenantID,
				"deleted":   true,
				"impact":    impact,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Tenant '%s' deleted", subdomain))
			if impact != nil {
				ui.Muted(fmt.Sprintf(
					"Removed: %s posts, %s pages, %s gallery images, %s sessions",
					formatD1Value(impact["posts"]),
					formatD1Value(impact["pages"]),
					formatD1Value(impact["gallery_images"]),
					formatD1Value(impact["sessions"]),
				))
			}
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(tenantCmd)

	// tenant list
	tenantListCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	tenantListCmd.Flags().IntP("limit", "n", 20, "Maximum tenants to return")
	tenantListCmd.Flags().String("plan", "", "Filter by plan (seedling/sapling/oak/evergreen)")
	tenantCmd.AddCommand(tenantListCmd)

	// tenant lookup
	tenantLookupCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	tenantLookupCmd.Flags().String("email", "", "Look up by email address instead of subdomain")
	tenantLookupCmd.Flags().String("id", "", "Look up by tenant UUID instead of subdomain")
	tenantCmd.AddCommand(tenantLookupCmd)

	// tenant stats
	tenantStatsCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	tenantCmd.AddCommand(tenantStatsCmd)

	// tenant create
	tenantCreateCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	tenantCreateCmd.Flags().String("subdomain", "", "Tenant subdomain (required)")
	tenantCreateCmd.Flags().String("name", "", "Display name (required)")
	tenantCreateCmd.Flags().String("email", "", "Owner email address (required)")
	tenantCreateCmd.Flags().String("plan", "seedling", "Tenant plan (seedling/sapling/oak/evergreen)")
	tenantCreateCmd.Flags().Bool("dry-run", false, "Show what would be created without executing")
	tenantCmd.AddCommand(tenantCreateCmd)

	// tenant delete
	tenantDeleteCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	tenantDeleteCmd.Flags().Bool("dry-run", false, "Show impact without deleting")
	tenantCmd.AddCommand(tenantDeleteCmd)
}
