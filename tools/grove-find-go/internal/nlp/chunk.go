package nlp

import (
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

// Chunking thresholds.
const (
	WholeFileMax   = 6000  // files under this size are embedded whole
	BoundaryMax    = 20000 // files under this size are split on natural boundaries
	WindowSize     = 4000  // sliding window size for very large files
	WindowOverlap  = 500   // overlap between windows
	MaxFileSize    = 50000 // files over this are skipped entirely
	SnippetLen     = 200   // chars of snippet stored in the index for display
)

// Chunk represents a piece of a file ready for embedding.
type Chunk struct {
	FilePath  string // relative to project root
	StartLine int    // 1-based
	EndLine   int    // 1-based, inclusive
	Content   string // the text to embed (prefixed with filepath)
	Snippet   string // first SnippetLen chars of raw content for display
}

// IndexMode controls which file types get chunked.
type IndexMode int

const (
	IndexAll  IndexMode = iota // code + docs (legacy default)
	IndexCode                  // code files only
	IndexDocs                  // documentation only (.md)
)

// codeExtensions are the file types indexed for the code index.
var codeExtensions = map[string]bool{
	".ts": true, ".svelte": true, ".js": true, ".go": true,
	".json": true, ".yaml": true, ".yml": true,
	".css": true, ".html": true, ".py": true, ".rs": true,
}

// docsExtensions are the file types indexed for the docs index.
var docsExtensions = map[string]bool{
	".md": true,
}

// indexedExtensions lists all file extensions we index (union of code + docs).
var indexedExtensions = map[string]bool{
	".ts": true, ".svelte": true, ".js": true, ".go": true,
	".md": true, ".json": true, ".yaml": true, ".yml": true,
	".css": true, ".html": true, ".py": true, ".rs": true,
}

// chunkSkipDirs lists directories to skip during file walking for indexing.
// This is a superset of the codemap skipDirs — indexing skips more dirs.
var chunkSkipDirs = map[string]bool{
	"node_modules": true, "dist": true, "build": true, ".git": true,
	"_archived": true, ".wrangler": true, ".venv": true,
	".worktrees": true, ".svelte-kit": true, ".grove": true,
	".turbo": true, ".next": true, "__pycache__": true,
}

// skipFiles lists specific filenames to skip.
var skipFiles = map[string]bool{
	"worker-configuration.d.ts": true,
	"pnpm-lock.yaml":           true,
	"package-lock.json":         true,
}

// maxSizeByExt caps file size for extensions that tend to be config/generated.
// Files over these limits are skipped (they're config, not searchable code).
var maxSizeByExt = map[string]int{
	".json": 10000, // package.json, tsconfig.json — skip large generated ones
	".yaml": 10000, // CI configs, k8s manifests
	".yml":  10000,
}

// WalkAndChunk walks the codebase and returns chunks for all indexable files.
// Deprecated: use WalkAndChunkMode instead.
func WalkAndChunk() ([]Chunk, error) {
	return WalkAndChunkMode(IndexAll)
}

// WalkAndChunkMode walks the codebase and returns chunks filtered by mode.
func WalkAndChunkMode(mode IndexMode) ([]Chunk, error) {
	cfg := config.Get()
	root := cfg.GroveRoot

	var chunks []Chunk

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil // skip unreadable entries
		}

		name := d.Name()

		// Skip hidden and excluded directories
		if d.IsDir() {
			if strings.HasPrefix(name, ".") && name != "." {
				if chunkSkipDirs[name] {
					return filepath.SkipDir
				}
			}
			if chunkSkipDirs[name] {
				return filepath.SkipDir
			}
			return nil
		}

		// Skip non-indexed extensions based on mode
		ext := strings.ToLower(filepath.Ext(name))
		switch mode {
		case IndexCode:
			if !codeExtensions[ext] {
				return nil
			}
		case IndexDocs:
			if !docsExtensions[ext] {
				return nil
			}
		default:
			if !indexedExtensions[ext] {
				return nil
			}
		}

		// Skip specific filenames
		if skipFiles[name] {
			return nil
		}

		// Read file
		data, err := os.ReadFile(path)
		if err != nil {
			return nil // skip unreadable files
		}

		// Skip binary files (check for null bytes in first 512 bytes)
		checkLen := len(data)
		if checkLen > 512 {
			checkLen = 512
		}
		for _, b := range data[:checkLen] {
			if b == 0 {
				return nil
			}
		}

		content := string(data)
		if !utf8.ValidString(content) {
			return nil
		}

		// Skip files over max size
		if len(content) > MaxFileSize {
			return nil
		}

		// Skip config-heavy extensions over their per-type limit
		if maxSize, ok := maxSizeByExt[ext]; ok && len(content) > maxSize {
			return nil
		}

		relPath, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		// Normalize to forward slashes for consistency
		relPath = filepath.ToSlash(relPath)

		fileChunks := chunkFile(relPath, content)
		chunks = append(chunks, fileChunks...)

		return nil
	})

	return chunks, err
}

