package cmd

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectPackageType(t *testing.T) {
	// Create temp directory structure for testing
	tmp := t.TempDir()

	// SvelteKit: has svelte.config.js + package.json
	svelteDir := filepath.Join(tmp, "sveltekit-app")
	os.Mkdir(svelteDir, 0755)
	os.WriteFile(filepath.Join(svelteDir, "package.json"), []byte(`{}`), 0644)
	os.WriteFile(filepath.Join(svelteDir, "svelte.config.js"), []byte(`export default {}`), 0644)

	// Worker: has wrangler.toml + package.json (no svelte)
	workerDir := filepath.Join(tmp, "worker-app")
	os.Mkdir(workerDir, 0755)
	os.WriteFile(filepath.Join(workerDir, "package.json"), []byte(`{}`), 0644)
	os.WriteFile(filepath.Join(workerDir, "wrangler.toml"), []byte(`name = "test"`), 0644)

	// Library: has package.json only
	libDir := filepath.Join(tmp, "lib")
	os.Mkdir(libDir, 0755)
	os.WriteFile(filepath.Join(libDir, "package.json"), []byte(`{}`), 0644)

	// Python: has pyproject.toml
	pyDir := filepath.Join(tmp, "py-tool")
	os.Mkdir(pyDir, 0755)
	os.WriteFile(filepath.Join(pyDir, "pyproject.toml"), []byte(`[project]`), 0644)

	// Go: has go.mod
	goDir := filepath.Join(tmp, "go-tool")
	os.Mkdir(goDir, 0755)
	os.WriteFile(filepath.Join(goDir, "go.mod"), []byte(`module test`), 0644)

	// Zig: has build.zig
	zigDir := filepath.Join(tmp, "zig-pkg")
	os.Mkdir(zigDir, 0755)
	os.WriteFile(filepath.Join(zigDir, "build.zig"), []byte(`pub fn main() {}`), 0644)

	// Empty dir: no type
	emptyDir := filepath.Join(tmp, "empty")
	os.Mkdir(emptyDir, 0755)

	tests := []struct {
		dir  string
		want string
	}{
		{svelteDir, "sveltekit"},
		{workerDir, "worker"},
		{libDir, "library"},
		{pyDir, "python"},
		{goDir, "go"},
		{zigDir, "zig"},
		{emptyDir, ""},
	}

	for _, tt := range tests {
		got := detectPackageType(tt.dir)
		if got != tt.want {
			t.Errorf("detectPackageType(%s) = %q, want %q", filepath.Base(tt.dir), got, tt.want)
		}
	}
}

func TestDetectPackageTypePrecedence(t *testing.T) {
	tmp := t.TempDir()

	// Zig takes precedence even if package.json exists
	dir := filepath.Join(tmp, "zig-hybrid")
	os.Mkdir(dir, 0755)
	os.WriteFile(filepath.Join(dir, "build.zig"), []byte(`pub fn main() {}`), 0644)
	os.WriteFile(filepath.Join(dir, "package.json"), []byte(`{}`), 0644)

	got := detectPackageType(dir)
	if got != "zig" {
		t.Errorf("zig should take precedence, got %q", got)
	}

	// Python takes precedence over package.json-based types
	pyDir := filepath.Join(tmp, "py-hybrid")
	os.Mkdir(pyDir, 0755)
	os.WriteFile(filepath.Join(pyDir, "pyproject.toml"), []byte(`[project]`), 0644)
	os.WriteFile(filepath.Join(pyDir, "package.json"), []byte(`{}`), 0644)

	got = detectPackageType(pyDir)
	if got != "python" {
		t.Errorf("python should take precedence, got %q", got)
	}
}

