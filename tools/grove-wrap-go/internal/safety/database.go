package safety

import (
	"fmt"
	"regexp"
	"strings"
)

// ErrorCode identifies the type of database safety violation.
type ErrorCode string

const (
	ErrDDLBlocked      ErrorCode = "DDL_BLOCKED"
	ErrDangerousPattern ErrorCode = "DANGEROUS_PATTERN"
	ErrMissingWhere    ErrorCode = "MISSING_WHERE"
	ErrProtectedTable  ErrorCode = "PROTECTED_TABLE"
	ErrUnsafeDelete    ErrorCode = "UNSAFE_DELETE"
	ErrUnsafeUpdate    ErrorCode = "UNSAFE_UPDATE"
)

// SQLSafetyError is returned when a SQL query violates safety rules.
type SQLSafetyError struct {
	Code    ErrorCode
	Message string
	SQL     string
}

func (e *SQLSafetyError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Pre-compiled regex patterns for SQL validation.
var (
	reStackedQueries = regexp.MustCompile(`;\s*[a-zA-Z]`)
	reTableName      = regexp.MustCompile(`(?i)(?:FROM|UPDATE|INTO)\s+[` + "`" + `"]?(\w+)[` + "`" + `"]?`)
	reLimitClause    = regexp.MustCompile(`(?i)LIMIT\s+(\d+)`)
	reIDEquals       = regexp.MustCompile(`(?i)\bID\b\s*=\s*`)
	reIDIn           = regexp.MustCompile(`(?i)\bID\b\s+IN\s*\(([^)]+)\)`)
	reEqualityCond   = regexp.MustCompile(`(?i)\b[A-Z_][A-Z0-9_]*\b\s*=\s*`)
	reWhereClause    = regexp.MustCompile(`(?i)WHERE\s+(.*?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s*$)`)
)

// MaxQueryLength is the maximum allowed SQL query length (64KB).
// Queries longer than this are rejected to prevent resource exhaustion.
const MaxQueryLength = 65536

// ValidateSQL checks a SQL query against database safety rules.
func ValidateSQL(sql string, protectedTables []string, maxDeleteRows, maxUpdateRows int, skipRowLimits bool) error {
	if len(sql) > MaxQueryLength {
		return &SQLSafetyError{
			Code:    ErrDangerousPattern,
			Message: fmt.Sprintf("query exceeds maximum length of %d bytes", MaxQueryLength),
			SQL:     sql[:100] + "...",
		}
	}

	upper := strings.TrimSpace(strings.ToUpper(sql))
	operation := getSQLOperation(upper)

	// Block DDL operations
	if operation == "CREATE" || operation == "DROP" || operation == "ALTER" || operation == "TRUNCATE" {
		return &SQLSafetyError{
			Code:    ErrDDLBlocked,
			Message: fmt.Sprintf("%s operations are blocked for safety", operation),
			SQL:     sql,
		}
	}

	// Check for dangerous patterns (stacked queries, comments)
	if hasDangerousPatterns(sql) {
		return &SQLSafetyError{
			Code:    ErrDangerousPattern,
			Message: "query contains dangerous patterns (multiple statements, comments, etc.)",
			SQL:     sql,
		}
	}

	// DELETE requires WHERE clause
	if operation == "DELETE" && !hasWhereClause(upper) {
		return &SQLSafetyError{
			Code:    ErrMissingWhere,
			Message: "DELETE without WHERE clause is blocked",
			SQL:     sql,
		}
	}

	// Check table protection for mutation operations
	if operation == "DELETE" || operation == "UPDATE" || operation == "INSERT" {
		tableName := extractTableName(sql)
		if tableName != "" && isProtectedTable(tableName, protectedTables) {
			// Protected tables with mutation need WHERE for DELETE/UPDATE
			if (operation == "DELETE" || operation == "UPDATE") && !hasWhereClause(upper) {
				return &SQLSafetyError{
					Code:    ErrMissingWhere,
					Message: fmt.Sprintf("%s on protected table '%s' without WHERE is blocked", operation, tableName),
					SQL:     sql,
				}
			}
			return &SQLSafetyError{
				Code:    ErrProtectedTable,
				Message: fmt.Sprintf("table '%s' is protected", tableName),
				SQL:     sql,
			}
		}
	}

	// Row limit checks (unless --force)
	if !skipRowLimits {
		if operation == "DELETE" {
			estimated := estimateRows(sql)
			if estimated > maxDeleteRows {
				return &SQLSafetyError{
					Code:    ErrUnsafeDelete,
					Message: fmt.Sprintf("estimated %d rows to delete exceeds limit of %d. Use --force to bypass row-limit checks.", estimated, maxDeleteRows),
					SQL:     sql,
				}
			}
		}

		if operation == "UPDATE" {
			estimated := estimateRows(sql)
			if estimated > maxUpdateRows {
				return &SQLSafetyError{
					Code:    ErrUnsafeUpdate,
					Message: fmt.Sprintf("estimated %d rows to update exceeds limit of %d. Use --force to bypass row-limit checks.", estimated, maxUpdateRows),
					SQL:     sql,
				}
			}
		}
	}

	// UPDATE requires WHERE (unless LIMIT is provided)
	if operation == "UPDATE" && !hasWhereClause(upper) {
		if !strings.Contains(upper, "LIMIT") {
			return &SQLSafetyError{
				Code:    ErrMissingWhere,
				Message: "UPDATE without WHERE clause is blocked",
				SQL:     sql,
			}
		}
	}

	return nil
}

// getSQLOperation returns the SQL operation type from the query.
func getSQLOperation(upper string) string {
	upper = strings.TrimSpace(upper)
	for _, op := range []string{"SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "TRUNCATE"} {
		if strings.HasPrefix(upper, op) {
			return op
		}
	}
	return "UNKNOWN"
}

// reUnionSelect detects UNION-based injection attempts.
var reUnionSelect = regexp.MustCompile(`(?i)\bUNION\b\s+\bSELECT\b`)

// hasDangerousPatterns checks for stacked queries, SQL comments, and injection patterns.
func hasDangerousPatterns(sql string) bool {
	// Stacked queries (semicolon followed by another statement)
	if reStackedQueries.MatchString(sql) {
		return true
	}
	// SQL comments that might hide malicious code
	if strings.Contains(sql, "--") || strings.Contains(sql, "/*") {
		return true
	}
	// UNION SELECT injection
	if reUnionSelect.MatchString(sql) {
		return true
	}
	return false
}

// hasWhereClause checks if the query contains a WHERE keyword.
func hasWhereClause(upper string) bool {
	return strings.Contains(upper, "WHERE")
}

// extractTableName extracts the table name from a SQL query.
func extractTableName(sql string) string {
	m := reTableName.FindStringSubmatch(sql)
	if len(m) > 1 {
		return strings.ToLower(m[1])
	}
	return ""
}

// isProtectedTable checks if a table name is in the protected list.
func isProtectedTable(table string, protected []string) bool {
	lower := strings.ToLower(table)
	for _, p := range protected {
		if strings.ToLower(p) == lower {
			return true
		}
	}
	return false
}

// estimateRows estimates how many rows a query might affect.
func estimateRows(sql string) int {
	upper := strings.ToUpper(sql)

	// Check for LIMIT clause
	if strings.Contains(upper, "LIMIT") {
		m := reLimitClause.FindStringSubmatch(upper)
		if len(m) > 1 {
			var n int
			fmt.Sscanf(m[1], "%d", &n)
			return n
		}
	}

	if !strings.Contains(upper, "WHERE") {
		return 10000
	}

	// Extract WHERE clause
	m := reWhereClause.FindStringSubmatch(upper)
	if len(m) < 2 {
		return 10000
	}
	where := m[1]

	// WHERE id = X → 1 row
	if reIDEquals.MatchString(where) {
		return 1
	}

	// WHERE id IN (...) → count items
	inMatch := reIDIn.FindStringSubmatch(where)
	if len(inMatch) > 1 {
		items := strings.Split(inMatch[1], ",")
		return len(items)
	}

	// Count equality conditions
	eqMatches := reEqualityCond.FindAllString(where, -1)
	if len(eqMatches) > 0 {
		count := len(eqMatches)
		if count >= 3 {
			return 1
		} else if count == 2 {
			return 10
		}
		return 100
	}

	return 10000
}
