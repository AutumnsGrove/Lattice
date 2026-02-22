package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// requireCFSafety checks Cloudflare operation safety.
func requireCFSafety(operation string) error {
	cfg := config.Get()
	return safety.CheckCloudflareSafety(
		operation, cfg.WriteFlag, cfg.ForceFlag, cfg.AgentMode, cfg.IsInteractive(),
	)
}

// maxCFNameLen is the maximum length for Cloudflare resource names/aliases.
const maxCFNameLen = 128

// maxCFKeyLen is the maximum length for KV/R2 keys.
const maxCFKeyLen = 1024

// maxCFMetadataLen is the maximum length for metadata strings.
const maxCFMetadataLen = 10000

// maxD1Limit is the maximum row limit for D1 queries.
const maxD1Limit = 10000

// clampD1Limit clamps a query row limit to [1, maxD1Limit].
func clampD1Limit(limit int) int {
	if limit < 1 {
		return 1
	}
	if limit > maxD1Limit {
		return maxD1Limit
	}
	return limit
}

// validateCFName validates a Cloudflare resource name (database alias, worker, bucket, etc.).
func validateCFName(name, label string) error {
	if len(name) == 0 {
		return fmt.Errorf("%s must not be empty", label)
	}
	if len(name) > maxCFNameLen {
		return fmt.Errorf("%s too long (max %d chars)", label, maxCFNameLen)
	}
	for _, ch := range name {
		if ch < 0x20 || ch == 0x7f || ch == '|' || ch == ';' || ch == '&' || ch == '$' ||
			ch == '(' || ch == ')' || ch == '{' || ch == '}' || ch == '<' || ch == '>' ||
			ch == '`' || ch == '\'' || ch == '"' || ch == '\\' || ch == '\n' || ch == '\r' {
			return fmt.Errorf("%s contains invalid character: %q", label, ch)
		}
	}
	return nil
}

// validateCFKey validates a KV or R2 object key.
func validateCFKey(key string) error {
	if len(key) == 0 {
		return fmt.Errorf("key must not be empty")
	}
	if len(key) > maxCFKeyLen {
		return fmt.Errorf("key too long (max %d chars)", maxCFKeyLen)
	}
	if strings.ContainsAny(key, "\x00\n\r") {
		return fmt.Errorf("key contains invalid control characters")
	}
	return nil
}

// resolveDatabase resolves a database alias to its name using config.
// Returns an error if the alias is invalid.
func resolveDatabase(alias string) (string, error) {
	if err := validateCFName(alias, "database alias"); err != nil {
		return "", err
	}
	cfg := config.Get()
	if db, ok := cfg.Databases[alias]; ok {
		return db.Name, nil
	}
	return alias, nil
}

// d1Cmd is the parent command for D1 database operations.
var d1Cmd = &cobra.Command{
	Use:   "d1",
	Short: "D1 database operations with safety guards",
	Long:  "D1 database operations wrapped with Grove's safety-tiered interface.",
}

// --- d1 list ---

var d1ListCmd = &cobra.Command{
	Use:   "list",
	Short: "List D1 databases",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		output, err := exec.WranglerOutput("d1", "list", "--json")
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			var remote json.RawMessage
			if err := json.Unmarshal([]byte(output), &remote); err != nil {
				remote = json.RawMessage("[]")
			}

			configured := make(map[string]config.Database)
			for alias, db := range cfg.Databases {
				configured[alias] = db
			}
			result := map[string]interface{}{
				"configured": configured,
				"remote":     remote,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		// Show configured databases
		if len(cfg.Databases) > 0 {
			ui.PrintHeader("Configured Databases")
			for alias, db := range cfg.Databases {
				ui.PrintKeyValue(
					fmt.Sprintf("%-12s", alias),
					fmt.Sprintf("%s  (%s)", db.Name, db.ID),
				)
			}
			fmt.Println()
		}

		// Show remote databases
		var dbs []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &dbs); err == nil && len(dbs) > 0 {
			ui.PrintHeader("Remote D1 Databases")
			for _, db := range dbs {
				name := fmt.Sprintf("%v", db["name"])
				uuid := fmt.Sprintf("%v", db["uuid"])
				ui.PrintKeyValue(fmt.Sprintf("%-24s", name), uuid)
			}
		}

		return nil
	},
}

// --- d1 tables ---