// chunkFile splits a single file into chunks based on its size.
func chunkFile(relPath, content string) []Chunk {
	lines := strings.Split(content, "\n")
	charLen := len(content)

	if charLen <= WholeFileMax {
		return []Chunk{wholeFileChunk(relPath, content, len(lines))}
	}

	if charLen <= BoundaryMax {
		return boundaryChunks(relPath, content, lines)
	}

	return windowChunks(relPath, content, lines)
}

// wholeFileChunk creates a single chunk for the entire file.
func wholeFileChunk(relPath, content string, lineCount int) Chunk {
	embedText := relPath + "\n" + content
	return Chunk{
		FilePath:  relPath,
		StartLine: 1,
		EndLine:   lineCount,
		Content:   embedText,
		Snippet:   makeSnippet(content),
	}
}

// boundaryChunks splits a file on natural code boundaries.
func boundaryChunks(relPath, content string, lines []string) []Chunk {
	boundaries := findBoundaries(lines)

	// If we can't find good boundaries, fall back to windows
	if len(boundaries) < 2 {
		return windowChunks(relPath, content, lines)
	}

	var chunks []Chunk
	for i := 0; i < len(boundaries)-1; i++ {
		startLine := boundaries[i]     // 0-based index
		endLine := boundaries[i+1] - 1 // exclusive → inclusive

		if endLine < startLine {
			continue
		}

		chunkLines := lines[startLine : endLine+1]
		chunkContent := strings.Join(chunkLines, "\n")

		if strings.TrimSpace(chunkContent) == "" {
			continue
		}

		embedText := relPath + ":" + itoa(startLine+1) + "-" + itoa(endLine+1) + "\n" + chunkContent
		chunks = append(chunks, Chunk{
			FilePath:  relPath,
			StartLine: startLine + 1,
			EndLine:   endLine + 1,
			Content:   embedText,
			Snippet:   makeSnippet(chunkContent),
		})
	}

	// Handle the last section (from last boundary to end)
	lastStart := boundaries[len(boundaries)-1]
	if lastStart < len(lines) {
		chunkLines := lines[lastStart:]
		chunkContent := strings.Join(chunkLines, "\n")
		if strings.TrimSpace(chunkContent) != "" {
			embedText := relPath + ":" + itoa(lastStart+1) + "-" + itoa(len(lines)) + "\n" + chunkContent
			chunks = append(chunks, Chunk{
				FilePath:  relPath,
				StartLine: lastStart + 1,
				EndLine:   len(lines),
				Content:   embedText,
				Snippet:   makeSnippet(chunkContent),
			})
		}
	}

	if len(chunks) == 0 {
		return []Chunk{wholeFileChunk(relPath, content, len(lines))}
	}

	return chunks
}

