package exec

import (
	"errors"
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

func TestD1ErrorTextExtractsTheMessage(t *testing.T) {
	raw := errors.New(`wrangler: {
  "error": {
    "text": "A request to the Cloudflare API failed.",
    "notes": [{"text": "no such table: signup_blocks"}]
  }
}`)

	err := D1ErrorText(raw)
	if err == nil {
		t.Fatal("expected an error")
	}
	// The note is the actionable part; the API-failure line above it is noise.
	if !strings.Contains(err.Error(), "no such table: signup_blocks") {
		t.Errorf("message not extracted: %v", err)
	}
	if strings.Contains(err.Error(), "notes") {
		t.Errorf("error should be one line, got: %v", err)
	}
}

func TestD1ErrorTextFallsBackToFirstLine(t *testing.T) {
	err := D1ErrorText(errors.New("wrangler: Not authenticated.\nPlease run `wrangler login`."))
	if err == nil {
		t.Fatal("expected an error")
	}
	if strings.Contains(err.Error(), "wrangler login") {
		t.Errorf("only the first line should survive, got: %v", err)
	}
	if !strings.Contains(err.Error(), "Not authenticated") {
		t.Errorf("first line should survive, got: %v", err)
	}
}

func TestD1ErrorTextPassesNilThrough(t *testing.T) {
	if err := D1ErrorText(nil); err != nil {
		t.Fatalf("nil in, %v out", err)
	}
}

func TestD1ErrorTextPrefersFriendlyTextOverNotes(t *testing.T) {
	raw := errors.New(`wrangler: {
  "error": {
    "text": "A request to the Cloudflare API failed."
  }
}`)
	err := D1ErrorText(raw)
	if err == nil || !strings.Contains(err.Error(), "Cloudflare API failed") {
		t.Fatalf("got %v", err)
	}
}
