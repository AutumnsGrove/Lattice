package nlp

import (
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
)

// Index format constants.
const (
	IndexMagic   = "GFIDX"
	IndexVersion = uint8(1)
)

// IndexEntry stores one chunk's metadata and vector in the index.
type IndexEntry struct {
	FilePath  string
	StartLine int
	EndLine   int
	Snippet   string
	Mtime     int64 // unix timestamp of the source file
	Vector    []float32
}

// Index holds the full vector index in memory.
type Index struct {
	Dimensions int
	EmbedModel string
	Entries    []IndexEntry
}

// SearchResult holds one result from a vector query.
type SearchResult struct {
	FilePath  string  `json:"file_path"`
	StartLine int     `json:"start_line"`
	EndLine   int     `json:"end_line"`
	Snippet   string  `json:"snippet"`
	Score     float32 `json:"score"`
}

// IndexPath returns the path to the index file.
func IndexPath() string {
	cfg := config.Get()
	return filepath.Join(cfg.GroveRoot, ".grove", "gf-index.bin")
}

// BuildIndex walks the codebase, chunks files, embeds them, and writes the index.
// The onProgress callback receives (chunksEmbedded, totalChunks) for UI updates.
func BuildIndex(ctx context.Context, client *Client, onProgress func(done, total int)) (*Index, error) {
	chunks, err := WalkAndChunk()
	if err != nil {
		return nil, fmt.Errorf("walk codebase: %w", err)
	}

	if len(chunks) == 0 {
		return nil, fmt.Errorf("no indexable files found")
	}

	// Collect file mtimes for incremental re-indexing
	cfg := config.Get()
	mtimes := make(map[string]int64)
	for _, c := range chunks {
		if _, exists := mtimes[c.FilePath]; !exists {
			absPath := filepath.Join(cfg.GroveRoot, filepath.FromSlash(c.FilePath))
			if info, err := os.Stat(absPath); err == nil {
				mtimes[c.FilePath] = info.ModTime().Unix()
			}
		}
	}

	// Embed in batches
	texts := make([]string, len(chunks))
	for i, c := range chunks {
		texts[i] = c.Content
	}

	vectors, err := client.Embed(ctx, texts, onProgress)
	if err != nil {
		return nil, fmt.Errorf("embed chunks: %w", err)
	}

	if len(vectors) == 0 {
		return nil, fmt.Errorf("embedding returned no vectors")
	}

	dims := len(vectors[0])

	// Build entries
	entries := make([]IndexEntry, len(chunks))
	for i, c := range chunks {
		entries[i] = IndexEntry{
			FilePath:  c.FilePath,
			StartLine: c.StartLine,
			EndLine:   c.EndLine,
			Snippet:   c.Snippet,
			Mtime:     mtimes[c.FilePath],
			Vector:    vectors[i],
		}
	}

	idx := &Index{
		Dimensions: dims,
		EmbedModel: client.embedModel,
		Entries:    entries,
	}

	return idx, nil
}

