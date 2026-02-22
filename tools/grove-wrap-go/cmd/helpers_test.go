package cmd

import (
	"testing"
)

func TestSanitizeRef(t *testing.T) {
	tests := []struct {
		ref   string
		valid bool
	}{
		{"main", true},
		{"HEAD", true},
		{"v1.0.0", true},
		{"feature/add-auth", true},
		{"abc123", true},
		{"HEAD~3", true},
		{"origin/main", true},
		{"-flag", false},
		{"--help", false},
		{"--exec=rm", false},
		{"-n5", false},
	}

	for _, tt := range tests {
		err := sanitizeRef(tt.ref)
		if tt.valid && err != nil {
			t.Errorf("sanitizeRef(%q) should be valid, got error: %v", tt.ref, err)
		}
		if !tt.valid && err == nil {
			t.Errorf("sanitizeRef(%q) should be invalid, got nil error", tt.ref)
		}
	}
}

func TestClampLimit(t *testing.T) {
	tests := []struct {
		n, min, max, want int
	}{
		{10, 1, 100, 10},
		{0, 1, 100, 1},
		{-5, 1, 100, 1},
		{200, 1, 100, 100},
		{1, 1, 100, 1},
		{100, 1, 100, 100},
		{50, 1, 10000, 50},
	}

	for _, tt := range tests {
		got := clampLimit(tt.n, tt.min, tt.max)
		if got != tt.want {
			t.Errorf("clampLimit(%d, %d, %d) = %d, want %d", tt.n, tt.min, tt.max, got, tt.want)
		}
	}
}

func TestFormatDateShort(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"2026-02-22 04:12:00 +0000", "2026-02-22"},
		{"2025-01-15 12:00:00 -0500", "2025-01-15"},
		{"short", "short"},
		{"", ""},
		{"  2026-02-22 04:12:00 +0000  ", "2026-02-22"},
	}

	for _, tt := range tests {
		got := formatDateShort(tt.input)
		if got != tt.want {
			t.Errorf("formatDateShort(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestBlameLineRegex(t *testing.T) {
	valid := []string{
		"10,20",
		"1-50",
		"100",
		"/func main/",
	}
	invalid := []string{
		"DROP TABLE users",
		"abc",
		"10 20",
		"--exec",
		"",
	}

	for _, s := range valid {
		if !blameLineRe.MatchString(s) {
			t.Errorf("blameLineRe should match %q", s)
		}
	}
	for _, s := range invalid {
		if blameLineRe.MatchString(s) {
			t.Errorf("blameLineRe should NOT match %q", s)
		}
	}
}
