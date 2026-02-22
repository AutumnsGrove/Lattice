package safety

import "testing"

var defaultProtected = []string{"users", "tenants", "subscriptions", "payments", "sessions"}

func TestValidateSQLBlocksDDL(t *testing.T) {
	ddlStatements := []string{
		"CREATE TABLE foo (id INT)",
		"DROP TABLE users",
		"ALTER TABLE users ADD COLUMN name TEXT",
		"TRUNCATE TABLE sessions",
	}

	for _, sql := range ddlStatements {
		err := ValidateSQL(sql, defaultProtected, 100, 500, false)
		if err == nil {
			t.Errorf("DDL should be blocked: %s", sql)
		}
		sqlErr, ok := err.(*SQLSafetyError)
		if !ok {
			t.Fatalf("expected *SQLSafetyError, got %T", err)
		}
		if sqlErr.Code != ErrDDLBlocked {
			t.Errorf("expected DDL_BLOCKED, got %s for: %s", sqlErr.Code, sql)
		}
	}
}

func TestValidateSQLBlocksStackedQueries(t *testing.T) {
	err := ValidateSQL("SELECT * FROM posts; DROP TABLE users", defaultProtected, 100, 500, false)
	if err == nil {
		t.Error("stacked queries should be blocked")
	}
	sqlErr := err.(*SQLSafetyError)
	if sqlErr.Code != ErrDangerousPattern {
		t.Errorf("expected DANGEROUS_PATTERN, got %s", sqlErr.Code)
	}
}

func TestValidateSQLBlocksComments(t *testing.T) {
	tests := []string{
		"SELECT * FROM posts -- drop everything",
		"SELECT * FROM posts /* admin bypass */",
	}
	for _, sql := range tests {
		err := ValidateSQL(sql, defaultProtected, 100, 500, false)
		if err == nil {
			t.Errorf("SQL comments should be blocked: %s", sql)
		}
	}
}

func TestValidateSQLBlocksUnionSelect(t *testing.T) {
	err := ValidateSQL("SELECT name FROM posts WHERE id = 1 UNION SELECT password FROM users", defaultProtected, 100, 500, false)
	if err == nil {
		t.Error("UNION SELECT injection should be blocked")
	}
}

func TestValidateSQLBlocksDeleteWithoutWhere(t *testing.T) {
	err := ValidateSQL("DELETE FROM posts", defaultProtected, 100, 500, false)
	if err == nil {
		t.Error("DELETE without WHERE should be blocked")
	}
	sqlErr := err.(*SQLSafetyError)
	if sqlErr.Code != ErrMissingWhere {
		t.Errorf("expected MISSING_WHERE, got %s", sqlErr.Code)
	}
}

func TestValidateSQLAllowsDeleteWithWhere(t *testing.T) {
	err := ValidateSQL("DELETE FROM posts WHERE id = 1", defaultProtected, 100, 500, false)
	if err != nil {
		t.Errorf("DELETE with WHERE should pass: %v", err)
	}
}

func TestValidateSQLBlocksProtectedTable(t *testing.T) {
	tables := []string{"users", "tenants", "subscriptions", "payments", "sessions"}
	for _, table := range tables {
		err := ValidateSQL("INSERT INTO "+table+" (name) VALUES ('test')", defaultProtected, 100, 500, false)
		if err == nil {
			t.Errorf("INSERT into protected table %s should be blocked", table)
		}
		sqlErr := err.(*SQLSafetyError)
		if sqlErr.Code != ErrProtectedTable {
			t.Errorf("expected PROTECTED_TABLE, got %s for table %s", sqlErr.Code, table)
		}
	}
}

func TestValidateSQLBlocksUpdateWithoutWhere(t *testing.T) {
	err := ValidateSQL("UPDATE posts SET title = 'test'", defaultProtected, 100, 500, false)
	if err == nil {
		t.Error("UPDATE without WHERE should be blocked")
	}
}

func TestValidateSQLAllowsSelect(t *testing.T) {
	err := ValidateSQL("SELECT * FROM posts WHERE tenant_id = 'abc'", defaultProtected, 100, 500, false)
	if err != nil {
		t.Errorf("SELECT should always pass: %v", err)
	}
}

func TestValidateSQLRowLimits(t *testing.T) {
	// Large delete exceeds limit
	err := ValidateSQL("DELETE FROM posts WHERE status = 'draft'", nil, 50, 200, false)
	if err == nil {
		t.Error("large delete should exceed row limit")
	}

	// Same query with skipRowLimits should pass
	err = ValidateSQL("DELETE FROM posts WHERE status = 'draft'", nil, 50, 200, true)
	if err != nil {
		t.Errorf("delete with skip row limits should pass: %v", err)
	}
}

func TestValidateSQLMaxQueryLength(t *testing.T) {
	// Generate a query longer than MaxQueryLength
	longSQL := "SELECT * FROM posts WHERE id IN (" + string(make([]byte, MaxQueryLength+1)) + ")"
	err := ValidateSQL(longSQL, defaultProtected, 100, 500, false)
	if err == nil {
		t.Error("query exceeding max length should be blocked")
	}
}

func TestEstimateRows(t *testing.T) {
	tests := []struct {
		sql  string
		want int
	}{
		{"DELETE FROM posts WHERE id = 1", 1},
		{"DELETE FROM posts WHERE id IN (1, 2, 3)", 3},
		{"DELETE FROM posts WHERE tenant_id = 'abc' AND slug = 'test'", 10},
		{"DELETE FROM posts WHERE tenant_id = 'abc' AND slug = 'test' AND version = 1", 1},
		{"DELETE FROM posts WHERE status = 'draft'", 100},
		{"DELETE FROM posts WHERE status = 'draft' LIMIT 10", 10},
		{"DELETE FROM posts", defaultRowEstimate}, // no WHERE
	}

	for _, tt := range tests {
		got := estimateRows(tt.sql)
		if got != tt.want {
			t.Errorf("estimateRows(%q) = %d, want %d", tt.sql, got, tt.want)
		}
	}
}
