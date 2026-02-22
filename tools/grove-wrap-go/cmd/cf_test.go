package cmd

import (
	"strings"
	"testing"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
)

// --- CF Name validation tests ---

func TestValidateCFName(t *testing.T) {
	tests := []struct {
		name  string
		label string
		valid bool
	}{
		// Valid names
		{"lattice", "db", true},
		{"grove-lattice", "worker", true},
		{"my_database_123", "db", true},
		{"UPPER-case", "worker", true},
		{"a", "db", true},

		// Invalid: empty
		{"", "db", false},

		// Invalid: shell metacharacters
		{"db;rm -rf /", "db", false},
		{"db|cat", "db", false},
		{"db&echo", "db", false},
		{"db$(cmd)", "db", false},
		{"db`id`", "db", false},
		{"db'inject", "db", false},
		{"db\"inject", "db", false},
		{"db\\path", "db", false},
		{"db{}", "db", false},
		{"db<>", "db", false},
		{"db()", "db", false},

		// Invalid: control characters
		{"db\nname", "db", false},
		{"db\rname", "db", false},
		{"db\x00name", "db", false},
	}

	for _, tt := range tests {
		err := validateCFName(tt.name, tt.label)
		if tt.valid && err != nil {
			t.Errorf("validateCFName(%q) should be valid, got: %v", tt.name, err)
		}
		if !tt.valid && err == nil {
			t.Errorf("validateCFName(%q) should be invalid, got nil", tt.name)
		}
	}
}

func TestValidateCFNameTooLong(t *testing.T) {
	long := strings.Repeat("a", maxCFNameLen+1)
	err := validateCFName(long, "test")
	if err == nil {
		t.Errorf("validateCFName should reject strings longer than %d", maxCFNameLen)
	}
}

// --- CF Key validation tests ---

func TestValidateCFKey(t *testing.T) {
	tests := []struct {
		key   string
		valid bool
	}{
		// Valid keys
		{"my-key", true},
		{"path/to/object", true},
		{"user:session:abc123", true},
		{"key_with_underscores", true},
		{"KEY.WITH.DOTS", true},
		{"a", true},

		// Invalid: empty
		{"", false},

		// Invalid: control characters
		{"key\x00val", false},
		{"key\nval", false},
		{"key\rval", false},
	}

	for _, tt := range tests {
		err := validateCFKey(tt.key)
		if tt.valid && err != nil {
			t.Errorf("validateCFKey(%q) should be valid, got: %v", tt.key, err)
		}
		if !tt.valid && err == nil {
			t.Errorf("validateCFKey(%q) should be invalid, got nil", tt.key)
		}
	}
}

func TestValidateCFKeyTooLong(t *testing.T) {
	long := strings.Repeat("k", maxCFKeyLen+1)
	err := validateCFKey(long)
	if err == nil {
		t.Errorf("validateCFKey should reject keys longer than %d", maxCFKeyLen)
	}
}

// --- D1 limit clamping ---