// RebuildIndex incrementally updates the index, only re-embedding chunks whose
// source files have changed (based on mtime). Unchanged chunks carry forward
// their existing vectors. This turns a 2-hour full rebuild into a seconds-long update.
func RebuildIndex(ctx context.Context, client *Client, existing *Index, onStatus func(string), onProgress func(done, total int)) (*Index, error) {
	chunks, err := WalkAndChunk()
	if err != nil {
		return nil, fmt.Errorf("walk codebase: %w", err)
	}

	if len(chunks) == 0 {
		return nil, fmt.Errorf("no indexable files found")
	}

	// Collect current file mtimes
	cfg := config.Get()
	mtimes := make(map[string]int64)
	for _, c := range chunks {
		if _, exists := mtimes[c.FilePath]; !exists {
			absPath := filepath.Join(cfg.GroveRoot, filepath.FromSlash(c.FilePath))
			if info, err := os.Stat(absPath); err == nil {
				mtimes[c.FilePath] = info.ModTime().Unix()
			}
		}
	}

	// Build lookup from existing index: key is "filepath:startLine-endLine"
	type cachedEntry struct {
		mtime  int64
		vector []float32
	}
	cache := make(map[string]cachedEntry)
	if existing != nil {
		for _, e := range existing.Entries {
			key := fmt.Sprintf("%s:%d-%d", e.FilePath, e.StartLine, e.EndLine)
			cache[key] = cachedEntry{mtime: e.Mtime, vector: e.Vector}
		}
	}

	// Figure out which files existed in the old index
	oldFiles := make(map[string]bool)
	if existing != nil {
		for _, e := range existing.Entries {
			oldFiles[e.FilePath] = true
		}
	}

	// Figure out which files exist now
	newFiles := make(map[string]bool)
	for _, c := range chunks {
		newFiles[c.FilePath] = true
	}

	// Count deleted files (in old index but not on disk anymore)
	deletedFiles := 0
	for f := range oldFiles {
		if !newFiles[f] {
			deletedFiles++
		}
	}

	// Count added files (on disk but not in old index)
	addedFiles := make(map[string]bool)
	for f := range newFiles {
		if !oldFiles[f] {
			addedFiles[f] = true
		}
	}

	// Partition chunks into reusable vs needs-embedding
	var needEmbed []int // indices into chunks that need fresh vectors
	vectors := make([][]float32, len(chunks))
	reused := 0
	changedFiles := make(map[string]bool)

	for i, c := range chunks {
		key := fmt.Sprintf("%s:%d-%d", c.FilePath, c.StartLine, c.EndLine)
		if cached, ok := cache[key]; ok && cached.mtime == mtimes[c.FilePath] {
			vectors[i] = cached.vector
			reused++
		} else {
			needEmbed = append(needEmbed, i)
			if !addedFiles[c.FilePath] {
				changedFiles[c.FilePath] = true
			}
		}
	}

	if onStatus != nil {
		onStatus(fmt.Sprintf("%d files unchanged, %d changed, %d added, %d deleted",
			len(newFiles)-len(changedFiles)-len(addedFiles), len(changedFiles), len(addedFiles), deletedFiles))
		onStatus(fmt.Sprintf("Reusing %d cached vectors, embedding %d new/changed chunks", reused, len(needEmbed)))
		if len(needEmbed) == 0 {
			onStatus("Index is already up to date!")
		}
	}

	// Nothing to embed — return the refreshed index (with deletions applied)
	if len(needEmbed) == 0 {
		entries := make([]IndexEntry, len(chunks))
		for i, c := range chunks {
			entries[i] = IndexEntry{
				FilePath:  c.FilePath,
				StartLine: c.StartLine,
				EndLine:   c.EndLine,
				Snippet:   c.Snippet,
				Mtime:     mtimes[c.FilePath],
				Vector:    vectors[i],
			}
		}
		return &Index{
			Dimensions: existing.Dimensions,
			EmbedModel: existing.EmbedModel,
			Entries:    entries,
		}, nil
	}

	// Embed only the changed chunks
	if len(needEmbed) > 0 {
		texts := make([]string, len(needEmbed))
		for i, idx := range needEmbed {
			texts[i] = chunks[idx].Content
		}

		newVectors, err := client.Embed(ctx, texts, onProgress)
		if err != nil {
			return nil, fmt.Errorf("embed chunks: %w", err)
		}

		for i, idx := range needEmbed {
			vectors[idx] = newVectors[i]
		}
	}

	// Determine dimensions from first non-nil vector
	dims := 0
	for _, v := range vectors {
		if len(v) > 0 {
			dims = len(v)
			break
		}
	}
	if dims == 0 {
		return nil, fmt.Errorf("no vectors produced")
	}

	// Build final entries
	entries := make([]IndexEntry, len(chunks))
	for i, c := range chunks {
		entries[i] = IndexEntry{
			FilePath:  c.FilePath,
			StartLine: c.StartLine,
			EndLine:   c.EndLine,
			Snippet:   c.Snippet,
			Mtime:     mtimes[c.FilePath],
			Vector:    vectors[i],
		}
	}

	return &Index{
		Dimensions: dims,
		EmbedModel: client.embedModel,
		Entries:    entries,
	}, nil
}

// RemoveFile drops all entries for the given file path from the index.
func (idx *Index) RemoveFile(filePath string) int {
	var kept []IndexEntry
	removed := 0
	for _, e := range idx.Entries {
		if e.FilePath == filePath {
			removed++
		} else {
			kept = append(kept, e)
		}
	}
	idx.Entries = kept
	return removed
}

