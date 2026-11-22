package exec

import (
	"encoding/json"
	"fmt"
	"strings"
)

// d1Envelope mirrors the shape `wrangler d1 execute --json` returns: one entry
// per statement, each with its own results array.
type d1Envelope struct {
	Results []map[string]any `json:"results"`
	Success bool             `json:"success"`
	Error   string           `json:"error,omitempty"`
}

// D1Query runs a read-only statement against a remote D1 database and returns
// the rows. Intended for inspection commands — writes should go through a
// command that owns its own safety gate and verification.
func D1Query(database, sql string) ([]map[string]any, error) {
	out, err := WranglerOutput("d1", "execute", database, "--remote", "--yes", "--json", "--command", sql)
	if err != nil {
		return nil, D1ErrorText(err)
	}
	return ParseD1Rows(out)
}

// ParseD1Rows unwraps wrangler's JSON envelope into a flat row slice.
// Exported so the parsing can be tested without shelling out to wrangler.
func ParseD1Rows(raw string) ([]map[string]any, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, fmt.Errorf("d1: empty response")
	}
	// Wrangler may print banner lines ahead of the payload.
	if idx := strings.Index(trimmed, "["); idx > 0 {
		trimmed = trimmed[idx:]
	}

	var envelopes []d1Envelope
	if err := json.Unmarshal([]byte(trimmed), &envelopes); err != nil {
		return nil, fmt.Errorf("d1: could not parse wrangler output: %w", err)
	}

	rows := []map[string]any{}
	for _, env := range envelopes {
		if env.Error != "" {
			return nil, fmt.Errorf("d1: %s", env.Error)
		}
		rows = append(rows, env.Results...)
	}
	return rows, nil
}

// D1ErrorText turns wrangler's failure output into one readable line.
//
// `wrangler d1 execute` reports errors as a JSON envelope on stderr, so a plain
// `wrangler: {...}` is what a caller would otherwise see — useless in a terminal
// at 2am. Pull out the message and drop the rest.
func D1ErrorText(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()

	// Wrangler buries the useful part ("no such table: signup_blocks") in a
	// `notes` entry. Prefer it over the generic API-failure line above it.
	if idx := strings.Index(msg, "no such table"); idx >= 0 {
		rest := msg[idx:]
		if end := strings.IndexAny(rest, "\"\n"); end > 0 {
			rest = rest[:end]
		}
		return fmt.Errorf("d1: %s", strings.TrimSpace(rest))
	}

	if idx := strings.Index(msg, `"text": "`); idx >= 0 {
		rest := msg[idx+len(`"text": "`):]
		if end := strings.Index(rest, `"`); end > 0 {
			return fmt.Errorf("d1: %s", strings.TrimSpace(rest[:end]))
		}
	}

	// Wrangler also prefixes its own failures with "wrangler: " and then dumps
	// both stdout and stderr. First line is the part that matters.
	firstLine := strings.TrimSpace(strings.SplitN(msg, "\n", 2)[0])
	firstLine = strings.TrimPrefix(firstLine, "wrangler: ")
	return fmt.Errorf("d1: %s", firstLine)
}
