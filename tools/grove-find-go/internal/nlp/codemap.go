package nlp

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

// expandDirs are top-level directories whose children get listed in the codebase map.
var expandDirs = map[string]bool{
	"apps":    true,
	"libs":    true,
	"workers": true,
	"tools":   true,
	"docs":    true,
	"services": true,
}

// skipDirs are directories excluded from the codebase map.
var skipDirs = map[string]bool{
	"node_modules": true,
	".git":         true,
	"dist":         true,
	"build":        true,
	"_archived":    true,
}

// annotatedDirs provides hints for common large packages.
var annotatedDirs = map[string]string{
	"libs/engine": "core business logic",
}

// BuildCodebaseMap generates a compact text map of the project structure.
// It scans the GroveRoot at depth 0, and for key directories (apps, libs, workers, tools, docs)
// lists their children at depth 1. The output is optimized for token efficiency (~150 tokens).
func BuildCodebaseMap() string {
	cfg := config.Get()
	root := cfg.GroveRoot

	entries, err := os.ReadDir(root)
	if err != nil {
		return "Codebase Map:\n(could not read project root)\n"
	}

	var lines []string
	var otherDirs []string

	// Sort entries for deterministic output
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		name := entry.Name()

		// Skip non-directories, hidden dirs, and excluded dirs
		if !entry.IsDir() {
			continue
		}
		if strings.HasPrefix(name, ".") {
			continue
		}
		if skipDirs[name] {
			continue
		}

		if expandDirs[name] {
			children := listChildren(filepath.Join(root, name))
			if len(children) > 0 {
				lines = append(lines, fmt.Sprintf("%s: %s", name, strings.Join(children, ", ")))
			}
		} else {
			otherDirs = append(otherDirs, name)
		}
	}

	if len(otherDirs) > 0 {
		lines = append(lines, fmt.Sprintf("other: %s", strings.Join(otherDirs, ", ")))
	}

	return "Codebase Map:\n" + strings.Join(lines, "\n") + "\n"
}

// listChildren returns the names of subdirectories in a directory.
// Annotated names (e.g. "engine (core business logic)") are included where defined.
func listChildren(dir string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}

	parent := filepath.Base(dir)
	var children []string

	for _, entry := range entries {
		name := entry.Name()
		if !entry.IsDir() {
			continue
		}
		if strings.HasPrefix(name, ".") {
			continue
		}
		if skipDirs[name] {
			continue
		}

		key := parent + "/" + name
		if annotation, ok := annotatedDirs[key]; ok {
			children = append(children, fmt.Sprintf("%s (%s)", name, annotation))
		} else {
			children = append(children, name)
		}
	}

	return children
}
