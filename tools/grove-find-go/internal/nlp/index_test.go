package nlp

import (
	"bytes"
	"math"
	"testing"
)

func TestCosineSimilarity_Identical(t *testing.T) {
	a := []float32{1.0, 0.0, 0.0}
	score := cosineSimilarity(a, a)
	if math.Abs(float64(score)-1.0) > 0.001 {
		t.Errorf("identical vectors should have similarity ~1.0, got %f", score)
	}
}

func TestCosineSimilarity_Orthogonal(t *testing.T) {
	a := []float32{1.0, 0.0, 0.0}
	b := []float32{0.0, 1.0, 0.0}
	score := cosineSimilarity(a, b)
	if math.Abs(float64(score)) > 0.001 {
		t.Errorf("orthogonal vectors should have similarity ~0.0, got %f", score)
	}
}

func TestCosineSimilarity_Opposite(t *testing.T) {
	a := []float32{1.0, 0.0, 0.0}
	b := []float32{-1.0, 0.0, 0.0}
	score := cosineSimilarity(a, b)
	if math.Abs(float64(score)+1.0) > 0.001 {
		t.Errorf("opposite vectors should have similarity ~-1.0, got %f", score)
	}
}

func TestCosineSimilarity_Empty(t *testing.T) {
	score := cosineSimilarity(nil, nil)
	if score != 0 {
		t.Errorf("empty vectors should return 0, got %f", score)
	}
}

func TestCosineSimilarity_DifferentLength(t *testing.T) {
	a := []float32{1.0, 0.0}
	b := []float32{1.0, 0.0, 0.0}
	score := cosineSimilarity(a, b)
	if score != 0 {
		t.Errorf("different length vectors should return 0, got %f", score)
	}
}

func TestQueryIndex_TopN(t *testing.T) {
	idx := &Index{
		Dimensions: 3,
		EmbedModel: "test-model",
		Entries: []IndexEntry{
			{FilePath: "a.ts", StartLine: 1, EndLine: 10, Snippet: "file a", Vector: []float32{1.0, 0.0, 0.0}},
			{FilePath: "b.ts", StartLine: 1, EndLine: 20, Snippet: "file b", Vector: []float32{0.9, 0.1, 0.0}},
			{FilePath: "c.ts", StartLine: 1, EndLine: 5, Snippet: "file c", Vector: []float32{0.0, 1.0, 0.0}},
			{FilePath: "d.ts", StartLine: 1, EndLine: 15, Snippet: "file d", Vector: []float32{0.8, 0.2, 0.0}},
		},
	}

	query := []float32{1.0, 0.0, 0.0}
	results := QueryIndex(idx, query, 2)

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}

	// a.ts should be most similar (exact match)
	if results[0].FilePath != "a.ts" {
		t.Errorf("expected a.ts first, got %s", results[0].FilePath)
	}

	// Scores should be descending
	if results[0].Score < results[1].Score {
		t.Error("results should be sorted by descending score")
	}
}

func TestQueryIndex_EmptyIndex(t *testing.T) {
	results := QueryIndex(nil, []float32{1.0}, 10)
	if results != nil {
		t.Error("nil index should return nil")
	}

	idx := &Index{Entries: nil}
	results = QueryIndex(idx, []float32{1.0}, 10)
	if results != nil {
		t.Error("empty index should return nil")
	}
}

func TestQueryIndex_TopNExceedsEntries(t *testing.T) {
	idx := &Index{
		Dimensions: 2,
		Entries: []IndexEntry{
			{FilePath: "a.ts", Vector: []float32{1.0, 0.0}},
			{FilePath: "b.ts", Vector: []float32{0.0, 1.0}},
		},
	}

	results := QueryIndex(idx, []float32{1.0, 0.0}, 100)
	if len(results) != 2 {
		t.Errorf("expected 2 results (capped to entries), got %d", len(results))
	}
}