// UpdateFile re-chunks a single file and replaces its entries in the index.
// It embeds the new chunks via the provided client and saves the result.
// Returns the number of new chunks added.
func (idx *Index) UpdateFile(ctx context.Context, client *Client, filePath string) (int, error) {
	cfg := config.Get()
	absPath := filepath.Join(cfg.GroveRoot, filepath.FromSlash(filePath))

	// Remove old entries for this file
	idx.RemoveFile(filePath)

	// Read and chunk the file
	data, err := os.ReadFile(absPath)
	if err != nil {
		// File was deleted — removal is the update
		return 0, nil
	}

	content := string(data)
	chunks := chunkFile(filePath, content)
	if len(chunks) == 0 {
		return 0, nil
	}

	// Get file mtime
	var mtime int64
	if info, err := os.Stat(absPath); err == nil {
		mtime = info.ModTime().Unix()
	}

	// Embed the new chunks
	texts := make([]string, len(chunks))
	for i, c := range chunks {
		texts[i] = c.Content
	}

	vectors, err := client.Embed(ctx, texts, nil)
	if err != nil {
		return 0, fmt.Errorf("embed file chunks: %w", err)
	}

	// Append new entries
	for i, c := range chunks {
		idx.Entries = append(idx.Entries, IndexEntry{
			FilePath:  c.FilePath,
			StartLine: c.StartLine,
			EndLine:   c.EndLine,
			Snippet:   c.Snippet,
			Mtime:     mtime,
			Vector:    vectors[i],
		})
	}

	return len(chunks), nil
}

// SaveIndex writes the index to disk in binary format.
func SaveIndex(idx *Index) error {
	path := IndexPath()

	// Ensure .grove directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create index dir: %w", err)
	}

	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create index file: %w", err)
	}
	defer f.Close()

	return writeIndex(f, idx)
}

// LoadIndex reads the index from disk.
func LoadIndex() (*Index, error) {
	path := IndexPath()

	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // no index exists
		}
		return nil, fmt.Errorf("open index: %w", err)
	}
	defer f.Close()

	return readIndex(f)
}

// QueryFilter constrains which index entries are searched.
// All fields are optional — zero values mean "no filter".
type QueryFilter struct {
	PathPrefix string // only entries whose FilePath starts with this
	FileType   string // extension without dot, e.g. "ts", "svelte", "go"
}

// Matches returns true if the entry passes the filter.
func (f *QueryFilter) Matches(entry *IndexEntry) bool {
	if f == nil {
		return true
	}
	if f.PathPrefix != "" && !strings.HasPrefix(entry.FilePath, f.PathPrefix) {
		return false
	}
	if f.FileType != "" {
		ext := filepath.Ext(entry.FilePath)
		if ext == "" || strings.ToLower(ext[1:]) != strings.ToLower(f.FileType) {
			return false
		}
	}
	return true
}

// QueryIndex finds the top N chunks most similar to the query vector.
// An optional filter restricts which entries are considered.
func QueryIndex(idx *Index, queryVec []float32, topN int, filter *QueryFilter) []SearchResult {
	if idx == nil || len(idx.Entries) == 0 || len(queryVec) == 0 {
		return nil
	}

	type scored struct {
		idx   int
		score float32
	}

	var scores []scored
	for i, entry := range idx.Entries {
		if !filter.Matches(&entry) {
			continue
		}
		scores = append(scores, scored{
			idx:   i,
			score: cosineSimilarity(queryVec, entry.Vector),
		})
	}

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	if topN > len(scores) {
		topN = len(scores)
	}

	results := make([]SearchResult, topN)
	for i := 0; i < topN; i++ {
		entry := idx.Entries[scores[i].idx]
		results[i] = SearchResult{
			FilePath:  entry.FilePath,
			StartLine: entry.StartLine,
			EndLine:   entry.EndLine,
			Snippet:   entry.Snippet,
			Score:     scores[i].score,
		}
	}

	return results
}

// cosineSimilarity computes the cosine similarity between two vectors.
func cosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}

	var dot, normA, normB float64
	for i := range a {
		ai, bi := float64(a[i]), float64(b[i])
		dot += ai * bi
		normA += ai * ai
		normB += bi * bi
	}

	denom := math.Sqrt(normA) * math.Sqrt(normB)
	if denom == 0 {
		return 0
	}

	return float32(dot / denom)
}

// ---------- Binary serialization ----------

