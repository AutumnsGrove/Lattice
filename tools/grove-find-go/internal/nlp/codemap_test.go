package nlp

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

func TestBuildCodebaseMap(t *testing.T) {
	// Create a temp directory structure that mimics a monorepo
	root := t.TempDir()

	// Create expandable dirs with children
	dirs := []string{
		"apps/amber",
		"apps/login",
		"libs/engine",
		"libs/foliage",
		"workers/lumen",
		"tools/gf",
		"docs/specs",
		"docs/plans",
		// Non-expandable dirs
		"scripts",
		"images",
		// Should be skipped
		"node_modules/something",
		".git/objects",
		"dist/output",
	}

	for _, d := range dirs {
		if err := os.MkdirAll(filepath.Join(root, d), 0755); err != nil {
			t.Fatalf("failed to create dir %s: %v", d, err)
		}
	}

	// Also create a regular file (should not appear as a dir)
	os.WriteFile(filepath.Join(root, "README.md"), []byte("hello"), 0644)

	// Point config to our temp root
	cfg := config.Get()
	originalRoot := cfg.GroveRoot
	cfg.GroveRoot = root
	defer func() { cfg.GroveRoot = originalRoot }()

	result := BuildCodebaseMap()

	// Verify structure
	if !strings.Contains(result, "Codebase Map:") {
		t.Error("missing header")
	}
	if !strings.Contains(result, "apps: amber, login") {
		t.Errorf("missing apps line, got:\n%s", result)
	}
	if !strings.Contains(result, "libs: engine (core business logic), foliage") {
		t.Errorf("missing libs line with annotation, got:\n%s", result)
	}
	if !strings.Contains(result, "workers: lumen") {
		t.Errorf("missing workers line, got:\n%s", result)
	}
	if !strings.Contains(result, "tools: gf") {
		t.Errorf("missing tools line, got:\n%s", result)
	}
	if !strings.Contains(result, "docs: plans, specs") {
		t.Errorf("missing docs line, got:\n%s", result)
	}

	// Verify skipped dirs don't appear
	if strings.Contains(result, "node_modules") {
		t.Error("node_modules should be skipped")
	}
	if strings.Contains(result, ".git") {
		t.Error(".git should be skipped")
	}
	if strings.Contains(result, "dist") {
		t.Error("dist should be skipped")
	}

	// Non-expandable dirs should appear in "other"
	if !strings.Contains(result, "other:") {
		t.Error("missing other line")
	}
	if !strings.Contains(result, "images") || !strings.Contains(result, "scripts") {
		t.Errorf("missing non-expandable dirs in other, got:\n%s", result)
	}
}

func TestBuildCodebaseMap_EmptyRoot(t *testing.T) {
	root := t.TempDir()

	cfg := config.Get()
	originalRoot := cfg.GroveRoot
	cfg.GroveRoot = root
	defer func() { cfg.GroveRoot = originalRoot }()

	result := BuildCodebaseMap()
	if !strings.Contains(result, "Codebase Map:") {
		t.Error("should still have header")
	}
}

func TestListChildren_SkipsHiddenAndExcluded(t *testing.T) {
	root := t.TempDir()

	dirs := []string{
		"visible",
		".hidden",
		"node_modules",
		"also-visible",
	}
	for _, d := range dirs {
		os.MkdirAll(filepath.Join(root, d), 0755)
	}

	children := listChildren(root)
	for _, c := range children {
		if strings.HasPrefix(c, ".") {
			t.Errorf("hidden dir should be skipped: %s", c)
		}
		if c == "node_modules" {
			t.Error("node_modules should be skipped")
		}
	}

	found := map[string]bool{}
	for _, c := range children {
		found[c] = true
	}
	if !found["visible"] || !found["also-visible"] {
		t.Errorf("expected visible dirs, got: %v", children)
	}
}