func TestClampD1Limit(t *testing.T) {
	tests := []struct {
		input, want int
	}{
		{100, 100},
		{0, 1},
		{-5, 1},
		{1, 1},
		{10000, 10000},
		{10001, 10000},
		{99999, 10000},
		{500, 500},
	}
	for _, tt := range tests {
		got := clampD1Limit(tt.input)
		if got != tt.want {
			t.Errorf("clampD1Limit(%d) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// --- KV limit clamping ---

func TestClampKVLimit(t *testing.T) {
	tests := []struct {
		input, want int
	}{
		{100, 100},
		{0, 1},
		{-1, 1},
		{10000, 10000},
		{10001, 10000},
	}
	for _, tt := range tests {
		got := clampKVLimit(tt.input)
		if got != tt.want {
			t.Errorf("clampKVLimit(%d) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// --- R2 limit clamping ---

func TestClampR2Limit(t *testing.T) {
	tests := []struct {
		input, want int
	}{
		{100, 100},
		{0, 1},
		{-1, 1},
		{10000, 10000},
		{10001, 10000},
	}
	for _, tt := range tests {
		got := clampR2Limit(tt.input)
		if got != tt.want {
			t.Errorf("clampR2Limit(%d) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// --- Identifier validation ---

func TestIsValidIdentifier(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{"users", true},
		{"my_table", true},
		{"Table1", true},
		{"_private", true},
		{"A", true},

		// Invalid
		{"", false},
		{"1leading", false},
		{"has space", false},
		{"has-dash", false},
		{"has.dot", false},
		{"drop;table", false},
	}
	for _, tt := range tests {
		got := isValidIdentifier(tt.input)
		if got != tt.valid {
			t.Errorf("isValidIdentifier(%q) = %v, want %v", tt.input, got, tt.valid)
		}
	}
}

func TestIsValidIdentifierTooLong(t *testing.T) {
	long := strings.Repeat("a", 129)
	if isValidIdentifier(long) {
		t.Error("isValidIdentifier should reject strings > 128 chars")
	}
}

// --- D1 result parsing ---

func TestParseD1Results(t *testing.T) {
	// Standard wrangler format: [{"results": [...]}]
	input := `[{"results": [{"name": "users"}, {"name": "posts"}], "success": true}]`
	rows := parseD1Results(input)
	if len(rows) != 2 {
		t.Errorf("parseD1Results got %d rows, want 2", len(rows))
	}
	if rows[0]["name"] != "users" {
		t.Errorf("parseD1Results first row name = %v, want 'users'", rows[0]["name"])
	}

	// Empty results
	empty := `[{"results": [], "success": true}]`
	rows = parseD1Results(empty)
	if len(rows) != 0 {
		t.Errorf("parseD1Results empty should return 0 rows, got %d", len(rows))
	}

	// Invalid JSON
	rows = parseD1Results("not json")
	if rows != nil {
		t.Error("parseD1Results should return nil for invalid JSON")
	}

	// Single object format
	single := `{"results": [{"id": 1}]}`
	rows = parseD1Results(single)
	if len(rows) != 1 {
		t.Errorf("parseD1Results single format got %d rows, want 1", len(rows))
	}
}

// --- D1 value formatting ---

func TestFormatD1Value(t *testing.T) {
	tests := []struct {
		input interface{}
		want  string
	}{
		{nil, "NULL"},
		{"hello", "hello"},
		{42.0, "42"},
		{true, "true"},
	}
	for _, tt := range tests {
		got := formatD1Value(tt.input)
		if got != tt.want {
			t.Errorf("formatD1Value(%v) = %q, want %q", tt.input, got, tt.want)
		}
	}

	// Long string truncation
	long := strings.Repeat("x", 60)
	got := formatD1Value(long)
	if len(got) != 50 {
		t.Errorf("formatD1Value should truncate to 50, got len=%d", len(got))
	}
}

// --- Size formatting ---

func TestFormatSize(t *testing.T) {
	tests := []struct {
		input float64
		want  string
	}{
		{0, "0 B"},
		{100, "100 B"},
		{1024, "1.0 KB"},
		{1536, "1.5 KB"},
		{1048576, "1.0 MB"},
		{1073741824, "1.0 GB"},
		{1610612736, "1.5 GB"},
	}
	for _, tt := range tests {
		got := formatSize(tt.input)
		if got != tt.want {
			t.Errorf("formatSize(%f) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

// --- Flag parsing ---

func TestParseFlagEnabled(t *testing.T) {
	tests := []struct {
		raw     string
		enabled bool
	}{
		// JSON object with enabled field
		{`{"enabled": true}`, true},
		{`{"enabled": false}`, false},
		{`{"enabled": true, "extra": "data"}`, true},

		// JSON booleans
		{"true", true},
		{"false", false},

		// JSON numbers
		{"1", true},
		{"0", false},

		// Plain strings
		{"true", true},
		{"false", false},
		{"yes", true},
		{"no", false},
		{"on", true},
		{"off", false},
		{"TRUE", true},
		{"FALSE", false},
		{"1", true},
		{"0", false},
		{"random", false},
	}
	for _, tt := range tests {
		enabled, _ := parseFlagEnabled(tt.raw)
		if enabled != tt.enabled {
			t.Errorf("parseFlagEnabled(%q) = %v, want %v", tt.raw, enabled, tt.enabled)
		}
	}
}

// --- Cloudflare safety tiers ---

func TestCloudflareSafetyTiers(t *testing.T) {
	// READ operations should not require --write
	readOps := []string{
		"d1_list", "d1_tables", "d1_schema", "d1_query_read",
		"kv_list", "kv_keys", "kv_get",
		"r2_list", "r2_ls", "r2_get",
		"deploy_dry", "logs_tail",
		"flag_list", "flag_get",
		"backup_list", "backup_download",
		"do_list", "do_info", "do_alarm",
		"email_status", "email_rules",
	}
	for _, op := range readOps {
		err := safety.CheckCloudflareSafety(op, false, false, false, false)
		if err != nil {
			t.Errorf("CheckCloudflareSafety(%q) should be READ (no error), got: %v", op, err)
		}
	}

	// WRITE operations should require --write
	writeOps := []string{
		"d1_query_write", "d1_migrate",
		"kv_put", "kv_delete",
		"r2_create", "r2_put",
		"deploy",
		"flag_enable", "flag_disable",
		"backup_create",
		"email_test",
	}
	for _, op := range writeOps {
		err := safety.CheckCloudflareSafety(op, false, false, false, false)
		if err == nil {
			t.Errorf("CheckCloudflareSafety(%q) should require --write, got nil", op)
		}
	}

	// WRITE operations should pass with --write
	for _, op := range writeOps {
		err := safety.CheckCloudflareSafety(op, true, false, false, false)
		if err != nil {
			t.Errorf("CheckCloudflareSafety(%q) with --write should pass, got: %v", op, err)
		}
	}

	// DESTRUCTIVE operations should require --write AND --force
	destructiveOps := []string{
		"r2_rm", "flag_delete", "backup_restore",
	}
	for _, op := range destructiveOps {
		// Without --write: error
		err := safety.CheckCloudflareSafety(op, false, false, false, false)
		if err == nil {
			t.Errorf("CheckCloudflareSafety(%q) should require --write, got nil", op)
		}
		// With --write but no --force: error
		err = safety.CheckCloudflareSafety(op, true, false, false, false)
		if err == nil {
			t.Errorf("CheckCloudflareSafety(%q) with --write but no --force should error, got nil", op)
		}
		// With --write AND --force: ok
		err = safety.CheckCloudflareSafety(op, true, true, false, false)
		if err != nil {
			t.Errorf("CheckCloudflareSafety(%q) with --write --force should pass, got: %v", op, err)
		}
	}

	// DESTRUCTIVE operations should be blocked in agent mode
	for _, op := range destructiveOps {
		err := safety.CheckCloudflareSafety(op, true, true, true, false)
		if err == nil {
			t.Errorf("CheckCloudflareSafety(%q) in agent mode should be blocked, got nil", op)
		}
	}
}

// --- Unknown CF operation defaults ---

func TestCloudflareUnknownOpDefaultsToWrite(t *testing.T) {
	tier := safety.CloudflareOperationTier("unknown_operation")
	if tier != safety.TierWrite {
		t.Errorf("unknown CF operation should default to TierWrite, got %v", tier)
	}
}

// --- Namespace resolution ---

func TestResolveNamespaceRejectsInvalid(t *testing.T) {
	bad := []string{
		"ns;rm", "ns|cat", "ns&echo", "ns`id`",
	}
	for _, alias := range bad {
		_, err := resolveNamespace(alias)
		if err == nil {
			t.Errorf("resolveNamespace(%q) should reject, got nil", alias)
		}
	}
}

func TestResolveNamespaceAcceptsLongID(t *testing.T) {
	// 32-char hex string should be accepted as raw ID
	id := "514e91e81cc44d128a82ec6f668303e4"
	result, err := resolveNamespace(id)
	if err != nil {
		t.Errorf("resolveNamespace(%q) should accept long ID, got: %v", id, err)
	}
	if result != id {
		t.Errorf("resolveNamespace(%q) = %q, want same ID back", id, result)
	}
}

// --- Database resolution ---

func TestResolveDatabaseRejectsInvalid(t *testing.T) {
	bad := []string{
		"db;rm", "db|cat", "db&echo", "db`id`",
	}
	for _, alias := range bad {
		_, err := resolveDatabase(alias)
		if err == nil {
			t.Errorf("resolveDatabase(%q) should reject, got nil", alias)
		}
	}
}

func TestResolveDatabasePassesThrough(t *testing.T) {
	// Unknown alias should pass through as-is
	name, err := resolveDatabase("mydb")
	if err != nil {
		t.Errorf("resolveDatabase('mydb') should pass, got: %v", err)
	}
	if name != "mydb" {
		t.Errorf("resolveDatabase('mydb') = %q, want 'mydb'", name)
	}
}
