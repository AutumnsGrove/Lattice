// Package historydb manages gw command history stored as a JSON file
// at ~/.grove/gw_history.json.
package historydb

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	maxEntries  = 10000
	historyFile = "gw_history.json"
	groveDir    = ".grove"
)

// Entry is a single recorded command invocation.
type Entry struct {
	ID         int    `json:"id"`
	Command    string `json:"command"`
	Args       string `json:"args"`
	IsWrite    bool   `json:"is_write"`
	ExitCode   int    `json:"exit_code"`
	DurationMS int64  `json:"duration_ms"`
	Timestamp  string `json:"timestamp"`
}

// HistoryDB holds the in-memory history and the path to the JSON file.
type HistoryDB struct {
	path    string
	entries []Entry
}

// Open opens (or creates) the history database at ~/.grove/gw_history.json.
func Open() (*HistoryDB, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("historydb: cannot determine home directory: %w", err)
	}

	dir := filepath.Join(home, groveDir)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("historydb: cannot create %s: %w", dir, err)
	}

	db := &HistoryDB{
		path: filepath.Join(dir, historyFile),
	}

	if err := db.load(); err != nil {
		return nil, err
	}

	return db, nil
}

// RecordCommand appends a new entry to the history, auto-incrementing the ID,
// and persists the updated list to disk.
func (h *HistoryDB) RecordCommand(command, args string, isWrite bool, exitCode int, durationMS int64) error {
	nextID := 1
	if len(h.entries) > 0 {
		nextID = h.entries[len(h.entries)-1].ID + 1
	}

	entry := Entry{
		ID:         nextID,
		Command:    command,
		Args:       args,
		IsWrite:    isWrite,
		ExitCode:   exitCode,
		DurationMS: durationMS,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}

	h.entries = append(h.entries, entry)

	// Trim to max entries, keeping the most recent ones.
	if len(h.entries) > maxEntries {
		h.entries = h.entries[len(h.entries)-maxEntries:]
	}

	return h.save()
}

// List returns the last N entries in reverse chronological order (most recent first).
// If limit is <= 0, all entries are returned.
func (h *HistoryDB) List(limit int) []Entry {
	all := h.entries
	if limit > 0 && limit < len(all) {
		all = all[len(all)-limit:]
	}

	// Return reversed copy so most recent is first.
	result := make([]Entry, len(all))
	for i, e := range all {
		result[len(all)-1-i] = e
	}
	return result
}

// Search returns all entries whose command or args contain the query string
// (case-insensitive), most recent first.
func (h *HistoryDB) Search(query string) []Entry {
	lower := strings.ToLower(query)
	var matches []Entry
	for i := len(h.entries) - 1; i >= 0; i-- {
		e := h.entries[i]
		if strings.Contains(strings.ToLower(e.Command), lower) ||
			strings.Contains(strings.ToLower(e.Args), lower) {
			matches = append(matches, e)
		}
	}
	return matches
}

// GetByID looks up a single entry by its ID.
func (h *HistoryDB) GetByID(id int) (*Entry, bool) {
	for i := range h.entries {
		if h.entries[i].ID == id {
			return &h.entries[i], true
		}
	}
	return nil, false
}

// Clear removes entries older than the given duration string and persists.
// Accepted formats: 30d, 1w, 6m, 1y. If olderThan is empty, all entries
// are removed.
func (h *HistoryDB) Clear(olderThan string) (int, error) {
	if olderThan == "" {
		removed := len(h.entries)
		h.entries = nil
		return removed, h.save()
	}

	cutoff, err := parseDuration(olderThan)
	if err != nil {
		return 0, err
	}

	before := len(h.entries)
	kept := h.entries[:0]
	for _, e := range h.entries {
		ts, err := time.Parse(time.RFC3339, e.Timestamp)
		if err != nil {
			// Keep entries whose timestamps cannot be parsed.
			kept = append(kept, e)
			continue
		}
		if !ts.Before(cutoff) {
			kept = append(kept, e)
		}
	}
	h.entries = kept
	removed := before - len(h.entries)
	return removed, h.save()
}

// load reads the JSON history file into memory. If the file does not exist,
// the entry list is initialised empty without error.
func (h *HistoryDB) load() error {
	data, err := os.ReadFile(h.path)
	if os.IsNotExist(err) {
		h.entries = nil
		return nil
	}
	if err != nil {
		return fmt.Errorf("historydb: read %s: %w", h.path, err)
	}

	if err := json.Unmarshal(data, &h.entries); err != nil {
		// File is corrupt — start fresh rather than returning an error.
		h.entries = nil
		return nil
	}

	return nil
}

// save writes the in-memory entries to the JSON file with 0600 permissions.
func (h *HistoryDB) save() error {
	data, err := json.MarshalIndent(h.entries, "", "  ")
	if err != nil {
		return fmt.Errorf("historydb: marshal: %w", err)
	}
	if err := os.WriteFile(h.path, data, 0600); err != nil {
		return fmt.Errorf("historydb: write %s: %w", h.path, err)
	}
	return nil
}

// parseDuration converts a human duration string (e.g. "30d", "1w", "6m", "1y")
// to the time.Time that represents the cutoff point (now minus that duration).
func parseDuration(s string) (time.Time, error) {
	if len(s) < 2 {
		return time.Time{}, fmt.Errorf("historydb: invalid duration %q (examples: 30d, 1w, 6m, 1y)", s)
	}

	unit := s[len(s)-1]
	numStr := s[:len(s)-1]

	var n int
	if _, err := fmt.Sscanf(numStr, "%d", &n); err != nil || n <= 0 {
		return time.Time{}, fmt.Errorf("historydb: invalid duration %q — number must be a positive integer", s)
	}

	now := time.Now().UTC()
	switch unit {
	case 'd':
		return now.AddDate(0, 0, -n), nil
	case 'w':
		return now.AddDate(0, 0, -n*7), nil
	case 'm':
		return now.AddDate(0, -n, 0), nil
	case 'y':
		return now.AddDate(-n, 0, 0), nil
	default:
		return time.Time{}, fmt.Errorf("historydb: unknown duration unit %q (use d, w, m, or y)", string(unit))
	}
}
