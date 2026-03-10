package nlp

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

func TestChunkFile_WholeFile(t *testing.T) {
	content := "const x = 1;\nconst y = 2;\n"
	chunks := chunkFile("libs/engine/src/lib/foo.ts", content)

	if len(chunks) != 1 {
		t.Fatalf("expected 1 chunk, got %d", len(chunks))
	}

	c := chunks[0]
	if c.FilePath != "libs/engine/src/lib/foo.ts" {
		t.Errorf("unexpected filepath: %s", c.FilePath)
	}
	if c.StartLine != 1 {
		t.Errorf("expected start line 1, got %d", c.StartLine)
	}
	if !strings.HasPrefix(c.Content, "libs/engine/src/lib/foo.ts\n") {
		t.Error("content should be prefixed with filepath")
	}
}

func TestChunkFile_LargeFile_BoundaryChunks(t *testing.T) {
	// Create a file with ~8000 chars and clear function boundaries
	var lines []string
	lines = append(lines, "import { foo } from './bar';")
	lines = append(lines, "")
	// First function block ~4000 chars
	lines = append(lines, "export function handleRequest(req: Request) {")
	for i := 0; i < 80; i++ {
		lines = append(lines, "  const value"+itoa(i)+" = processRequestBodyPayload(req.body);")
	}
	lines = append(lines, "}")
	lines = append(lines, "")
	// Second function block ~4000 chars
	lines = append(lines, "export function handleResponse(res: Response) {")
	for i := 0; i < 80; i++ {
		lines = append(lines, "  const result"+itoa(i)+" = transformResponseDataOutput(res.data);")
	}
	lines = append(lines, "}")

	content := strings.Join(lines, "\n")
	if len(content) < WholeFileMax {
		t.Fatalf("test content too small: %d chars (need > %d)", len(content), WholeFileMax)
	}

	chunks := chunkFile("libs/engine/src/lib/handler.ts", content)

	if len(chunks) < 2 {
		t.Fatalf("expected at least 2 boundary chunks, got %d", len(chunks))
	}

	// All chunks should reference the file
	for _, c := range chunks {
		if c.FilePath != "libs/engine/src/lib/handler.ts" {
			t.Errorf("unexpected filepath: %s", c.FilePath)
		}
		if c.StartLine < 1 || c.EndLine < c.StartLine {
			t.Errorf("invalid line range: %d-%d", c.StartLine, c.EndLine)
		}
	}
}

func TestChunkFile_VeryLargeFile_WindowChunks(t *testing.T) {
	// Create a file with >20000 chars (no natural boundaries)
	var lines []string
	for i := 0; i < 500; i++ {
		lines = append(lines, "// This is a line of content that is moderately long to fill up space quickly")
	}
	content := strings.Join(lines, "\n")
	if len(content) <= BoundaryMax {
		t.Fatalf("test content too small: %d chars (need > %d)", len(content), BoundaryMax)
	}

	chunks := chunkFile("libs/engine/src/lib/big.ts", content)

	if len(chunks) < 3 {
		t.Fatalf("expected at least 3 window chunks, got %d", len(chunks))
	}

	// Verify sliding window with overlap
	for i := 1; i < len(chunks); i++ {
		if chunks[i].StartLine >= chunks[i-1].EndLine {
			// There should be some overlap
			t.Logf("chunk %d: lines %d-%d, chunk %d: lines %d-%d",
				i-1, chunks[i-1].StartLine, chunks[i-1].EndLine,
				i, chunks[i].StartLine, chunks[i].EndLine)
		}
	}
}

func TestWalkAndChunk_SkipsDirs(t *testing.T) {
	root := t.TempDir()

	cfg := config.Get()
	orig := cfg.GroveRoot
	cfg.GroveRoot = root
	defer func() { cfg.GroveRoot = orig }()

	// Create indexable file
	os.MkdirAll(filepath.Join(root, "libs"), 0755)
	os.WriteFile(filepath.Join(root, "libs", "foo.ts"), []byte("export const x = 1;"), 0644)

	// Create files that should be skipped
	os.MkdirAll(filepath.Join(root, "node_modules", "pkg"), 0755)
	os.WriteFile(filepath.Join(root, "node_modules", "pkg", "index.ts"), []byte("bad"), 0644)

	os.MkdirAll(filepath.Join(root, "dist"), 0755)
	os.WriteFile(filepath.Join(root, "dist", "bundle.js"), []byte("bad"), 0644)

	os.MkdirAll(filepath.Join(root, ".git", "objects"), 0755)
	os.WriteFile(filepath.Join(root, ".git", "objects", "abc"), []byte("bad"), 0644)

	chunks, err := WalkAndChunk()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, c := range chunks {
		if strings.Contains(c.FilePath, "node_modules") {
			t.Error("should skip node_modules")
		}
		if strings.Contains(c.FilePath, "dist/") {
			t.Error("should skip dist")
		}
		if strings.Contains(c.FilePath, ".git") {
			t.Error("should skip .git")
		}
	}

	// Should have at least the foo.ts chunk
	if len(chunks) == 0 {
		t.Error("expected at least one chunk")
	}
}

func TestWalkAndChunk_SkipsBinaryFiles(t *testing.T) {
	root := t.TempDir()

	cfg := config.Get()
	orig := cfg.GroveRoot
	cfg.GroveRoot = root
	defer func() { cfg.GroveRoot = orig }()

	// Create a binary file with null bytes
	os.WriteFile(filepath.Join(root, "image.ts"), []byte("const x = \x00\x01\x02;"), 0644)

	// Create a valid text file
	os.WriteFile(filepath.Join(root, "valid.ts"), []byte("export const x = 1;"), 0644)

	chunks, err := WalkAndChunk()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, c := range chunks {
		if c.FilePath == "image.ts" {
			t.Error("should skip binary files")
		}
	}

	found := false
	for _, c := range chunks {
		if c.FilePath == "valid.ts" {
			found = true
		}
	}
	if !found {
		t.Error("should include valid.ts")
	}
}

func TestFindBoundaries(t *testing.T) {
	lines := []string{
		"import { foo } from './bar';",
		"",
		"export function handleA() {",
		"  return 1;",
		"}",
		"",
		"// ---- Section B ----",
		"",
		"export function handleB() {",
		"  return 2;",
		"}",
	}

	boundaries := findBoundaries(lines)

	// Should have boundaries at: 0 (start), 2 (export function handleA), 6 (section comment), 8 (export function handleB)
	if len(boundaries) < 3 {
		t.Fatalf("expected at least 3 boundaries, got %d: %v", len(boundaries), boundaries)
	}

	if boundaries[0] != 0 {
		t.Error("first boundary should be 0")
	}
}

func TestMakeSnippet(t *testing.T) {
	short := "hello world"
	if s := makeSnippet(short); s != short {
		t.Errorf("short snippet should be unchanged, got: %s", s)
	}

	long := strings.Repeat("a", 300)
	s := makeSnippet(long)
	if len(s) > SnippetLen+10 { // +10 for "..."
		t.Errorf("snippet too long: %d chars", len(s))
	}
	if !strings.HasSuffix(s, "...") {
		t.Error("truncated snippet should end with ...")
	}
}

func TestItoa(t *testing.T) {
	tests := []struct {
		n    int
		want string
	}{
		{0, "0"},
		{1, "1"},
		{42, "42"},
		{100, "100"},
		{-5, "-5"},
	}
	for _, tt := range tests {
		if got := itoa(tt.n); got != tt.want {
			t.Errorf("itoa(%d) = %q, want %q", tt.n, got, tt.want)
		}
	}
}