func TestDiscoverPackages(t *testing.T) {
	// Build a synthetic monorepo structure using t.TempDir() so the
	// test works in CI and on any machine (not just the developer's).
	root := t.TempDir()

	// tools/grove-wrap-go — Go package (go.mod)
	mkPkg(t, root, "tools/grove-wrap-go", "go.mod", "module test")
	// tools/grove-find-go — Go package (go.mod)
	mkPkg(t, root, "tools/grove-find-go", "go.mod", "module test")
	// libs/engine — SvelteKit (svelte.config.js + package.json)
	mkPkg(t, root, "libs/engine", "package.json", `{}`)
	os.WriteFile(filepath.Join(root, "libs/engine/svelte.config.js"), []byte(`export default {}`), 0644)
	// apps/amber — SvelteKit
	mkPkg(t, root, "apps/amber", "package.json", `{}`)
	os.WriteFile(filepath.Join(root, "apps/amber/svelte.config.js"), []byte(`export default {}`), 0644)
	// apps/cedar — SvelteKit
	mkPkg(t, root, "apps/cedar", "package.json", `{}`)
	os.WriteFile(filepath.Join(root, "apps/cedar/svelte.config.js"), []byte(`export default {}`), 0644)
	// workers/api — Worker (wrangler.toml + package.json)
	mkPkg(t, root, "workers/api", "package.json", `{}`)
	os.WriteFile(filepath.Join(root, "workers/api/wrangler.toml"), []byte(`name = "api"`), 0644)
	// services/auth — Worker
	mkPkg(t, root, "services/auth", "package.json", `{}`)
	os.WriteFile(filepath.Join(root, "services/auth/wrangler.toml"), []byte(`name = "auth"`), 0644)
	// tools/gw — Python (pyproject.toml)
	mkPkg(t, root, "tools/gw", "pyproject.toml", `[project]`)
	// packages/config — library (package.json only)
	mkPkg(t, root, "packages/config", "package.json", `{}`)
	// packages/types — library
	mkPkg(t, root, "packages/types", "package.json", `{}`)
	// libs/shared — library
	mkPkg(t, root, "libs/shared", "package.json", `{}`)

	pkgs := discoverPackages(root)
	if len(pkgs) < 10 {
		t.Errorf("expected at least 10 packages, got %d", len(pkgs))
	}

	// Verify known packages exist
	found := map[string]bool{}
	for _, p := range pkgs {
		found[p.Name] = true
	}

	expected := []string{"tools/grove-wrap-go", "tools/grove-find-go", "libs/engine"}
	for _, name := range expected {
		if !found[name] {
			t.Errorf("expected to find package %q", name)
		}
	}
}

// mkPkg creates a directory under root/relPath with a single marker file.
func mkPkg(t *testing.T, root, relPath, filename, content string) {
	t.Helper()
	dir := filepath.Join(root, relPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("mkPkg: mkdir %s: %v", dir, err)
	}
	if err := os.WriteFile(filepath.Join(dir, filename), []byte(content), 0644); err != nil {
		t.Fatalf("mkPkg: write %s/%s: %v", dir, filename, err)
	}
}

func TestAvailableScripts(t *testing.T) {
	tests := []struct {
		scripts map[string]string
		want    string
	}{
		{nil, ""},
		{map[string]string{}, ""},
		{map[string]string{"dev": "vite dev", "build": "vite build"}, "[dev, build]"},
		{map[string]string{"custom": "echo hi"}, ""},
		{map[string]string{"dev": "vite dev", "test": "vitest", "build": "vite build", "check": "svelte-check", "lint": "eslint ."}, "[dev, build, test, check, lint]"},
	}

	for _, tt := range tests {
		got := availableScripts(tt.scripts)
		if got != tt.want {
			t.Errorf("availableScripts(%v) = %q, want %q", tt.scripts, got, tt.want)
		}
	}
}

func TestFileExists(t *testing.T) {
	tmp := t.TempDir()

	// Create a real file
	testFile := filepath.Join(tmp, "exists.txt")
	os.WriteFile(testFile, []byte("hello"), 0644)

	if !fileExists(testFile) {
		t.Error("existing file should return true")
	}

	// File that shouldn't exist
	if fileExists(filepath.Join(tmp, "nonexistent-file-12345")) {
		t.Error("nonexistent file should return false")
	}

	// Directory should return false
	if fileExists(tmp) {
		t.Error("directory should return false for fileExists")
	}
}

func TestReadPackageScripts(t *testing.T) {
	tmp := t.TempDir()

	// Valid package.json with scripts
	os.WriteFile(filepath.Join(tmp, "package.json"), []byte(`{
		"name": "test",
		"scripts": {
			"dev": "vite dev",
			"build": "vite build"
		}
	}`), 0644)

	scripts := readPackageScripts(tmp)
	if scripts == nil {
		t.Fatal("expected scripts map, got nil")
	}
	if scripts["dev"] != "vite dev" {
		t.Errorf("scripts[dev] = %q, want %q", scripts["dev"], "vite dev")
	}
	if scripts["build"] != "vite build" {
		t.Errorf("scripts[build] = %q, want %q", scripts["build"], "vite build")
	}

	// No package.json
	emptyDir := t.TempDir()
	scripts = readPackageScripts(emptyDir)
	if scripts != nil {
		t.Errorf("expected nil scripts for empty dir, got %v", scripts)
	}
}

func TestDetectAffectedPackages(t *testing.T) {
	tests := []struct {
		files []string
		want  int
	}{
		{[]string{"apps/amber/src/main.ts", "apps/amber/package.json"}, 1},
		{[]string{"apps/amber/src/main.ts", "libs/engine/src/index.ts"}, 2},
		{[]string{"README.md"}, 0},
		{[]string{}, 0},
		{[]string{"tools/grove-wrap-go/main.go"}, 1},
	}

	for _, tt := range tests {
		got := detectAffectedPackages(tt.files)
		if len(got) != tt.want {
			t.Errorf("detectAffectedPackages(%v) returned %d packages, want %d", tt.files, len(got), tt.want)
		}
	}
}
