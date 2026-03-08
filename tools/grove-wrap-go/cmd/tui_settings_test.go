package cmd

import (
	"strings"
	"testing"
)

func TestNewTUISettings(t *testing.T) {
	s := newTUISettings()
	// Should load from config defaults
	if !s.autoWorktree {
		t.Error("autoWorktree should default to true")
	}
	if s.itemsPerPage < 10 {
		t.Errorf("itemsPerPage = %d, should be >= 10", s.itemsPerPage)
	}
	if s.dirty {
		t.Error("should not be dirty on creation")
	}
}

func TestSettingsToggle(t *testing.T) {
	s := newTUISettings()
	initial := s.autoWorktree

	s.cursor = settingAutoWorktree
	s.toggle()

	if s.autoWorktree == initial {
		t.Error("toggle should flip autoWorktree")
	}
	if !s.dirty {
		t.Error("should be dirty after toggle")
	}
}

func TestSettingsAdjustItemsPerPage(t *testing.T) {
	s := newTUISettings()
	s.itemsPerPage = 30
	s.cursor = settingItemsPerPage

	// Increase by 5
	s.adjust(1)
	if s.itemsPerPage != 35 {
		t.Errorf("after adjust(1): itemsPerPage = %d, want 35", s.itemsPerPage)
	}

	// Decrease by 5
	s.adjust(-1)
	if s.itemsPerPage != 30 {
		t.Errorf("after adjust(-1): itemsPerPage = %d, want 30", s.itemsPerPage)
	}
}

func TestSettingsItemsPerPageBounds(t *testing.T) {
	s := newTUISettings()
	s.cursor = settingItemsPerPage

	// Try to go below minimum
	s.itemsPerPage = minItemsPerPage
	s.adjust(-1)
	if s.itemsPerPage < minItemsPerPage {
		t.Errorf("itemsPerPage = %d, should not go below %d", s.itemsPerPage, minItemsPerPage)
	}

	// Try to go above maximum
	s.itemsPerPage = maxItemsPerPage
	s.adjust(1)
	if s.itemsPerPage > maxItemsPerPage {
		t.Errorf("itemsPerPage = %d, should not go above %d", s.itemsPerPage, maxItemsPerPage)
	}
}

func TestSettingsNavigation(t *testing.T) {
	s := newTUISettings()

	// Start at top
	if s.cursor != 0 {
		t.Errorf("cursor should start at 0, got %d", s.cursor)
	}

	// Move down
	s.handleKey("j")
	if s.cursor != 1 {
		t.Errorf("after j: cursor = %d, want 1", s.cursor)
	}

	// Can't go past bottom
	s.handleKey("j")
	if s.cursor != settingCount-1 {
		t.Errorf("cursor should not exceed %d, got %d", settingCount-1, s.cursor)
	}

	// Move up
	s.handleKey("k")
	if s.cursor != 0 {
		t.Errorf("after k: cursor = %d, want 0", s.cursor)
	}

	// Can't go above top
	s.handleKey("k")
	if s.cursor != 0 {
		t.Errorf("cursor should not go below 0, got %d", s.cursor)
	}
}

func TestSettingsCloseKeys(t *testing.T) {
	for _, key := range []string{"q", "esc", ","} {
		s := newTUISettings()
		if closed := s.handleKey(key); !closed {
			t.Errorf("key %q should close settings overlay", key)
		}
	}
}

func TestSettingsNonCloseKeys(t *testing.T) {
	for _, key := range []string{"j", "k", "enter", " ", "s"} {
		s := newTUISettings()
		if closed := s.handleKey(key); closed {
			t.Errorf("key %q should NOT close settings overlay", key)
		}
	}
}

func TestSettingsRender(t *testing.T) {
	s := newTUISettings()
	output := s.render()

	if !strings.Contains(output, "TUI Settings") {
		t.Error("render should contain 'TUI Settings' header")
	}
	if !strings.Contains(output, "Auto-create worktrees") {
		t.Error("render should contain worktree setting label")
	}
	if !strings.Contains(output, "Items per page") {
		t.Error("render should contain items per page label")
	}
	if !strings.Contains(output, "s save") {
		t.Error("render should contain save hint")
	}
}

func TestSettingsRenderDirty(t *testing.T) {
	s := newTUISettings()
	s.cursor = settingAutoWorktree
	s.toggle()

	output := s.render()
	if !strings.Contains(output, "Unsaved changes") {
		t.Error("render should show 'Unsaved changes' when dirty")
	}
}