// findBoundaries returns 0-based line indices where natural code boundaries exist.
// It looks for function/class declarations, export blocks, and section comments.
func findBoundaries(lines []string) []int {
	var boundaries []int
	boundaries = append(boundaries, 0) // always start at beginning

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip the first line (already added as boundary)
		if i == 0 {
			continue
		}

		// Function/method declarations
		if isFunctionBoundary(trimmed) {
			boundaries = append(boundaries, i)
			continue
		}

		// Section comments (separators)
		if isSectionComment(trimmed) {
			boundaries = append(boundaries, i)
			continue
		}

		// Export blocks
		if strings.HasPrefix(trimmed, "export default") ||
			strings.HasPrefix(trimmed, "export class") ||
			strings.HasPrefix(trimmed, "export interface") ||
			strings.HasPrefix(trimmed, "export type") ||
			strings.HasPrefix(trimmed, "export enum") ||
			strings.HasPrefix(trimmed, "export async function") ||
			strings.HasPrefix(trimmed, "export function") {
			boundaries = append(boundaries, i)
			continue
		}

		// Go type/func declarations at package level
		if strings.HasPrefix(line, "type ") || strings.HasPrefix(line, "func ") {
			boundaries = append(boundaries, i)
			continue
		}
	}

	return boundaries
}

// isFunctionBoundary checks if a line looks like a function declaration.
func isFunctionBoundary(trimmed string) bool {
	// TypeScript/JavaScript
	if strings.HasPrefix(trimmed, "function ") ||
		strings.HasPrefix(trimmed, "async function ") ||
		strings.HasPrefix(trimmed, "const ") && strings.Contains(trimmed, "=>") ||
		strings.HasPrefix(trimmed, "class ") ||
		strings.HasPrefix(trimmed, "interface ") {
		return true
	}

	// Svelte script/style blocks
	if strings.HasPrefix(trimmed, "<script") || strings.HasPrefix(trimmed, "<style") {
		return true
	}

	return false
}

// isSectionComment checks for separator-style comments.
func isSectionComment(trimmed string) bool {
	// Lines like // -----, // =====, # -----
	if (strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#")) &&
		(strings.Contains(trimmed, "----") || strings.Contains(trimmed, "====")) {
		return true
	}
	return false
}

// windowChunks splits a file using a sliding window approach.
func windowChunks(relPath, content string, lines []string) []Chunk {
	var chunks []Chunk

	charPos := 0
	lineIdx := 0

	for charPos < len(content) {
		endPos := charPos + WindowSize
		if endPos > len(content) {
			endPos = len(content)
		}

		// Find the line range for this window
		startLine := lineIdx
		windowContent := content[charPos:endPos]

		// Count lines in this window
		windowLines := strings.Count(windowContent, "\n")
		endLine := startLine + windowLines

		if endLine >= len(lines) {
			endLine = len(lines) - 1
		}

		embedText := relPath + ":" + itoa(startLine+1) + "-" + itoa(endLine+1) + "\n" + windowContent
		chunks = append(chunks, Chunk{
			FilePath:  relPath,
			StartLine: startLine + 1,
			EndLine:   endLine + 1,
			Content:   embedText,
			Snippet:   makeSnippet(windowContent),
		})

		// Advance by WindowSize - WindowOverlap
		advance := WindowSize - WindowOverlap
		if charPos+advance >= len(content) {
			break
		}
		// Count lines we're advancing past
		advanceContent := content[charPos : charPos+advance]
		lineIdx += strings.Count(advanceContent, "\n")
		charPos += advance
	}

	return chunks
}

// makeSnippet returns the first SnippetLen characters of content, trimmed.
func makeSnippet(content string) string {
	s := strings.TrimSpace(content)
	if len(s) <= SnippetLen {
		return s
	}
	// Truncate at a rune boundary
	count := 0
	for i := range s {
		count++
		if count >= SnippetLen {
			return s[:i] + "..."
		}
	}
	return s
}

// itoa is a minimal int-to-string without importing strconv.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	if n < 0 {
		return "-" + itoa(-n)
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