var d1TablesCmd = &cobra.Command{
	Use:   "tables",
	Short: "List tables in a D1 database",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		sql := "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name"
		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		// Wrangler returns an array with one result object
		tables := parseD1Results(output)

		if cfg.JSONMode {
			result := map[string]interface{}{
				"database": dbName,
				"tables":   tables,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Tables in %s", dbName))
		if len(tables) == 0 {
			ui.Muted("No tables found")
			return nil
		}
		for _, t := range tables {
			name, _ := t["name"].(string)
			ui.PrintKeyValue("  ", name)
		}

		return nil
	},
}

// --- d1 schema ---

var d1SchemaCmd = &cobra.Command{
	Use:   "schema <table>",
	Short: "Show table schema",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		tableName := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		// Validate table name (alphanumeric + underscore only)
		if !isValidIdentifier(tableName) {
			return fmt.Errorf("invalid table name: %q", tableName)
		}

		sql := fmt.Sprintf("PRAGMA table_info(%s)", tableName)
		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sql)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		columns := parseD1Results(output)

		if len(columns) == 0 {
			return fmt.Errorf("table '%s' not found or has no columns", tableName)
		}

		if cfg.JSONMode {
			result := map[string]interface{}{
				"database": dbName,
				"table":    tableName,
				"columns":  columns,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Schema: %s.%s", dbName, tableName))
		for _, col := range columns {
			name := fmt.Sprintf("%v", col["name"])
			colType := fmt.Sprintf("%v", col["type"])
			notnull, _ := col["notnull"].(float64)
			pk, _ := col["pk"].(float64)

			nullable := "YES"
			if notnull == 1 {
				nullable = "NO"
			}
			pkStr := ""
			if pk > 0 {
				pkStr = " PK"
			}

			ui.PrintKeyValue(
				fmt.Sprintf("  %-20s", name),
				fmt.Sprintf("%-12s nullable: %s%s", colType, nullable, pkStr),
			)
		}

		return nil
	},
}

// --- d1 query ---

var d1QueryCmd = &cobra.Command{
	Use:   "query <sql>",
	Short: "Execute a SQL query",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		sqlStr := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")
		limit, _ := cmd.Flags().GetInt("limit")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		limit = clampD1Limit(limit)

		// Determine if this is a mutation
		upperSQL := strings.TrimSpace(strings.ToUpper(sqlStr))
		isMutation := false
		for _, op := range []string{"INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER"} {
			if strings.HasPrefix(upperSQL, op) {
				isMutation = true
				break
			}
		}

		if isMutation {
			if err := requireCFSafety("d1_query_write"); err != nil {
				return err
			}
		}

		// SQL safety validation
		maxDelete := cfg.EffectiveMaxDeleteRows()
		maxUpdate := cfg.EffectiveMaxUpdateRows()
		if err := safety.ValidateSQL(sqlStr, cfg.Safety.ProtectedTables, maxDelete, maxUpdate, cfg.ForceFlag); err != nil {
			return err
		}

		// Auto-append LIMIT for SELECT if not present
		if strings.HasPrefix(upperSQL, "SELECT") && !strings.Contains(upperSQL, "LIMIT") {
			sqlStr = fmt.Sprintf("%s LIMIT %d", sqlStr, limit)
		}

		output, err := exec.WranglerOutput("d1", "execute", dbName, "--remote", "--json", "--command", sqlStr)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		rows := parseD1Results(output)

		if cfg.JSONMode {
			result := map[string]interface{}{
				"database": dbName,
				"rows":     rows,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		if len(rows) == 0 {
			ui.Muted("No results")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Query Results (%d rows)", len(rows)))

		// Print column headers from first row
		if len(rows) > 0 {
			var cols []string
			for k := range rows[0] {
				cols = append(cols, k)
			}

			for _, row := range rows {
				var parts []string
				for _, c := range cols {
					val := formatD1Value(row[c])
					parts = append(parts, fmt.Sprintf("%s=%s", c, val))
				}
				fmt.Printf("  %s\n", strings.Join(parts, "  "))
			}
		}

		return nil
	},
}

// --- d1 migrate ---

var d1MigrateCmd = &cobra.Command{
	Use:   "migrate <file.sql>",
	Short: "Execute a SQL migration file",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		filePath := args[0]
		dbAlias, _ := cmd.Flags().GetString("db")
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		dbName, err := resolveDatabase(dbAlias)
		if err != nil {
			return err
		}

		// Validate file
		if !strings.HasSuffix(filePath, ".sql") {
			return fmt.Errorf("migration file must be .sql, got: %s", filePath)
		}
		absPath, err := filepath.Abs(filePath)
		if err != nil {
			return fmt.Errorf("invalid path: %w", err)
		}
		info, err := os.Stat(absPath)
		if err != nil {
			return fmt.Errorf("file not found: %s", filePath)
		}
		if info.Size() == 0 {
			return fmt.Errorf("migration file is empty: %s", filePath)
		}
		const maxMigrationSize = 1024 * 1024 // 1MB
		if info.Size() > maxMigrationSize {
			return fmt.Errorf("migration file too large: %d bytes (max %d)", info.Size(), maxMigrationSize)
		}
		// Reject symlinks to prevent reading unintended files
		if info.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("migration file must not be a symlink: %s", filePath)
		}

		if dryRun {
			content, err := os.ReadFile(absPath)
			if err != nil {
				return fmt.Errorf("could not read file: %w", err)
			}

			if cfg.JSONMode {
				result := map[string]interface{}{
					"dry_run":  true,
					"database": dbName,
					"file":     absPath,
					"sql":      string(content),
				}
				data, _ := json.Marshal(result)
				fmt.Println(string(data))
				return nil
			}

			ui.PrintHeader("Migration Preview (dry-run)")
			ui.PrintKeyValue("File", filepath.Base(absPath))
			ui.PrintKeyValue("Database", dbName)
			fmt.Println()

			lines := strings.Split(string(content), "\n")
			maxLines := 40
			for i, line := range lines {
				if i >= maxLines {
					ui.Muted(fmt.Sprintf("  ... (%d more lines)", len(lines)-maxLines))
					break
				}
				fmt.Printf("  %s\n", line)
			}
			return nil
		}

		if err := requireCFSafety("d1_migrate"); err != nil {
			return err
		}

		result, err := exec.Wrangler("d1", "execute", dbName, "--remote", "--file", absPath)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("migration failed: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"success":  true,
				"database": dbName,
				"file":     absPath,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Migration applied: %s → %s", filepath.Base(absPath), dbName))
		}
		return nil
	},
}

// parseD1Results extracts row data from wrangler d1 JSON output.
// Wrangler returns: [{"results": [...], "success": true, ...}]
func parseD1Results(output string) []map[string]interface{} {
	output = strings.TrimSpace(output)

	// Try array wrapper first
	var wrapper []map[string]interface{}
	if err := json.Unmarshal([]byte(output), &wrapper); err == nil {
		if len(wrapper) > 0 {
			if results, ok := wrapper[0]["results"].([]interface{}); ok {
				return interfaceToMaps(results)
			}
		}
		return nil
	}

	// Try single object
	var single map[string]interface{}
	if err := json.Unmarshal([]byte(output), &single); err == nil {
		if results, ok := single["results"].([]interface{}); ok {
			return interfaceToMaps(results)
		}
	}

	return nil
}

// interfaceToMaps converts []interface{} to []map[string]interface{}.
func interfaceToMaps(items []interface{}) []map[string]interface{} {
	var result []map[string]interface{}
	for _, item := range items {
		if m, ok := item.(map[string]interface{}); ok {
			result = append(result, m)
		}
	}
	return result
}

// formatD1Value formats a database value for display.
func formatD1Value(v interface{}) string {
	if v == nil {
		return "NULL"
	}
	s := fmt.Sprintf("%v", v)
	if len(s) > 50 {
		return s[:47] + "..."
	}
	return s
}

// isValidIdentifier checks if a string is a valid SQL identifier.
func isValidIdentifier(s string) bool {
	if len(s) == 0 || len(s) > 128 {
		return false
	}
	for i, ch := range s {
		if i == 0 {
			if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_') {
				return false
			}
		} else {
			if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_') {
				return false
			}
		}
	}
	return true
}

func init() {
	rootCmd.AddCommand(d1Cmd)

	// d1 list
	d1Cmd.AddCommand(d1ListCmd)

	// d1 tables
	d1TablesCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	d1Cmd.AddCommand(d1TablesCmd)

	// d1 schema
	d1SchemaCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	d1Cmd.AddCommand(d1SchemaCmd)

	// d1 query
	d1QueryCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	d1QueryCmd.Flags().IntP("limit", "n", 100, "Maximum rows to return")
	d1Cmd.AddCommand(d1QueryCmd)

	// d1 migrate
	d1MigrateCmd.Flags().StringP("db", "d", "lattice", "Database alias or name")
	d1MigrateCmd.Flags().Bool("dry-run", false, "Show SQL without executing")
	d1Cmd.AddCommand(d1MigrateCmd)
}
