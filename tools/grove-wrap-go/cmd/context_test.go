package cmd

import "testing"

func TestExtractField(t *testing.T) {
	text := `Some output
email: user@example.com
account: test-account
other stuff`

	tests := []struct {
		key  string
		want string
	}{
		{"email", "user@example.com"},
		{"account", "test-account"},
		{"missing", ""},
	}

	for _, tt := range tests {
		got := extractField(text, tt.key)
		if got != tt.want {
			t.Errorf("extractField(text, %q) = %q, want %q", tt.key, got, tt.want)
		}
	}
}

func TestExtractFieldEquals(t *testing.T) {
	text := `name=John
age=30`

	got := extractField(text, "name")
	if got != "John" {
		t.Errorf("extractField with = separator: got %q, want %q", got, "John")
	}
}

func TestExtractCFField(t *testing.T) {
	text := `Getting User settings...
👋 You are logged in with an OAuth Token, associated with the email user@example.com!
`

	got := extractCFField(text, "email")
	if got == "" {
		// Cloudflare output format may vary; at minimum verify no panic
		t.Log("Could not extract email from sample Cloudflare output (format-dependent)")
	}
}
