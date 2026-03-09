package cmd

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
)

// sanitizeSQL escapes single quotes in SQL string literals.
// This is a basic defense — D1 queries run via wrangler CLI, not direct DB access.
func sanitizeSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

// firstOrNil returns the first row or nil for JSON output.
func firstOrNil(rows []map[string]interface{}) interface{} {
	if len(rows) > 0 {
		return rows[0]
	}
	return nil
}

// generateToken generates a URL-safe random token of the given byte length.
func generateToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(b), nil
}

// truncDate returns the first 10 characters of a timestamp (the date portion).
func truncDate(ts string) string {
	if len(ts) >= 10 {
		return ts[:10]
	}
	return ts
}

// TruncateStr truncates a string to max characters, appending an ellipsis if needed.
func TruncateStr(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-1] + "…"
}

// viewportSlice takes rendered content, a scroll offset, and terminal height,
// and returns only the visible lines with a scroll indicator when needed.
func viewportSlice(content string, offset, height int) string {
	lines := strings.Split(content, "\n")

	// If content fits, no viewport needed
	if len(lines) <= height {
		return content
	}

	// Reserve 1 line for the scroll indicator
	viewH := height - 1
	if viewH < 1 {
		viewH = 1
	}

	maxOffset := len(lines) - viewH
	if maxOffset < 0 {
		maxOffset = 0
	}
	if offset > maxOffset {
		offset = maxOffset
	}
	if offset < 0 {
		offset = 0
	}

	end := offset + viewH
	if end > len(lines) {
		end = len(lines)
	}

	visible := strings.Join(lines[offset:end], "\n")

	// Build scroll indicator
	hasAbove := offset > 0
	hasBelow := end < len(lines)
	var indicator string
	switch {
	case hasAbove && hasBelow:
		indicator = fmt.Sprintf("  ↑↓ j/k scroll (%d/%d)", offset+viewH, len(lines))
	case hasAbove:
		indicator = fmt.Sprintf("  ↑ k scroll up • any key to return (%d/%d)", offset+viewH, len(lines))
	case hasBelow:
		indicator = fmt.Sprintf("  ↓ j scroll down • any key to return (%d/%d)", offset+viewH, len(lines))
	}

	return visible + "\n" + indicator
}
