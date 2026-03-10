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

// QueryIndex finds the top N chunks most similar to the query vector.
func QueryIndex(idx *Index, queryVec []float32, topN int) []SearchResult {
	if idx == nil || len(idx.Entries) == 0 || len(queryVec) == 0 {
		return nil
	}

	type scored struct {
		idx   int
		score float32
	}

	scores := make([]scored, len(idx.Entries))
	for i, entry := range idx.Entries {
		scores[i] = scored{
			idx:   i,
			score: cosineSimilarity(queryVec, entry.Vector),
		}
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