func TestWriteReadIndex_RoundTrip(t *testing.T) {
	original := &Index{
		Dimensions: 3,
		EmbedModel: "test-embed-model",
		Entries: []IndexEntry{
			{
				FilePath:  "libs/engine/src/lib/foo.ts",
				StartLine: 1,
				EndLine:   42,
				Snippet:   "export function foo() { ... }",
				Mtime:     1710000000,
				Vector:    []float32{0.1, 0.2, 0.3},
			},
			{
				FilePath:  "apps/login/src/routes/+page.svelte",
				StartLine: 10,
				EndLine:   25,
				Snippet:   "<script>let user = $state(null)</script>",
				Mtime:     1710001000,
				Vector:    []float32{0.4, 0.5, 0.6},
			},
		},
	}

	// Write to buffer
	var buf bytes.Buffer
	if err := writeIndex(&buf, original); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	// Read back
	loaded, err := readIndex(&buf)
	if err != nil {
		t.Fatalf("read failed: %v", err)
	}

	// Compare
	if loaded.Dimensions != original.Dimensions {
		t.Errorf("dimensions: got %d, want %d", loaded.Dimensions, original.Dimensions)
	}
	if loaded.EmbedModel != original.EmbedModel {
		t.Errorf("embed model: got %q, want %q", loaded.EmbedModel, original.EmbedModel)
	}
	if len(loaded.Entries) != len(original.Entries) {
		t.Fatalf("entry count: got %d, want %d", len(loaded.Entries), len(original.Entries))
	}

	for i, orig := range original.Entries {
		got := loaded.Entries[i]
		if got.FilePath != orig.FilePath {
			t.Errorf("entry %d filepath: got %q, want %q", i, got.FilePath, orig.FilePath)
		}
		if got.StartLine != orig.StartLine {
			t.Errorf("entry %d start line: got %d, want %d", i, got.StartLine, orig.StartLine)
		}
		if got.EndLine != orig.EndLine {
			t.Errorf("entry %d end line: got %d, want %d", i, got.EndLine, orig.EndLine)
		}
		if got.Snippet != orig.Snippet {
			t.Errorf("entry %d snippet: got %q, want %q", i, got.Snippet, orig.Snippet)
		}
		if got.Mtime != orig.Mtime {
			t.Errorf("entry %d mtime: got %d, want %d", i, got.Mtime, orig.Mtime)
		}
		if len(got.Vector) != len(orig.Vector) {
			t.Errorf("entry %d vector len: got %d, want %d", i, len(got.Vector), len(orig.Vector))
			continue
		}
		for j := range orig.Vector {
			if math.Abs(float64(got.Vector[j]-orig.Vector[j])) > 0.0001 {
				t.Errorf("entry %d vector[%d]: got %f, want %f", i, j, got.Vector[j], orig.Vector[j])
			}
		}
	}
}

func TestWriteReadIndex_BadMagic(t *testing.T) {
	buf := bytes.NewBuffer([]byte("BADMG"))
	_, err := readIndex(buf)
	if err == nil {
		t.Error("expected error for bad magic")
	}
}

func TestWriteReadIndex_BadVersion(t *testing.T) {
	var buf bytes.Buffer
	buf.Write([]byte(IndexMagic))
	buf.WriteByte(99) // bad version
	_, err := readIndex(&buf)
	if err == nil {
		t.Error("expected error for bad version")
	}
}

func TestWriteString_ReadString_RoundTrip(t *testing.T) {
	tests := []string{
		"",
		"hello",
		"libs/engine/src/lib/foo/bar.ts",
		"unicode: こんにちは",
	}

	for _, s := range tests {
		var buf bytes.Buffer
		if err := writeString(&buf, s); err != nil {
			t.Fatalf("write %q: %v", s, err)
		}
		got, err := readString(&buf)
		if err != nil {
			t.Fatalf("read %q: %v", s, err)
		}
		if got != s {
			t.Errorf("round trip: got %q, want %q", got, s)
		}
	}
}