func writeIndex(w io.Writer, idx *Index) error {
	// Magic
	if _, err := w.Write([]byte(IndexMagic)); err != nil {
		return err
	}

	// Version
	if err := binary.Write(w, binary.LittleEndian, IndexVersion); err != nil {
		return err
	}

	// Dimensions
	if err := binary.Write(w, binary.LittleEndian, uint16(idx.Dimensions)); err != nil {
		return err
	}

	// Chunk count
	if err := binary.Write(w, binary.LittleEndian, uint32(len(idx.Entries))); err != nil {
		return err
	}

	// Embedding model name
	if err := writeString(w, idx.EmbedModel); err != nil {
		return err
	}

	// Entries
	for _, e := range idx.Entries {
		if err := writeEntry(w, e); err != nil {
			return err
		}
	}

	return nil
}

func readIndex(r io.Reader) (*Index, error) {
	// Magic
	magic := make([]byte, len(IndexMagic))
	if _, err := io.ReadFull(r, magic); err != nil {
		return nil, fmt.Errorf("read magic: %w", err)
	}
	if string(magic) != IndexMagic {
		return nil, fmt.Errorf("invalid index file (bad magic)")
	}

	// Version
	var version uint8
	if err := binary.Read(r, binary.LittleEndian, &version); err != nil {
		return nil, fmt.Errorf("read version: %w", err)
	}
	if version != IndexVersion {
		return nil, fmt.Errorf("unsupported index version %d (expected %d)", version, IndexVersion)
	}

	// Dimensions
	var dims uint16
	if err := binary.Read(r, binary.LittleEndian, &dims); err != nil {
		return nil, fmt.Errorf("read dimensions: %w", err)
	}

	// Chunk count
	var count uint32
	if err := binary.Read(r, binary.LittleEndian, &count); err != nil {
		return nil, fmt.Errorf("read chunk count: %w", err)
	}

	// Embedding model
	embedModel, err := readString(r)
	if err != nil {
		return nil, fmt.Errorf("read embed model: %w", err)
	}

	// Entries
	entries := make([]IndexEntry, count)
	for i := uint32(0); i < count; i++ {
		entry, err := readEntry(r, int(dims))
		if err != nil {
			return nil, fmt.Errorf("read entry %d: %w", i, err)
		}
		entries[i] = entry
	}

	return &Index{
		Dimensions: int(dims),
		EmbedModel: embedModel,
		Entries:    entries,
	}, nil
}

func writeEntry(w io.Writer, e IndexEntry) error {
	if err := writeString(w, e.FilePath); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, uint32(e.StartLine)); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, uint32(e.EndLine)); err != nil {
		return err
	}
	if err := writeString(w, e.Snippet); err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, e.Mtime); err != nil {
		return err
	}
	// Vector as raw float32 array
	for _, v := range e.Vector {
		if err := binary.Write(w, binary.LittleEndian, v); err != nil {
			return err
		}
	}
	return nil
}

func readEntry(r io.Reader, dims int) (IndexEntry, error) {
	var e IndexEntry
	var err error

	e.FilePath, err = readString(r)
	if err != nil {
		return e, err
	}

	var startLine, endLine uint32
	if err := binary.Read(r, binary.LittleEndian, &startLine); err != nil {
		return e, err
	}
	if err := binary.Read(r, binary.LittleEndian, &endLine); err != nil {
		return e, err
	}
	e.StartLine = int(startLine)
	e.EndLine = int(endLine)

	e.Snippet, err = readString(r)
	if err != nil {
		return e, err
	}

	if err := binary.Read(r, binary.LittleEndian, &e.Mtime); err != nil {
		return e, err
	}

	e.Vector = make([]float32, dims)
	for i := 0; i < dims; i++ {
		if err := binary.Read(r, binary.LittleEndian, &e.Vector[i]); err != nil {
			return e, err
		}
	}

	return e, nil
}

// writeString writes a length-prefixed string (uint16 length + bytes).
func writeString(w io.Writer, s string) error {
	b := []byte(s)
	if err := binary.Write(w, binary.LittleEndian, uint16(len(b))); err != nil {
		return err
	}
	_, err := w.Write(b)
	return err
}

// readString reads a length-prefixed string.
func readString(r io.Reader) (string, error) {
	var length uint16
	if err := binary.Read(r, binary.LittleEndian, &length); err != nil {
		return "", err
	}
	b := make([]byte, length)
	if _, err := io.ReadFull(r, b); err != nil {
		return "", err
	}
	return string(b), nil
}
