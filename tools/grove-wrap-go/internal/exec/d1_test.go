package exec

import (
	"strings"
	"testing"
)

func TestParseD1Rows(t *testing.T) {
	raw := `[
		{
			"results": [
				{"subdomain": "autumn", "post_count": 42, "active": 1}
			],
			"success": true
		}
	]`

	rows, err := ParseD1Rows(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("got %d rows, want 1", len(rows))
	}
	if rows[0]["subdomain"] != "autumn" {
		t.Errorf("subdomain = %v, want autumn", rows[0]["subdomain"])
	}
}

func TestParseD1RowsHandlesBannerLines(t *testing.T) {
	raw := "⛅️ wrangler 4.42.0\n\n[{\"results\": [{\"subdomain\": \"autumn\"}], \"success\": true}]"

	rows, err := ParseD1Rows(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 1 || rows[0]["subdomain"] != "autumn" {
		t.Fatalf("rows = %v", rows)
	}
}

func TestParseD1RowsFlattensMultipleStatements(t *testing.T) {
	raw := `[
		{"results": [{"a": 1}], "success": true},
		{"results": [{"b": 2}], "success": true}
	]`

	rows, err := ParseD1Rows(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("got %d rows, want 2", len(rows))
	}
}

func TestParseD1RowsEmptyResultIsNotAnError(t *testing.T) {
	// A missing tenant is a normal answer, not a failure — callers decide.
	rows, err := ParseD1Rows(`[{"results": [], "success": true}]`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 0 {
		t.Fatalf("got %d rows, want 0", len(rows))
	}
}

func TestParseD1RowsSurfacesErrorField(t *testing.T) {
	_, err := ParseD1Rows(`[{"results": [], "success": false, "error": "no such table: tenants"}]`)
	if err == nil {
		t.Fatal("expected an error")
	}
	if !strings.Contains(err.Error(), "no such table") {
		t.Errorf("error should carry the D1 message, got: %v", err)
	}
}

func TestParseD1RowsRejectsNonJSON(t *testing.T) {
	if _, err := ParseD1Rows("Not authenticated. Please run `npx wrangler login`."); err == nil {
		t.Fatal("expected an error for non-JSON output")
	}
	if _, err := ParseD1Rows(""); err == nil {
		t.Fatal("expected an error for empty output")
	}
}
