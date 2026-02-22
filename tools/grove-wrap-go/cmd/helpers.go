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
