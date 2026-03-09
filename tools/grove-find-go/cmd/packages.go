package cmd

import (
	"path/filepath"
	"strings"
)

// packageDirs lists the top-level directories that contain packages in the monorepo.
// "packages" is the original flat layout; the others are the new categorized layout.
var packageDirs = []string{"packages", "apps", "services", "workers", "libs", "tools"}

// isPackageDir returns true if the directory name is a known package category directory.
func isPackageDir(dir string) bool {
	for _, d := range packageDirs {
		if dir == d {
			return true
		}
	}
	return false
}

// extractPackageFromPath extracts a package identifier from a monorepo-relative file path.
//
// Old "packages/" layout returns bare names for backwards compatibility:
//
//	packages/engine/src/foo.ts → "engine"
//
// New categorized layout returns prefixed names:
//
//	apps/landing/src/foo.ts    → "apps/landing"
//	services/heartwood/src/... → "services/heartwood"
//	libs/engine/src/...        → "libs/engine"
//	workers/zephyr/src/...     → "workers/zephyr"
//	tools/gw/src/...           → "tools/gw"
//
// Returns empty string if the path doesn't match any known package directory.
func extractPackageFromPath(filePath string) string {
	parts := strings.Split(filepath.ToSlash(filePath), "/")
	for i, part := range parts {
		if isPackageDir(part) && i+1 < len(parts) {
			if part == "packages" {
				return parts[i+1]
			}
			return part + "/" + parts[i+1]
		}
	}
	return ""
}
